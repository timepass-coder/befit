import { databaseManager } from '../database/DatabaseManager';
import { userProfileRepository } from '../repositories/UserProfileRepository';
import { seedUserProfile, clearUserProfiles, SAMPLE_USER_PROFILE } from '../seeds/seedData';
import { DATABASE_NAME } from '../database/DatabaseConfig';
import { removeDatabaseFile, openDatabaseAsync } from '../testing/sqljs-expo-sqlite';

describe('Seed Data', () => {
  beforeEach(async () => {
    removeDatabaseFile(DATABASE_NAME);
    await databaseManager.close();
  });

  afterEach(async () => {
    await databaseManager.close();
    removeDatabaseFile(DATABASE_NAME);
  });

  it('should seed user profile when database is empty', async () => {
    await databaseManager.initialize();
    
    const createdCount = await seedUserProfile();
    
    expect(createdCount).toBe(1);
    
    const profiles = await userProfileRepository.getAll();
    expect(profiles.length).toBe(1);
    
    // Verify the profile data
    const profile = profiles.find(p => p.displayName === 'Test User');
    expect(profile).toBeDefined();
    expect(profile?.email).toBe('test.user@example.com');
  });

  it('should not seed when database already has data', async () => {
    await databaseManager.initialize();
    
    // Create one profile manually
    await userProfileRepository.create({
      displayName: 'Existing User',
      email: 'existing@example.com',
    });
    
    const createdCount = await seedUserProfile();
    
    // Should not create any new profiles
    expect(createdCount).toBe(0);
    
    const profiles = await userProfileRepository.getAll();
    expect(profiles.length).toBe(1);
    expect(profiles[0].displayName).toBe('Existing User');
  });

  it('should clear user profiles', async () => {
    await databaseManager.initialize();
    
    // Seed first
    await seedUserProfile();
    
    const profilesBefore = await userProfileRepository.getAll();
    expect(profilesBefore.length).toBeGreaterThan(0);
    
    // Clear
    await clearUserProfiles();
    
    const profilesAfter = await userProfileRepository.getAll();
    expect(profilesAfter.length).toBe(0);
  });

  it('should create user with email', async () => {
    await databaseManager.initialize();
    await seedUserProfile();
    
    const profiles = await userProfileRepository.getAll();
    
    expect(profiles.length).toBe(1);
    const profile = profiles[0];
    expect(profile.displayName).toBe('Test User');
    expect(profile.email).toBe('test.user@example.com');
  });
});