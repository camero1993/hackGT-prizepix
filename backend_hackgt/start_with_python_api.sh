#!/bin/bash

# NBA Betting Simulator API with Python News API Startup Script
# This script starts both the Node.js backend and Python news API

set -e  # Exit on any error

echo "🏀 NBA Betting Simulator API with Python News API"
echo "================================================="

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
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the backend_hackgt directory."
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH."
    exit 1
fi

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed or not in PATH."
    exit 1
fi

print_status "Node.js version: $(node --version)"
print_status "Python version: $(python3 --version)"

# Check if dependencies are installed
print_status "Checking Node.js dependencies..."
if [ ! -d "node_modules" ]; then
    print_warning "Node.js dependencies not installed. Installing..."
    npm install
    print_success "Node.js dependencies installed."
else
    print_success "Node.js dependencies are already installed."
fi

# Check if Python API directory exists
PYTHON_API_DIR="../newscrape"
if [ ! -d "$PYTHON_API_DIR" ]; then
    print_error "Python API directory not found at $PYTHON_API_DIR"
    exit 1
fi

# Check if Python API has virtual environment
if [ ! -d "$PYTHON_API_DIR/venv" ]; then
    print_warning "Python virtual environment not found. Creating one..."
    cd "$PYTHON_API_DIR"
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install flask flask-cors pydantic pydantic-settings httpx typer rich python-dateutil pytz sqlalchemy alembic pyyaml structlog selectolax beautifulsoup4 lxml feedparser requests dateparser pygooglenews
    cd - > /dev/null
    print_success "Python virtual environment created and dependencies installed."
fi

# Build TypeScript if needed
print_status "Building TypeScript..."
npm run build

# Start the Node.js server (which will automatically start the Python API)
print_status "Starting NBA Betting Simulator API..."
print_status "The Python News API will be started automatically by the Node.js server"
print_status "Press Ctrl+C to stop both servers"
echo ""

# Run the Node.js server
npm start
