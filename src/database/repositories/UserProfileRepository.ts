import { BaseRepository, EntityMapper } from './BaseRepository';
import {
  UserProfile,
  CreateUserProfileInput,
  UpdateUserProfileInput,
} from '../models/UserProfile';

const userProfileMapper: EntityMapper<UserProfile> = {
  toRow(
    entity: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>,
  ): Record<string, unknown> {
    return {
      display_name: entity.displayName,
      email: entity.email ?? null,
    };
  },

  fromRow(row: Record<string, unknown>): UserProfile {
    return {
      id: row.id as number,
      displayName: row.display_name as string,
      email: (row.email as string | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  },

  getId(entity: UserProfile): number {
    return entity.id;
  },
};

export class UserProfileRepository extends BaseRepository<UserProfile> {
  protected tableName = 'user_profiles';
  protected mapper = userProfileMapper;
  protected idColumn = 'id';

  async create(input: CreateUserProfileInput): Promise<UserProfile> {
    const entity = {
      displayName: input.displayName,
      email: input.email ?? null,
    } satisfies Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>;
    return super.create(entity);
  }

  async update(input: UpdateUserProfileInput): Promise<UserProfile> {
    const existing = await this.getByIdOrThrow(input.id);
    const updated: UserProfile = {
      ...existing,
      displayName: input.displayName ?? existing.displayName,
      email: input.email !== undefined ? input.email : existing.email,
      updatedAt: new Date().toISOString(),
    };
    return super.update(updated);
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    return this.findOne({ email });
  }

  async findByDisplayName(displayName: string): Promise<UserProfile[]> {
    return this.find({ display_name: displayName });
  }
}

export const userProfileRepository = new UserProfileRepository();