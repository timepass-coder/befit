import { BaseEntity } from '../repositories/BaseRepository';

export interface UserProfile extends BaseEntity {
  id: number;
  displayName: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserProfileInput {
  displayName: string;
  email?: string | null;
}

export interface UpdateUserProfileInput {
  id: number;
  displayName?: string;
  email?: string | null;
}