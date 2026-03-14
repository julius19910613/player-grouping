import { expect, afterEach, beforeAll, vi, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn()

// In-memory database mock
const mockDatabase = {
  players: new Map<string, any>(),
  playerSkills: new Map<string, any>(),
  groupingHistory: new Map<number, any>(),
}

// Mock database service
vi.mock('../services/database', () => ({
  databaseService: {
    isInitialized: () => true,
    init: vi.fn(async () => {}),
    clear: vi.fn(async () => {
      mockDatabase.players.clear()
      mockDatabase.playerSkills.clear()
      mockDatabase.groupingHistory.clear()
    }),
    exec: vi.fn((sql: string, params?: any[]) => {
      // SELECT queries
      if (sql.includes('SELECT')) {
        return []
      }
      return []
    }),
    run: vi.fn((sql: string, params?: any[]) => {
      // INSERT/UPDATE/DELETE
    }),
    getLastInsertId: vi.fn(() => Date.now()),
    save: vi.fn(async () => {}),
  },
}))

// Mock idb library's openDB
vi.mock('idb', () => ({
  openDB: vi.fn(async (name: string, version: number, options?: any) => {
    // Call upgrade function if provided
    if (options?.upgrade) {
      const db = {
        objectStoreNames: {
          contains: (name: string) => false,
        },
        createObjectStore: (name: string, opts?: any) => {},
      }
      options.upgrade(db)
    }

    // Return a mock IDBDatabase
    return {
      get: vi.fn(async () => null),
      put: vi.fn(async () => Date.now()),
      delete: vi.fn(async () => {}),
      getAll: vi.fn(async () => []),
      clear: vi.fn(async () => {}),
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          get: vi.fn(async () => null),
          put: vi.fn(async () => Date.now()),
          delete: vi.fn(async () => {}),
          getAll: vi.fn(async () => []),
          clear: vi.fn(async () => {}),
        })),
        done: Promise.resolve(),
      })),
      close: vi.fn(),
    }
  }),
}))

// Mock sql.js
vi.mock('sql.js', () => ({
  default: vi.fn(async () => ({
    Database: class MockDatabase {
      run() {}
      prepare() {
        return {
          bind: () => {},
          step: () => false,
          get: () => [],
          free: () => {},
        }
      }
      export() {
        return new Uint8Array()
      }
    },
  })),
}))

// Clear storage before each test
beforeEach(() => {
  mockDatabase.players.clear()
  mockDatabase.playerSkills.clear()
  mockDatabase.groupingHistory.clear()
})

afterEach(() => {
  cleanup()
})
