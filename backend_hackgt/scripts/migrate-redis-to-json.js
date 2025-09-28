#!/usr/bin/env node

/**
 * Migration Script: Redis to JSON Storage
 * 
 * This script replaces all Redis usage with JSON file storage
 * Usage: node scripts/migrate-redis-to-json.js
 */

const fs = require('fs');
const path = require('path');

// Files to migrate
const filesToMigrate = [
  'src/app.ts',
  'src/services/BettingSimulator.ts'
];

// Migration patterns
const migrations = [
  {
    // Import statements
    from: "import { redisService, DemoState, TradeLogEntry } from './RedisService';",
    to: "import { jsonStorageService, DemoState, TradeLogEntry } from './JsonStorageService';"
  },
  {
    from: "import { redisService } from './services/RedisService';",
    to: "import { jsonStorageService } from './services/JsonStorageService';"
  },
  {
    // Service calls
    from: /redisService\./g,
    to: 'jsonStorageService.'
  },
  {
    // Class references
    from: /RedisService/g,
    to: 'JsonStorageService'
  }
];

function migrateFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let hasChanges = false;

  migrations.forEach(migration => {
    const before = content;
    if (migration.from instanceof RegExp) {
      content = content.replace(migration.from, migration.to);
    } else {
      content = content.replace(new RegExp(escapeRegExp(migration.from), 'g'), migration.to);
    }
    
    if (content !== before) {
      hasChanges = true;
    }
  });

  if (hasChanges) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Migrated: ${filePath}`);
  } else {
    console.log(`⏭️  No changes needed: ${filePath}`);
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function main() {
  console.log('🚀 Starting Redis to JSON Storage Migration...\n');

  // Create data directory
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('📁 Created data directory');
  }

  // Migrate files
  filesToMigrate.forEach(filePath => {
    migrateFile(filePath);
  });

  // Update package.json to remove Redis dependency
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Remove Redis dependencies
    if (packageJson.dependencies) {
      delete packageJson.dependencies['redis'];
      delete packageJson.dependencies['@types/redis'];
    }
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('📦 Updated package.json (removed Redis dependencies)');
  }

  console.log('\n✅ Migration completed!');
  console.log('\nNext steps:');
  console.log('1. Run: npm install (to remove Redis packages)');
  console.log('2. Run: npm run build');
  console.log('3. Run: npm start');
  console.log('\nData will be stored in: data/betting-data.json');
}

if (require.main === module) {
  main();
}

module.exports = { migrateFile, migrations };
