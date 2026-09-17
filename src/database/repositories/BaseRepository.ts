import { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';
import { databaseManager } from '../database/DatabaseManager';
import {
    DatabaseNotFoundError,
    DatabaseQueryError,
} from '../errors/DatabaseError';
import { FindOptions, QueryFilter, Repository } from './Repository';

export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface EntityMapper<T extends BaseEntity> {
  toRow(
    entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
  ): Record<string, unknown>;
  fromRow(row: Record<string, unknown>): T;
  getId(entity: T): number;
}

export abstract class BaseRepository<
  T extends BaseEntity,
> implements Repository<T> {
  protected abstract tableName: string;
  protected abstract mapper: EntityMapper<T>;
  protected abstract idColumn: string;

  protected get db(): SQLiteDatabase {
    return databaseManager.getDatabase();
  }

  async create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const row = this.mapper.toRow(entity);
    const columns = Object.keys(row).join(', ');
    const placeholders = Object.keys(row)
      .map(() => '?')
      .join(', ');
    const values = Object.values(row);

    const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;

    try {
      const result = await this.db.runAsync(
        sql,
        ...(values as SQLiteBindValue[]),
      );
      const id = result.lastInsertRowId;
      return this.getByIdOrThrow(id);
    } catch (error) {
      throw new DatabaseQueryError(
        `Failed to create entity in ${this.tableName}`,
        error as Error,
      );
    }
  }

  async getById(id: number): Promise<T | null> {
    try {
      const row = await this.db.getFirstAsync<Record<string, unknown>>(
        `SELECT * FROM ${this.tableName} WHERE ${this.idColumn} = ?`,
        id,
      );
      return row ? this.mapper.fromRow(row) : null;
    } catch (error) {
      throw new DatabaseQueryError(
        `Failed to get entity by id from ${this.tableName}`,
        error as Error,
      );
    }
  }

  async getByIdOrThrow(id: number): Promise<T> {
    const entity = await this.getById(id);
    if (!entity) {
      throw new DatabaseNotFoundError(
        `Entity with id ${id} not found in ${this.tableName}`,
      );
    }
    return entity;
  }

  async getAll(options?: FindOptions): Promise<T[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;

      if (options?.orderBy) {
        const direction = options.orderDirection || 'ASC';
        sql += ` ORDER BY ${options.orderBy} ${direction}`;
      }

      if (options?.limit) {
        sql += ` LIMIT ${options.limit}`;
        if (options.offset) {
          sql += ` OFFSET ${options.offset}`;
        }
      }

      const rows = await this.db.getAllAsync<Record<string, unknown>>(sql);
      return rows.map((row) => this.mapper.fromRow(row));
    } catch (error) {
      throw new DatabaseQueryError(
        `Failed to get all entities from ${this.tableName}`,
        error as Error,
      );
    }
  }

  async find(filters: QueryFilter, options?: FindOptions): Promise<T[]> {
    try {
      const conditions = Object.keys(filters)
        .map((key) => `${key} = ?`)
        .join(' AND ');
      const values = Object.values(filters);

      let sql = `SELECT * FROM ${this.tableName}`;
      if (conditions) {
        sql += ` WHERE ${conditions}`;
      }

      if (options?.orderBy) {
        const direction = options.orderDirection || 'ASC';
        sql += ` ORDER BY ${options.orderBy} ${direction}`;
      }

      if (options?.limit) {
        sql += ` LIMIT ${options.limit}`;
        if (options.offset) {
          sql += ` OFFSET ${options.offset}`;
        }
      }

      const rows = await this.db.getAllAsync<Record<string, unknown>>(
        sql,
        ...(values as SQLiteBindValue[]),
      );
      return rows.map((row) => this.mapper.fromRow(row));
    } catch (error) {
      throw new DatabaseQueryError(
        `Failed to find entities in ${this.tableName}`,
        error as Error,
      );
    }
  }

  async findOne(filters: QueryFilter): Promise<T | null> {
    const results = await this.find(filters, { limit: 1 });
    return results[0] || null;
  }

  async update(entity: T): Promise<T> {
    const id = this.mapper.getId(entity);
    const row = this.mapper.toRow(entity);

    delete row.id;
    delete row.createdAt;
    delete row.updatedAt;
    row.updated_at = new Date().toISOString();

    const columns = Object.keys(row)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(row), id];

    const sql = `UPDATE ${this.tableName} SET ${columns} WHERE ${this.idColumn} = ?`;

    try {
      const result = await this.db.runAsync(
        sql,
        ...(values as SQLiteBindValue[]),
      );
      if (result.changes === 0) {
        throw new DatabaseNotFoundError(
          `Entity with id ${id} not found in ${this.tableName}`,
        );
      }
      return this.getByIdOrThrow(id);
    } catch (error) {
      if (error instanceof DatabaseNotFoundError) {
        throw error;
      }
      throw new DatabaseQueryError(
        `Failed to update entity in ${this.tableName}`,
        error as Error,
      );
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const result = await this.db.runAsync(
        `DELETE FROM ${this.tableName} WHERE ${this.idColumn} = ?`,
        id,
      );
      return result.changes > 0;
    } catch (error) {
      throw new DatabaseQueryError(
        `Failed to delete entity from ${this.tableName}`,
        error as Error,
      );
    }
  }

  async exists(id: number): Promise<boolean> {
    try {
      const row = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${this.idColumn} = ?`,
        id,
      );
      return (row?.count ?? 0) > 0;
    } catch (error) {
      throw new DatabaseQueryError(
        `Failed to check existence in ${this.tableName}`,
        error as Error,
      );
    }
  }

  async count(filters?: QueryFilter): Promise<number> {
    try {
      let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const values: unknown[] = [];

      if (filters && Object.keys(filters).length > 0) {
        const conditions = Object.keys(filters)
          .map((key) => `${key} = ?`)
          .join(' AND ');
        sql += ` WHERE ${conditions}`;
        values.push(...Object.values(filters));
      }

      const row = await this.db.getFirstAsync<{ count: number }>(
        sql,
        ...(values as SQLiteBindValue[]),
      );
      return row?.count ?? 0;
    } catch (error) {
      throw new DatabaseQueryError(
        `Failed to count entities in ${this.tableName}`,
        error as Error,
      );
    }
  }
}
