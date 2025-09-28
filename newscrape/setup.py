#!/usr/bin/env python3
"""
Setup script for the Sports News Scraper.
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="sports-news-scraper",
    version="0.1.0",
    author="Magnus Graham",
    author_email="magnus@example.com",
    description="A reliable, legally-compliant news scraper/ingester for sports articles",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/sports-news-scraper",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.11",
    install_requires=requirements,
    entry_points={
        "console_scripts": [
            "sports-news=app.cli:main",
        ],
    },
    include_package_data=True,
    package_data={
        "": ["data/*.yaml", "data/*.csv"],
    },
)
