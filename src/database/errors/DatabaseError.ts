export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class DatabaseInitializationError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'DATABASE_INITIALIZATION_ERROR', cause);
    this.name = 'DatabaseInitializationError';
  }
}

export class DatabaseMigrationError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'DATABASE_MIGRATION_ERROR', cause);
    this.name = 'DatabaseMigrationError';
  }
}

export class DatabaseConnectionError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'DATABASE_CONNECTION_ERROR', cause);
    this.name = 'DatabaseConnectionError';
  }
}

export class DatabaseConstraintError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'DATABASE_CONSTRAINT_ERROR', cause);
    this.name = 'DatabaseConstraintError';
  }
}

export class DatabaseQueryError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'DATABASE_QUERY_ERROR', cause);
    this.name = 'DatabaseQueryError';
  }
}

export class DatabaseTransactionError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'DATABASE_TRANSACTION_ERROR', cause);
    this.name = 'DatabaseTransactionError';
  }
}

export class DatabaseNotFoundError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'DATABASE_NOT_FOUND_ERROR', cause);
    this.name = 'DatabaseNotFoundError';
  }
}

export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}