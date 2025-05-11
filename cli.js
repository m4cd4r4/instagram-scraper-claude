#!/usr/bin/env node
// cli.js
// Command line interface for the Instagram scraper

const { InstagramScraper } = require('./index');
const config = require('./config');
const path = require('path');

/**
 * Parse command line arguments
 * @returns {Object} - Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    username: null,
    method: 'auto',
    includePostDetails: false,
    maxPosts: config.instagram.maxPostsToScrape,
    outputFile: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--username' || arg === '-u') {
      options.username = args[++i];
    } else if (arg === '--method' || arg === '-m') {
      options.method = args[++i];
    } else if (arg === '--details' || arg === '-d') {
      options.includePostDetails = true;
    } else if (arg === '--max-posts' || arg === '-p') {
      options.maxPosts = parseInt(args[++i], 10);
    } else if (arg === '--output' || arg === '-o') {
      options.outputFile = args[++i];
    } else if (!options.username) {
      // If no username specified but an argument is provided, assume it's the username
      options.username = arg;
    }
  }

  return options;
}

/**
 * Display help information
 */
function displayHelp() {
  console.log(`
Instagram Scraper using Bright Data Model-Context-Protocol

Usage:
  node cli.js <username> [options]

Options:
  -h, --help                 Show this help message
  -u, --username <username>  Instagram username to scrape
  -m, --method <method>      Scraping method (api, browser, auto) [default: auto]
  -d, --details              Include detailed post information
  -p, --max-posts <number>   Maximum number of posts to scrape [default: ${config.instagram.maxPostsToScrape}]
  -o, --output <filename>    Output file for scraped data [default: <username>_profile.json]

Examples:
  node cli.js femalephysioco
  node cli.js -u femalephysioco -d -p 50 -o data/female_physio.json
  node cli.js femalephysioco --method browser --details
  `);
}

/**
 * Main CLI function
 */
async function main() {
  const options = parseArgs();

  if (options.help) {
    displayHelp();
    return;
  }

  if (!options.username) {
    console.error('Error: Username is required');
    displayHelp();
    return;
  }

  // Set default output file if not specified
  if (!options.outputFile) {
    options.outputFile = `./${options.username}_profile.json`;
  }

  try {
    console.log(`Starting Instagram scraper for: ${options.username}`);
    console.log(`Method: ${options.method}`);
    console.log(`Include post details: ${options.includePostDetails}`);
    console.log(`Max posts: ${options.maxPosts}`);
    console.log(`Output file: ${options.outputFile}`);
    console.log('-------------------------------');

    const scraper = new InstagramScraper();
    const result = await scraper.scrapeProfile(options.username, {
      method: options.method,
      includePostDetails: options.includePostDetails,
      maxPosts: options.maxPosts,
      outputFile: options.outputFile
    });

    if (result.success) {
      console.log('\n✓ Scraping completed successfully!');
      console.log(`Method used: ${result.method}`);
      console.log(`Profile: ${result.data.username} (${result.data.fullName || 'N/A'})`);
      console.log(`Followers: ${result.data.followersCount || 'N/A'}`);
      console.log(`Posts scraped: ${result.data.posts ? result.data.posts.length : 0}/${result.data.postsCount || 'N/A'}`);
      console.log(`Data saved to: ${options.outputFile}`);
    } else {
      console.error('\n✗ Scraping failed:', result.error.message);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Execute if this file is run directly
if (require.main === module) {
  main().catch(console.error);
}
