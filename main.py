#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Main entry point for the Instagram scraper.
"""

import os
import argparse
import logging
from datetime import datetime
from dotenv import load_dotenv

from src.scraper import InstagramScraper
from src.utils import load_config, save_data

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f"instagram_scraper_{datetime.now().strftime('%Y%m%d')}.log")
    ]
)

logger = logging.getLogger(__name__)


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Instagram Scraper')
    
    parser.add_argument('--profile', '-p', type=str, help='Instagram profile to scrape')
    parser.add_argument('--post', '-u', type=str, help='Instagram post URL to scrape')
    parser.add_argument('--output', '-o', type=str, default='data', 
                        help='Output directory (default: data)')
    parser.add_argument('--config', '-c', type=str, default='config.json',
                        help='Path to configuration file (default: config.json)')
    
    return parser.parse_args()


def main():
    """Main function."""
    args = parse_arguments()
    
    # Initialize scraper
    scraper = InstagramScraper()
    
    if args.profile:
        # Scrape profile
        logger.info(f"Scraping profile: {args.profile}")
        data = scraper.scrape_profile(args.profile)
        save_data(data, args.output, f"{args.profile}_profile.json")
        
    elif args.post:
        # Scrape post
        logger.info(f"Scraping post: {args.post}")
        data = scraper.scrape_post(args.post)
        save_data(data, args.output, f"post_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        
    else:
        logger.error("No action specified. Use --profile or --post arguments.")
        print("No action specified. Use --profile or --post arguments.")


if __name__ == "__main__":
    main()
