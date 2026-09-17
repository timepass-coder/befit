import { databaseManager } from '../database/DatabaseManager';
import { userProfileRepository } from '../repositories/UserProfileRepository';

/**
 * Seed data for development and testing.
 * Creates a single user profile for regular user validation (not admin).
 */

// Single sample user profile for testing/regular user validation
const SAMPLE_USER_PROFILE = {
  displayName: 'Test User',
  email: 'test.user@example.com',
};

/**
 * Seeds the database with a single sample user profile.
 * Only creates profile if the database is empty (idempotent).
 */
export async function seedUserProfile(): Promise<number> {
  // Check if we already have data
  const existingProfiles = await userProfileRepository.getAll();
  
  if (existingProfiles.length > 0) {
    console.log(`Database already has ${existingProfiles.length} user profiles, skipping seed.`);
    return 0;
  }

  console.log('Seeding database with sample user profile...');
  
  try {
    await userProfileRepository.create(SAMPLE_USER_PROFILE);
    console.log('Successfully created sample user profile.');
    return 1;
  } catch (error) {
    console.error(`Failed to create profile for ${SAMPLE_USER_PROFILE.displayName}:`, error);
    return 0;
  }
}

/**
 * Clears all user profiles (useful for testing).
 */
export async function clearUserProfiles(): Promise<void> {
  const db = databaseManager.getDatabase();
  await db.execAsync('DELETE FROM user_profiles');
  await db.execAsync('DELETE FROM sqlite_sequence WHERE name = "user_profiles"');
  console.log('Cleared all user profiles.');
}

/**
 * Runs all seed functions.
 */
export async function runAllSeeds(): Promise<void> {
  await seedUserProfile();
}

// Export the sample data for direct access if needed
export { SAMPLE_USER_PROFILE };