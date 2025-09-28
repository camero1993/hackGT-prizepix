#!/bin/bash

# Sports News Scraper API Startup Script
# This script sets up and starts the API server for the frontend

set -e  # Exit on any error

echo "🏀 Sports News Scraper API Startup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "api_server.py" ]; then
    print_error "api_server.py not found. Please run this script from the newscrape directory."
    exit 1
fi

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed or not in PATH."
    exit 1
fi

print_status "Python version: $(python3 --version)"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_warning "Virtual environment not found. Creating one..."
    python3 -m venv venv
    print_success "Virtual environment created."
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
print_status "Checking dependencies..."
if ! python -c "import flask" 2>/dev/null; then
    print_warning "Dependencies not installed. Installing..."
    pip install --upgrade pip
    pip install flask flask-cors pydantic pydantic-settings httpx typer rich python-dateutil pytz sqlalchemy alembic pyyaml structlog selectolax beautifulsoup4 lxml feedparser requests dateparser pygooglenews
    print_success "Dependencies installed."
else
    print_success "Dependencies are already installed."
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f "env.example" ]; then
        cp env.example .env
        print_success ".env file created from template."
    else
        print_error "env.example file not found. Cannot create .env file."
        exit 1
    fi
fi

# Test API server startup
print_status "Testing API server startup..."
if python -c "from app.sources.googlenews_mock import MockGoogleNewsAdapter; print('Import successful')" 2>/dev/null; then
    print_success "API server components are ready."
else
    print_error "Failed to import API components. Check dependencies."
    exit 1
fi

# Start the API server
print_status "Starting API server on http://localhost:5001"
print_status "Press Ctrl+C to stop the server"
echo ""

# Run the API server
python api_server.py
