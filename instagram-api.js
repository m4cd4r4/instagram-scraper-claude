// instagram-api.js
// Module for handling Instagram API requests via Bright Data proxy
const axios = require('axios');
const config = require('./config');
const { createProxyAuth } = require('./utils');

class InstagramApiClient {
  constructor() {
    this.axiosInstance = axios.create({
      proxy: {
        host: config.proxy.host,
        port: config.proxy.port,
        auth: createProxyAuth()
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 30000
    });
  }

  /**
   * Fetches profile data using Model-Context-Protocol
   * @param {string} username - Instagram username to scrape
   * @returns {Promise<Object>} - Structured profile data
   */
  async getProfileData(username) {
    try {
      // First request: Initial page load to get shared_data
      const url = `${config.instagram.baseUrl}/${username}/`;
      const response = await this.axiosInstance.get(url);
      
      // Extract shared_data JSON from the HTML
      const sharedDataMatch = response.data.match(/<script type="text\/javascript">window\._sharedData = (.*?);<\/script>/);
      
      if (!sharedDataMatch || !sharedDataMatch[1]) {
        throw new Error('Failed to extract shared data from Instagram response');
      }
      
      const sharedData = JSON.parse(sharedDataMatch[1]);
      
      // Extract profile data from shared_data
      const userData = sharedData?.entry_data?.ProfilePage?.[0]?.graphql?.user || null;
      
      if (!userData) {
        throw new Error('Profile data not found in response');
      }
      
      // Transform data into a standardized structure
      return this.transformProfileData(userData);
    } catch (error) {
      console.error('Error fetching profile data:', error.message);
      throw error;
    }
  }
  
  /**
   * Transforms raw Instagram data into a clean, structured format
   * @param {Object} userData - Raw user data from Instagram
   * @returns {Object} - Cleaned and structured profile data
   */
  transformProfileData(userData) {
    return {
      username: userData.username,
      fullName: userData.full_name,
      biography: userData.biography,
      profilePicUrl: userData.profile_pic_url_hd || userData.profile_pic_url,
      isPrivate: userData.is_private,
      isVerified: userData.is_verified,
      externalUrl: userData.external_url,
      followersCount: userData.edge_followed_by.count,
      followingCount: userData.edge_follow.count,
      postsCount: userData.edge_owner_to_timeline_media.count,
      posts: userData.edge_owner_to_timeline_media.edges.map(edge => ({
        id: edge.node.id,
        shortcode: edge.node.shortcode,
        thumbnailUrl: edge.node.thumbnail_src,
        displayUrl: edge.node.display_url,
        isVideo: edge.node.is_video,
        caption: edge.node.edge_media_to_caption.edges[0]?.node?.text || '',
        likesCount: edge.node.edge_liked_by?.count || edge.node.edge_media_preview_like?.count || 0,
        commentsCount: edge.node.edge_media_to_comment?.count || 0,
        timestamp: edge.node.taken_at_timestamp,
        location: edge.node.location?.name || null
      })).slice(0, config.instagram.maxPostsToScrape)
    };
  }
  
  /**
   * Fetches additional posts for a profile using the Instagram GraphQL API
   * @param {string} userId - Instagram user ID
   * @param {string} endCursor - Pagination cursor
   * @returns {Promise<Object>} - Additional posts data
   */
  async getAdditionalPosts(userId, endCursor) {
    try {
      const url = `${config.instagram.baseUrl}/graphql/query/`;
      const variables = {
        id: userId,
        first: 12,
        after: endCursor
      };
      
      const params = {
        query_hash: 'e769aa130647d2354c40ea6a439bfc08', // Instagram's query hash for profile posts
        variables: JSON.stringify(variables)
      };
      
      const response = await this.axiosInstance.get(url, { params });
      
      if (!response.data?.data?.user?.edge_owner_to_timeline_media) {
        throw new Error('Failed to fetch additional posts');
      }
      
      return response.data.data.user.edge_owner_to_timeline_media;
    } catch (error) {
      console.error('Error fetching additional posts:', error.message);
      throw error;
    }
  }
}

module.exports = new InstagramApiClient();