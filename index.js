// index.js
// Main entry point for the Instagram scraper

const config = require('./config');
const instagramApi = require('./instagram-api');
const BrowserScraper = require('./browser-scraper');
const { isValidUsername, handleError } = require('./utils');
const fs = require('fs').promises;

/**
 * Main class for Instagram scraping with Model-Context-Protocol
 */
class InstagramScraper {
  constructor() {
    this.browserScraper = null;
  }
  
  /**
   * Scrape Instagram profile data
   * @param {string} username - Instagram username to scrape
   * @param {Object} options - Scraping options
   * @returns {Promise<Object>} - Scraped profile data
   */
  async scrapeProfile(username, options = {}) {
    if (!isValidUsername(username)) {
      throw new Error('Invalid Instagram username format');
    }
    
    // Default options
    const defaultOptions = {
      method: 'auto', // 'api', 'browser', or 'auto'
      includePostDetails: false,
      maxPosts: config.instagram.maxPostsToScrape,
      outputFile: null
    };
    
    const scrapeOptions = { ...defaultOptions, ...options };
    
    try {
      let profileData;
      
      // Try API method first if selected, or if using auto
      if (scrapeOptions.method === 'api' || scrapeOptions.method === 'auto') {
        try {
          console.log(`Attempting to scrape ${username} using API method...`);
          profileData = await instagramApi.getProfileData(username);
        } catch (apiError) {
          console.warn('API method failed:', apiError.message);
          
          // If method is 'api', throw the error
          if (scrapeOptions.method === 'api') {
            throw apiError;
          }
          
          // If auto, continue to browser method
          if (scrapeOptions.method === 'auto') {
            console.log('Falling back to browser method...');
          }
        }
      }
      
      // Use browser method if API failed or if specifically requested
      if (!profileData && (scrapeOptions.method === 'browser' || scrapeOptions.method === 'auto')) {
        console.log(`Scraping ${username} using browser method...`);
        
        // Initialize browser scraper if not already done
        if (!this.browserScraper) {
          this.browserScraper = new BrowserScraper();
          await this.browserScraper.initialize();
        }
        
        profileData = await this.browserScraper.scrapeProfile(username);
      }
      
      // If we still don't have data, throw error
      if (!profileData) {
        throw new Error(`Failed to scrape profile data for ${username}`);
      }
      
      // Limit posts to maxPosts
      if (profileData.posts && profileData.posts.length > scrapeOptions.maxPosts) {
        profileData.posts = profileData.posts.slice(0, scrapeOptions.maxPosts);
      }
      
      // Fetch detailed post data if requested
      if (scrapeOptions.includePostDetails && profileData.posts && profileData.posts.length > 0) {
        profileData.posts = await this.fetchPostDetails(profileData.posts);
      }
      
      // Save to file if outputFile is specified
      if (scrapeOptions.outputFile) {
        await this.saveToFile(profileData, scrapeOptions.outputFile);
      }
      
      return {
        success: true,
        data: profileData,
        method: scrapeOptions.method === 'auto' 
          ? (profileData.source || 'combined') 
          : scrapeOptions.method,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return handleError(error, `scraping profile ${username}`);
    } finally {
      // Close browser if it was opened
      if (this.browserScraper) {
        await this.browserScraper.close();
        this.browserScraper = null;
      }
    }
  }
  
  /**
   * Fetch detailed information for each post
   * @param {Array} posts - Array of post objects with shortcodes
   * @returns {Promise<Array>} - Enhanced post objects
   */
  async fetchPostDetails(posts) {
    if (!posts || !posts.length) return [];
    
    console.log(`Fetching details for ${posts.length} posts...`);
    
    // Initialize browser scraper if needed
    if (!this.browserScraper) {
      this.browserScraper = new BrowserScraper();
      await this.browserScraper.initialize();
    }
    
    const enhancedPosts = [];
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      console.log(`Fetching details for post ${i+1}/${posts.length}: ${post.shortcode}`);
      
      try {
        // Navigate to post page
        const postUrl = `${config.instagram.baseUrl}/p/${post.shortcode}/`;
        await this.browserScraper.page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Extract detailed post data
        const postDetails = await this.browserScraper.page.evaluate(() => {
          // Helper for text extraction
          const getText = (selector) => {
            const element = document.querySelector(selector);
            return element ? element.textContent.trim() : null;
          };
          
          // Helper to parse number strings
          const parseCount = (str) => {
            if (!str) return 0;
            
            str = str.toLowerCase().replace(',', '');
            
            if (str.includes('k')) {
              return parseFloat(str.replace('k', '')) * 1000;
            } else if (str.includes('m')) {
              return parseFloat(str.replace('m', '')) * 1000000;
            }
            
            return parseInt(str, 10) || 0;
          };
          
          // Get post caption
          const captionElement = document.querySelector('div[data-testid="post-comment-root"] ul > div > li > div > div > div:nth-child(2)');
          const caption = captionElement ? captionElement.textContent.trim() : '';
          
          // Get likes count
          const likesText = getText('section span button span');
          const likesCount = likesText ? parseCount(likesText) : 0;
          
          // Get comments count
          const commentsElements = document.querySelectorAll('div[data-testid="post-comment-root"] ul > div > li');
          const commentsCount = Math.max(0, commentsElements.length - 1); // Subtract 1 for the caption
          
          // Get post date
          const timeElement = document.querySelector('time');
          const dateStr = timeElement ? timeElement.getAttribute('datetime') : null;
          const timestamp = dateStr ? new Date(dateStr).getTime() / 1000 : null;
          
          // Check if this is a video
          const isVideo = document.querySelector('div[role="button"][aria-label*="play"]') !== null;
          
          // Get post images (could be multiple in carousel)
          const images = [];
          const imageElements = document.querySelectorAll('article img[srcset]');
          
          for (const img of imageElements) {
            if (!img.srcset.includes('profile_pic')) {
              images.push({
                url: img.src,
                alt: img.alt || ''
              });
            }
          }
          
          // Get post location if available
          const locationElement = document.querySelector('a[href*="/explore/locations/"]');
          const location = locationElement ? locationElement.textContent.trim() : null;
          
          return {
            caption,
            likesCount,
            commentsCount,
            timestamp,
            isVideo,
            images,
            location
          };
        });
        
        // Merge original post data with detailed data
        const enhancedPost = {
          ...post,
          ...postDetails
        };
        
        enhancedPosts.push(enhancedPost);
        
      } catch (error) {
        console.warn(`Error fetching details for post ${post.shortcode}:`, error.message);
        enhancedPosts.push(post); // Add original post without details
      }
    }
    
    return enhancedPosts;
  }
  
