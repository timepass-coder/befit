import { seedUserProfile, clearUserProfiles, runAllSeeds } from './seeds/seedData';
import { databaseManager } from './database/DatabaseManager';

/**
 * Debug utilities for development and testing.
 * These can be called from the app UI for manual testing.
 */

export const debug = {
  /**
   * Seeds the database with sample user profile.
   * Safe to call multiple times - only seeds if database is empty.
   */
  async seedDatabase(): Promise<number> {
    await databaseManager.initialize();
    return seedUserProfile();
  },

  /**
   * Clears all user profiles from the database.
   */
  async clearDatabase(): Promise<void> {
    await databaseManager.initialize();
    await clearUserProfiles();
  },

  /**
   * Runs all seed functions.
   */
  async runAllSeeds(): Promise<void> {
    await databaseManager.initialize();
    await runAllSeeds();
  },

  /**
   * Gets all user profiles (for debugging).
   */
  async getAllUserProfiles(): Promise<Array<{ id: number; displayName: string; email: string | null }>> {
    await databaseManager.initialize();
    const { userProfileRepository } = await import('./repositories/UserProfileRepository');
    return userProfileRepository.getAll();
  },
};

// Make debug available globally in development
if (typeof globalThis !== 'undefined' && process.env.NODE_ENV !== 'production') {
  // @ts-ignore - adding debug to global for easy access in console
  globalThis.__BEFIT_DEBUG__ = debug;
}