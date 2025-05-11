#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Utility functions for the Instagram scraper.
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


def load_config(config_path: str) -> Dict:
    """
    Load configuration from a JSON file.
    
    Args:
        config_path: Path to the configuration file
        
    Returns:
        Dictionary containing configuration
    """
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading config from {config_path}: {e}")
        return {}


def save_data(data: Any, output_path: str, filename: Optional[str] = None) -> str:
    """
    Save data to a file.
    
    Args:
        data: Data to save
        output_path: Directory to save the data
        filename: Optional filename, otherwise a timestamp-based name is used
        
    Returns:
        Path to the saved file
    """
    # Create directory if it doesn't exist
    if not os.path.exists(output_path):
        os.makedirs(output_path)
        
    # Generate filename if not provided
    if not filename:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"instagram_data_{timestamp}.json"
    
    # Full path to save the file
    full_path = os.path.join(output_path, filename)
    
    try:
        with open(full_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        logger.info(f"Data saved to {full_path}")
        return full_path
    except Exception as e:
        logger.error(f"Error saving data to {full_path}: {e}")
        return ""
