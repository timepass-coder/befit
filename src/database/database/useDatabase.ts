import { useEffect, useState } from 'react';

import { databaseManager } from './DatabaseManager';
import { userProfileRepository } from '../repositories/UserProfileRepository';
import { UserProfile } from '../models/UserProfile';

export type DatabaseStatus = 'initializing' | 'ready' | 'error';

export interface UseDatabaseResult {
  status: DatabaseStatus;
  error: Error | null;
  retry: () => void;
}

/**
 * Initializes the local database once and exposes an idempotent retry
 * mechanism for startup failures. Intended to be called from the root layout
 * so that the database is opened and migrated before the app renders routes.
 */
export function useDatabase(): UseDatabaseResult {
  const [status, setStatus] = useState<DatabaseStatus>('initializing');
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    databaseManager
      .initialize()
      .then(() => {
        if (!cancelled) {
          setStatus('ready');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return {
    status,
    error,
    retry: () => {
      setStatus('initializing');
      setError(null);
      setAttempt((current) => current + 1);
    },
  };
}

/**
 * Hook to fetch and manage user profiles.
 */
export function useUserProfiles() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const data = await userProfileRepository.getAll();
      setProfiles(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  return {
    profiles,
    loading,
    error,
    refresh: fetchProfiles,
  };
}