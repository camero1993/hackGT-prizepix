// Test setup file for Jest
// This file is run before each test file

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nba_test';

// Increase timeout for integration tests
jest.setTimeout(10000);
