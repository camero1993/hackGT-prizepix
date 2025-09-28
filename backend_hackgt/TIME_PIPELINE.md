# Time Advancement Pipeline

This directory contains scripts for automatically advancing simulated time in the NBA Betting Simulator system.

## Overview

The time advancement pipeline allows you to automatically advance simulated time by one day every 5 seconds, creating a fast-forward effect for testing and demonstration purposes.

## Scripts

### 1. Time Pipeline (`time-pipeline.ts`)

The main pipeline script that continuously advances time.

**Features:**
- Advances simulated time by 1 day every 5 seconds
- Automatic server health checking
- Graceful startup and shutdown
- Real-time status logging
- Error handling and recovery

**Usage:**
```bash
# Start the time pipeline
npm run time:pipeline

# Or run directly with ts-node
npx ts-node src/scripts/time-pipeline.ts
```

**Output:**
```
🚀 Initializing Time Pipeline...
✅ Time Pipeline initialized successfully
⏰ Starting time advancement pipeline (1 day every 5 seconds)...
Press Ctrl+C to stop the pipeline
⏰ Advanced time by 1 day (Total: 1 days) - Current: 2024-01-02T00:00:00.000Z
⏰ Advanced time by 1 day (Total: 2 days) - Current: 2024-01-03T00:00:00.000Z
...
```

### 2. Test Script (`test-time-advancement.ts`)

Comprehensive test suite for time advancement functionality.

**Features:**
- Tests all time advancement API endpoints
- Validates time calculations
- Tests error handling
- Verifies time state consistency

**Usage:**
```bash
# Run the test suite
npm run time:test

# Or run directly with ts-node
npx ts-node src/scripts/test-time-advancement.ts
```

**Test Coverage:**
- ✅ Server health check
- ✅ Get initial time state
- ✅ Set simulated time
- ✅ Advance time by 1 day
- ✅ Advance time by 1 hour
- ✅ Advance time by 30 minutes
- ✅ Invalid time advancement (negative duration)
- ✅ Invalid time advancement (zero duration)
- ✅ Reset to real time
- ✅ Time-filtered games endpoint

## Prerequisites

1. **Server Running**: The API server must be running on the configured port (default: 8000)
2. **Database Connected**: MongoDB and Redis must be connected
3. **Dependencies**: All npm dependencies must be installed

## Quick Start

1. **Start the API server:**
   ```bash
   npm run dev
   ```

2. **In a separate terminal, run the test suite:**
   ```bash
   npm run time:test
   ```

3. **If tests pass, start the time pipeline:**
   ```bash
   npm run time:pipeline
   ```

## API Endpoints Used

The pipeline uses the following API endpoints:

- `GET /health` - Check server health
- `GET /time` - Get current time state
- `POST /time/set` - Set simulated time
- `POST /time/advance` - Advance time by specified duration
- `POST /time/reset` - Reset to real time
- `GET /games/time-filtered` - Get time-filtered games

## Configuration

The pipeline uses the same configuration as the main API server. Key settings:

- **Port**: Default 8000 (configurable in `config.ts`)
- **Advancement Rate**: 1 day every 5 seconds
- **Timeout**: 5 seconds for API requests
- **Status Logging**: Every 30 seconds

## Monitoring

The pipeline provides real-time monitoring:

- **Console Output**: Shows each time advancement
- **Status Updates**: Every 30 seconds with uptime and total days advanced
- **Error Logging**: Detailed error messages for troubleshooting
- **Final Summary**: When stopped, shows total uptime and advancement rate

## Stopping the Pipeline

- **Graceful Shutdown**: Press `Ctrl+C` to stop the pipeline gracefully
- **Final Report**: Shows total uptime, days advanced, and average rate

## Troubleshooting

### Common Issues

1. **Server Not Running**
   ```
   ❌ Server is not running or not accessible
   ```
   **Solution**: Start the API server with `npm run dev`

2. **Database Connection Issues**
   ```
   ❌ Failed to get current time state
   ```
   **Solution**: Ensure MongoDB and Redis are running and connected

3. **Port Already in Use**
   ```
   Error: listen EADDRINUSE :::8000
   ```
   **Solution**: Change the port in `config.ts` or stop the conflicting process

### Debug Mode

For detailed debugging, you can modify the pipeline script to include more verbose logging or run the test script to verify individual components.

## Integration with Frontend

The time advancement pipeline works seamlessly with the frontend dashboard:

1. **Real-time Updates**: The frontend can poll `/api/demo/state` to see updated balances
2. **Time Display**: The frontend can show the current simulated time
3. **Game Filtering**: Games are automatically filtered based on simulated time
4. **Bet Resolution**: Bets are resolved based on the simulated time progression

## Performance Considerations

- **API Load**: The pipeline makes one API call every 5 seconds
- **Database Impact**: Minimal - only reads time state and advances time
- **Memory Usage**: Very low - just maintains a simple interval timer
- **CPU Usage**: Negligible - mostly waiting between API calls

## Customization

You can easily customize the pipeline:

- **Advancement Rate**: Change the interval (currently 5000ms)
- **Time Increment**: Modify the duration (currently 1 day)
- **Logging Frequency**: Adjust status update interval (currently 30000ms)
- **Error Handling**: Add retry logic or different error responses
