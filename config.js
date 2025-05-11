// config.js
// Configuration module for Bright Data credentials and settings
const config = {
  // Bright Data credentials - to be replaced with actual values
  auth: {
    username: "brd-customer-hl_4c6f7de1-zone-residential_proxy1",
    password: "vkxoltqdj04",
    zone: "residential_proxy1"
  },
  
  // Proxy configuration
  proxy: {
    host: "brd.superproxy.io",
    port: 22225,  // This is correct in your current config
    session_id: Date.now() // Creates a unique session ID
  },

  
  // Instagram-specific settings
  instagram: {
    baseUrl: "https://www.instagram.com",
    waitForSelectors: {
      profileHeader: "header section",
      posts: "article div[role='button']",
      bioInfo: "header section h2"
    },
    scrollDelay: 1500,
    maxPostsToScrape: 20
  }
};

module.exports = config;