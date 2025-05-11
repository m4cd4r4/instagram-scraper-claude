from setuptools import setup, find_packages

setup(
    name="instagram-scraper",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "requests>=2.28.2",
        "beautifulsoup4>=4.11.1",
        "selenium>=4.8.0",
        "webdriver-manager>=3.8.5",
        "pandas>=1.5.3",
        "python-dotenv>=1.0.0",
    ],
    entry_points={
        "console_scripts": [
            "instagram-scraper=main:main",
        ],
    },
)
