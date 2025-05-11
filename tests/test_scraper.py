#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tests for the Instagram scraper.
"""

import unittest
from src.scraper import InstagramScraper


class TestInstagramScraper(unittest.TestCase):
    """Test cases for InstagramScraper class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.scraper = InstagramScraper()
    
    def test_scrape_profile_returns_dict(self):
        """Test that scrape_profile returns a dictionary."""
        result = self.scraper.scrape_profile("test_user")
        self.assertIsInstance(result, dict)
        self.assertEqual(result.get("username"), "test_user")
    
    def test_scrape_post_returns_dict(self):
        """Test that scrape_post returns a dictionary."""
        test_url = "https://www.instagram.com/p/example"
        result = self.scraper.scrape_post(test_url)
        self.assertIsInstance(result, dict)
        self.assertEqual(result.get("url"), test_url)


if __name__ == "__main__":
    unittest.main()
