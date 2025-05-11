// browser-scraper.js
// Module for browser-based scraping using Puppeteer with Bright Data proxy

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const config = require('./config');
const { sleep, createProxyAuth } = require('./utils');

// Apply stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class BrowserScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  /**
   * Initialize the browser with proper proxy settings
   */
  async initialize() {
    try {
      // Configure proxy settings for puppeteer
      const proxyUrl = `http://${createProxyAuth()}@${config.proxy.host}:${config.proxy.port}`;
      
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          `--proxy-server=${proxyUrl}`,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ],
        defaultViewport: { width: 1366, height: 768 }
      });
      
      this.page = await this.browser.newPage();
      
      // Set extra headers to mimic a real browser
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });
      
      // Set a realistic user agent
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Handle dialogs automatically
      this.page.on('dialog', async dialog => {
        await dialog.dismiss();
      });
      
      return this;
    } catch (error) {
      console.error('Error initializing browser:', error.message);
      throw error;
    }
  }

  /**
   * Scrape an Instagram profile using browser automation
   * @param {string} username - Instagram username to scrape
   * @returns {Promise<Object>} - Structured profile data
   */
  async scrapeProfile(username) {
    if (!this.browser || !this.page) {
      await this.initialize();
    }
    
    try {
      // Navigate to the profile page
      const profileUrl = `${config.instagram.baseUrl}/${username}/`;
      await this.page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Wait for essential elements to load
      await this.page.waitForSelector(config.instagram.waitForSelectors.profileHeader, { timeout: 30000 });
      
      // Check for and handle cookie consent dialogs or login prompts
      await this.handlePopups();
      
      // Extract profile information
      const profileData = await this.extractProfileInfo();
      
      // Extract posts data (preview information)
      const postsData = await this.extractPostsData();
      
      // Combine all data
      return {
        ...profileData,
        posts: postsData
      };
    } catch (error) {
      console.error('Error scraping profile:', error.message);
      throw error;
    } finally {
      await this.close();
    }
  }
  
  /**
   * Handle common Instagram popups like cookie consent or login prompts
   */
  async handlePopups() {
    try {
      // Check for cookie banner and accept if present
      const cookieSelector = 'button[tabindex="0"][type="button"]';
      const hasCookieBanner = await this.page.evaluate((sel) => {
        const buttons = Array.from(document.querySelectorAll(sel));
        return buttons.some(button => {
          const text = button.textContent.toLowerCase();
          return text.includes('accept') || text.includes('allow');
        });
      }, cookieSelector);
      
      if (hasCookieBanner) {
        await this.page.evaluate((sel) => {
          const buttons = Array.from(document.querySelectorAll(sel));
          const acceptButton = buttons.find(button => {
            const text = button.textContent.toLowerCase();
            return text.includes('accept') || text.includes('allow');
          });
          if (acceptButton) acceptButton.click();
        }, cookieSelector);
        
        await sleep(2000);
      }
      
      // Check for login prompt and close if present
      const loginPromptCloseSelector = 'button[type="button"] > svg[aria-label="Close"]';
      const hasLoginPrompt = await this.page.$(loginPromptCloseSelector) !== null;
      
      if (hasLoginPrompt) {
        await this.page.click(loginPromptCloseSelector);
        await sleep(1000);
      }
    } catch (error) {
      console.warn('Warning handling popups:', error.message);
      // Continue even if popup handling fails
    }
  }
  
  /**
   * Extract profile information from the page
   * @returns {Promise<Object>} - Profile information
   */
  async extractProfileInfo() {
    return await this.page.evaluate(() => {
      // Helper to safely extract text
      const getText = (selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent.trim() : null;
      };
      
      // Helper to parse number strings (like "1,234" or "5.6K")
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
      
      // Extract profile image URL
      const profileImgElement = document.querySelector('header img');
      const profileImgUrl = profileImgElement ? profileImgElement.src : null;
      
      // Extract username
      const username = getText('header section h2');
      
      // Extract bio information
      const bioElement = document.querySelector('header section h1 + div');
      const bio = bioElement ? bioElement.textContent.trim() : '';
      
      // Extract counts (posts, followers, following)
      const countsElements = document.querySelectorAll('header section ul li');
      let postsCount = 0, followersCount = 0, followingCount = 0;
      
      if (countsElements.length >= 3) {
        const countsText = Array.from(countsElements).map(el => el.textContent.trim());
        
        // Parse each count text
        for (const text of countsText) {
          if (text.includes('post')) {
            postsCount = parseCount(text.split(' ')[0]);
          } else if (text.includes('follower')) {
            followersCount = parseCount(text.split(' ')[0]);
          } else if (text.includes('following')) {
            followingCount = parseCount(text.split(' ')[0]);
          }
        }
      }
      
      // Extract external URL if present
      const linkElement = document.querySelector('header a[href^="https://l.instagram.com"]');
      const externalUrl = linkElement ? linkElement.textContent.trim() : null;
      
      // Extract verification status
      const isVerified = document.querySelector('header section svg[aria-label="Verified"]') !== null;
      
      return {
        username,
        profileImgUrl,
        bio,
        postsCount,
        followersCount,
        followingCount,
        externalUrl,
        isVerified
      };
    });
  }
  
  /**
   * Extract posts data from the profile page
   * @returns {Promise<Array>} - Array of post objects
   */
  async extractPostsData() {
    try {
      // Wait for posts to load
      await this.page.waitForSelector(config.instagram.waitForSelectors.posts, { timeout: 30000 });
      
      // Scroll down to load more posts if needed
      await this.scrollToLoadPosts();
      
      // Extract posts data
      return await this.page.evaluate((maxPosts) => {
        const posts = [];
        const postElements = document.querySelectorAll('article a[href*="/p/"]');
        
        for (let i = 0; i < Math.min(postElements.length, maxPosts); i++) {
          const post = postElements[i];
          const postUrl = post.href;
          const shortcode = postUrl.split('/p/')[1].replace(/\//g, '');
          
          // Get post image URL
          const imgElement = post.querySelector('img');
          const thumbnailUrl = imgElement ? imgElement.src : null;
          
          // Check if post is a video
          const isVideo = post.querySelector('span[aria-label="Video"]') !== null;
          
          // Get post caption from alt text if available
          const caption = imgElement && imgElement.alt ? imgElement.alt : '';
          
          posts.push({
            shortcode,
            postUrl,
            thumbnailUrl,
            isVideo,
            caption
          });
        }
        
        return posts;
      }, config.instagram.maxPostsToScrape);
    } catch (error) {
      console.error('Error extracting posts data:', error.message);
      return []; // Return empty array if posts extraction fails
    }
  }
  
  /**
   * Scroll down to load more posts
   */
  async scrollToLoadPosts() {
    try {
      // Calculate how many scrolls needed based on maxPostsToScrape
      const scrollsNeeded = Math.ceil(config.instagram.maxPostsToScrape / 12); // Instagram loads ~12 posts per "page"
      
      for (let i = 0; i < scrollsNeeded; i++) {
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        await sleep(config.instagram.scrollDelay);
        
        // Check if we've loaded enough posts
        const postCount = await this.page.evaluate(() => {
          return document.querySelectorAll('article a[href*="/p/"]').length;
        });
        
        if (postCount >= config.instagram.maxPostsToScrape) {
          break;
        }
      }
    } catch (error) {
      console.warn('Warning scrolling for posts:', error.message);
      // Continue even if scrolling fails
    }
  }
  
  /**
   * Close the browser instance
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

module.exports = BrowserScraper;