import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.real.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  verbose: true,
  moduleNameMapper: {
    '^expo-sqlite$': '<rootDir>/src/database/testing/sqljs-expo-sqlite.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json', useESM: false }],
  },
  globals: {
    'ts-jest': { tsconfig: 'tsconfig.json' },
  },
};

export default config;