  /**
   * Save scraped data to a file
   * @param {Object} data - Data to save
   * @param {string} filename - Output filename
   * @returns {Promise<void>}
   */
  async saveToFile(data, filename) {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(filename, jsonData, 'utf8');
      console.log(`Data saved to ${filename}`);
    } catch (error) {
      console.error('Error saving data to file:', error.message);
      throw error;
    }
  }
}

/**
 * Create a pre-configured scraper instance for the femalephysioco account
 * @returns {InstagramScraper} - Configured scraper instance
 */
function createFemalephysiocoScraper() {
  return new InstagramScraper();
}

/**
 * Main execution function
 */
async function main() {
  try {
    const username = 'femalephysioco';
    const outputFile = './femalephysioco_profile.json';
    
    console.log(`Starting scrape for Instagram profile: ${username}`);
    
    const scraper = createFemalephysiocoScraper();
    const result = await scraper.scrapeProfile(username, {
      method: 'auto',
      includePostDetails: true,
      outputFile
    });
    
    if (result.success) {
      console.log('Scraping completed successfully!');
      console.log(`Method used: ${result.method}`);
      console.log(`Total posts scraped: ${result.data.posts.length}`);
      console.log(`Data saved to: ${outputFile}`);
    } else {
      console.error('Scraping failed:', result.error.message);
    }
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

// Execute if this file is run directly
if (require.main === module) {
  main().catch(console.error);
}

// Export for use as a module
module.exports = {
  InstagramScraper,
  createFemalephysiocoScraper
};