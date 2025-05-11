// example-usage.js
// Example script demonstrating how to use the Instagram scraper

const { InstagramScraper } = require('./index');

// Example for femalephysioco account
async function scrapeFemalephysioco() {
  try {
    console.log('Starting Instagram scraper for femalephysioco...');
    
    // Create a new scraper instance
    const scraper = new InstagramScraper();
    
    // Configure scraping options
    const options = {
      method: 'auto',              // Try API first, then fallback to browser if needed
      includePostDetails: true,    // Get detailed information for posts
      maxPosts: 10,                // Limit to 10 posts for this example
      outputFile: './femalephysioco_profile.json'  // Save results to this file
    };
    
    // Run the scraper
    const result = await scraper.scrapeProfile('femalephysioco', options);
    
    // Check if successful
    if (result.success) {
      console.log('✓ Scraping completed successfully!');
      
      // Display some basic profile info
      const profile = result.data;
      console.log(`\nProfile Information:`);
      console.log(`Username: ${profile.username}`);
      console.log(`Full Name: ${profile.fullName || 'N/A'}`);
      console.log(`Bio: ${profile.bio || 'N/A'}`);
      console.log(`Followers: ${profile.followersCount?.toLocaleString() || 'N/A'}`);
      console.log(`Following: ${profile.followingCount?.toLocaleString() || 'N/A'}`);
      console.log(`Posts: ${profile.postsCount?.toLocaleString() || 'N/A'}`);
      console.log(`External URL: ${profile.externalUrl || 'N/A'}`);
      console.log(`Verified: ${profile.isVerified ? 'Yes' : 'No'}`);
      
      // Display post summary
      console.log(`\nPosts Summary:`);
      console.log(`Total Posts Scraped: ${profile.posts?.length || 0}`);
      
      // Display information about the first post
      if (profile.posts && profile.posts.length > 0) {
        const firstPost = profile.posts[0];
        console.log(`\nFirst Post Details:`);
        console.log(`Caption: ${firstPost.caption?.substring(0, 100)}${firstPost.caption?.length > 100 ? '...' : ''}`);
        console.log(`Likes: ${firstPost.likesCount?.toLocaleString() || 'N/A'}`);
        console.log(`Comments: ${firstPost.commentsCount?.toLocaleString() || 'N/A'}`);
        console.log(`Post URL: ${firstPost.postUrl || 'N/A'}`);
        console.log(`Is Video: ${firstPost.isVideo ? 'Yes' : 'No'}`);
        console.log(`Location: ${firstPost.location || 'N/A'}`);
      }
      
      console.log(`\nFull data saved to: ${options.outputFile}`);
    } else {
      console.error('✗ Scraping failed:', result.error.message);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the example
scrapeFemalephysioco().catch(console.error);