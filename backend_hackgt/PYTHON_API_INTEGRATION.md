# Python News API Integration

This document explains how the Python News API is integrated with the Node.js backend to provide sports news functionality.

## Overview

The Node.js backend now automatically starts and manages a Python Flask API server that provides sports news functionality. This integration allows the frontend to access both betting simulation data and real-time sports news through a unified interface.

## Architecture

```
Frontend (React/Next.js)
    ↓
Node.js Backend (Port 3000)
    ↓ (manages)
Python News API (Port 5001)
    ↓ (provides)
Sports News Data
```

## Features

- **Automatic Startup**: Python API starts automatically when Node.js backend starts
- **Process Management**: Node.js manages the Python process lifecycle
- **Health Monitoring**: Built-in health checks and status monitoring
- **Graceful Shutdown**: Both servers stop together when Node.js shuts down
- **Error Handling**: Robust error handling and retry logic
- **API Management**: REST endpoints to control the Python API

## Quick Start

### Option 1: Using the Integrated Startup Script

```bash
cd /Users/magnusgraham/Documents/hackGT/hackGT-prizepix/backend_hackgt
./start_with_python_api.sh
```

### Option 2: Using npm scripts

```bash
cd /Users/magnusgraham/Documents/hackGT/hackGT-prizepix/backend_hackgt
npm run build
npm start
```

The Python API will start automatically as part of the Node.js startup process.

## API Endpoints

### Node.js Backend (Port 3000)

#### Python API Management
- `GET /api/python/status` - Get Python API status
- `POST /api/python/start` - Start Python API
- `POST /api/python/stop` - Stop Python API
- `GET /api/python/test` - Test Python API functionality

### Python News API (Port 5001)

#### News Endpoints
- `GET /health` - Health check
- `GET /api/headlines?player=NAME` - Get headlines for a player
- `GET /api/headlines` - Get all NBA headlines
- `GET /api/search/player?player=NAME` - Search player articles
- `GET /api/search/nba-athletes` - Search all NBA athletes
- `POST /api/search/multiple-players` - Search multiple players

## Usage Examples

### Check Python API Status

```javascript
const response = await fetch('http://localhost:3000/api/python/status');
const status = await response.json();
console.log('Python API running:', status.running);
console.log('Port:', status.port);
```

### Get Player Headlines

```javascript
const response = await fetch('http://localhost:5001/api/headlines?player=LeBron%20James');
const data = await response.json();
console.log('Headlines:', data.headlines);
```

### Search for Player Articles

```javascript
const response = await fetch('http://localhost:5001/api/search/player?player=Stephen%20Curry&max_results=5');
const data = await response.json();
console.log('Articles:', data.articles);
```

## Configuration

### Python API Settings

The Python API manager is configured in `src/services/PythonAPIManager.ts`:

```typescript
private readonly pythonAPIPort = 5001;
private readonly pythonAPIPath = join(__dirname, '../../../newscrape');
private readonly maxRetries = 5;
private readonly retryDelay = 2000; // 2 seconds
```

### Environment Variables

The Python API uses the `.env` file in the `newscrape` directory:

```env
APP_ENV=dev
APP_TZ=America/New_York
LOG_LEVEL=INFO
```

## Process Management

### Starting the Python API

The Python API is started automatically when the Node.js server starts:

1. Node.js checks if Python API is already running
2. If not running, spawns a Python process
3. Waits for the API to be ready (health check)
4. Logs success/failure status

### Stopping the Python API

The Python API is stopped when:

1. Node.js server receives SIGTERM or SIGINT
2. Manual stop via `/api/python/stop` endpoint
3. Process exits or crashes

### Health Monitoring

The system continuously monitors the Python API:

- Health checks every 2 seconds during startup
- Automatic retry on failure (up to 5 attempts)
- Process monitoring and restart capabilities

## Error Handling

### Common Issues

1. **Python API fails to start**
   - Check if Python 3 is installed
   - Verify virtual environment exists
   - Check dependencies are installed

2. **Port conflicts**
   - Ensure port 5001 is available
   - Check for other Python processes

3. **Permission issues**
   - Verify script execution permissions
   - Check file system permissions

### Debugging

Enable debug logging by setting:

```env
LOG_LEVEL=DEBUG
```

Check logs for detailed error information:

```bash
# Node.js logs
npm start

# Python API logs (if running separately)
cd ../newscrape
source venv/bin/activate
python api_server.py
```

## Development

### Adding New Python API Endpoints

1. Add endpoint to `api_server.py`
2. Update the API documentation in Node.js
3. Add tests to the test suite
4. Update this documentation

### Modifying Python API Configuration

1. Edit `src/services/PythonAPIManager.ts`
2. Update port or path settings
3. Rebuild and restart the Node.js server

### Testing

Run the integrated test suite:

```bash
# Test Node.js API
npm test

# Test Python API integration
curl http://localhost:3000/api/python/test

# Test Python API directly
curl http://localhost:5001/health
```

## Production Deployment

### Docker Integration

For production deployment, consider using Docker:

```dockerfile
# Dockerfile for Node.js + Python
FROM node:18-alpine

# Install Python
RUN apk add --no-cache python3 py3-pip

# Copy application files
COPY . /app
WORKDIR /app

# Install dependencies
RUN npm install
RUN cd newscrape && python3 -m venv venv && \
    source venv/bin/activate && \
    pip install -r requirements.txt

# Start both services
CMD ["npm", "start"]
```

### Process Management

For production, consider using PM2 or similar process manager:

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js
```

## Monitoring

### Health Checks

Monitor both services:

```bash
# Node.js health
curl http://localhost:3000/health

# Python API health
curl http://localhost:5001/health

# Python API status via Node.js
curl http://localhost:3000/api/python/status
```

### Logs

Monitor logs for both services:

```bash
# Node.js logs
tail -f logs/app.log

# Python API logs (if running separately)
tail -f ../newscrape/logs/api.log
```

## Troubleshooting

### Python API Not Starting

1. Check Python installation:
   ```bash
   python3 --version
   ```

2. Check virtual environment:
   ```bash
   cd ../newscrape
   source venv/bin/activate
   python --version
   ```

3. Check dependencies:
   ```bash
   pip list
   ```

### Port Conflicts

1. Check if port 5001 is in use:
   ```bash
   lsof -i :5001
   ```

2. Kill conflicting processes:
   ```bash
   kill -9 $(lsof -ti:5001)
   ```

### Permission Issues

1. Make scripts executable:
   ```bash
   chmod +x start_with_python_api.sh
   ```

2. Check file permissions:
   ```bash
   ls -la ../newscrape/
   ```

## Support

For issues with the Python API integration:

1. Check the logs for error messages
2. Verify both services are running
3. Test individual components
4. Check the troubleshooting section above

The integration is designed to be robust and self-healing, but manual intervention may be required in some cases.
