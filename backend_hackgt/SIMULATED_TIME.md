# Simulated Time System

The NBA Betting Simulator now includes a simulated time system that allows you to control what games the system "knows" about versus what games are in the "future" and unknown to the system.

## How It Works

- **Past Games**: Games that occur before the simulated current time are considered "known" to the system and are used for modeling player performance and generating betting projections.
- **Future Games**: Games that occur after the simulated current time are considered "unknown" to the system and are not used in calculations.

## API Endpoints

### Get Current Time State
```
GET /time
```
Returns the current simulated time and whether the system is in simulation mode.

### Set Simulated Time
```
POST /time/set
Content-Type: application/json

{
  "time": "2024-01-15T12:00:00.000Z"
}
```
Sets the simulated time to a specific date/time (ISO string format).

### Advance Simulated Time
```
POST /time/advance
Content-Type: application/json

{
  "duration": 7,
  "unit": "days"
}
```
Advances the simulated time by the specified duration. Units can be:
- `milliseconds`
- `seconds`
- `minutes`
- `hours`
- `days`

### Reset to Real Time
```
POST /time/reset
```
Resets the simulated time back to the current real time.

### Get Time-Filtered Games
```
GET /games/time-filtered
```
Returns all games split into past and future categories based on the current simulated time.

### Get Future Games Only
```
GET /games/future?limit=20
```
Returns only games that are in the "future" (unknown to the system).

## Usage Examples

### Example 1: Set Time to January 1st, 2024
```bash
curl -X POST http://localhost:8000/time/set \
  -H "Content-Type: application/json" \
  -d '{"time": "2024-01-01T00:00:00.000Z"}'
```

### Example 2: Advance Time by 1 Week
```bash
curl -X POST http://localhost:8000/time/advance \
  -H "Content-Type: application/json" \
  -d '{"duration": 7, "unit": "days"}'
```

### Example 3: Check What Games Are Known vs Unknown
```bash
curl http://localhost:8000/games/time-filtered
```

## Impact on Betting Simulation

When you run a betting simulation (`POST /simulate`), the system will:

1. Only use games that occurred **before** the simulated current time for calculating player expected values
2. Only simulate against games that occurred **before** the simulated current time
3. This allows you to test how the system would have performed at different points in time

## Use Cases

1. **Historical Testing**: Set the time to a past date to see how the system would have performed with only the data available at that time.

2. **Future Simulation**: Set the time to a future date to see how the system would perform with only current data.

3. **Progressive Testing**: Start at an early date and gradually advance time to see how performance changes as more data becomes available.

4. **Real-time Mode**: Use `POST /time/reset` to return to real-time mode where the system uses all available data up to the current moment.
