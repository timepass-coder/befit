export interface Repository<T, ID = number> {
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  getById(id: ID): Promise<T | null>;
  getAll(): Promise<T[]>;
  update(entity: T): Promise<T>;
  delete(id: ID): Promise<boolean>;
  exists(id: ID): Promise<boolean>;
  count(filters?: QueryFilter): Promise<number>;
}

export interface FindOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface QueryFilter {
  [key: string]: unknown;
}