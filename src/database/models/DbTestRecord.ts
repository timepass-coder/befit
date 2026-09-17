import { BaseEntity } from '../repositories/BaseRepository';

export interface DbTestRecord extends BaseEntity {
  id: number;
  value: string;
  intValue: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDbTestRecordInput {
  value: string;
  intValue?: number | null;
}

export interface UpdateDbTestRecordInput {
  id: number;
  value?: string;
  intValue?: number | null;
}