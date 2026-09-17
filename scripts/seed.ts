#!/usr/bin/env node
/**
 * Seed script for populating the database with sample data.
 * Run with: npx ts-node scripts/seed.ts
 */

import { databaseManager } from '@/database/database/DatabaseManager';
import { seedUserProfiles, runAllSeeds } from '@/database/seeds';

async function main() {
  console.log('Initializing database...');
  
  try {
    await databaseManager.initialize();
    console.log('Database initialized successfully.');
    
    console.log('Running seeds...');
    await runAllSeeds();
    
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await databaseManager.close();
  }
}

main();