import { BaseRepository, EntityMapper } from '../repositories/BaseRepository';
import { DbTestRecord, CreateDbTestRecordInput, UpdateDbTestRecordInput } from '../models/DbTestRecord';

const dbTestRecordMapper: EntityMapper<DbTestRecord> = {
  toRow(entity: Omit<DbTestRecord, 'id' | 'createdAt' | 'updatedAt'>): Record<string, unknown> {
    return {
      value: entity.value,
      int_value: entity.intValue ?? null,
    };
  },

  fromRow(row: Record<string, unknown>): DbTestRecord {
    return {
      id: row.id as number,
      value: row.value as string,
      intValue: row.int_value as number | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  },

  getId(entity: DbTestRecord): number {
    return entity.id;
  },
};

export class DbTestRecordRepository extends BaseRepository<DbTestRecord> {
  protected tableName = 'db_test_records';
  protected mapper = dbTestRecordMapper;
  protected idColumn = 'id';

  async create(input: CreateDbTestRecordInput): Promise<DbTestRecord> {
    const entity = {
      value: input.value,
      intValue: input.intValue ?? null,
    } satisfies Omit<DbTestRecord, 'id' | 'createdAt' | 'updatedAt'>;
    return super.create(entity);
  }

  async update(input: UpdateDbTestRecordInput): Promise<DbTestRecord> {
    const existing = await this.getByIdOrThrow(input.id);
    const updated: DbTestRecord = {
      ...existing,
      value: input.value ?? existing.value,
      intValue: input.intValue !== undefined ? input.intValue : existing.intValue,
      updatedAt: new Date().toISOString(),
    };
    return super.update(updated);
  }

  async getByValue(value: string): Promise<DbTestRecord | null> {
    return this.findOne({ value });
  }

  async getAllOrderByCreatedDesc(): Promise<DbTestRecord[]> {
    return this.getAll({ orderBy: 'created_at', orderDirection: 'DESC' });
  }
}

export const dbTestRecordRepository = new DbTestRecordRepository();