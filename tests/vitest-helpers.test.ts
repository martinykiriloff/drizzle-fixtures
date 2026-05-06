import { describe, it, expect, vi } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { defineFactory } from '../src/factory.js'
import { useFactory, useSeeder } from '../src/integrations/vitest.js'
import { authors } from './fixtures/relations-schema.js'

function makeDb() {
  const sqlite = new Database(':memory:')
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS authors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL
    );
  `)
  return drizzle(sqlite)
}

describe('useFactory', () => {
  const factory = defineFactory(authors, {
    overrides: { name: ({ seq }) => `author-${seq}` },
  })
  const wrappedFactory = useFactory(factory)

  it('returns the same factory instance', () => {
    expect(wrappedFactory).toBe(factory)
  })

  it('test 1: seq starts at 1 after reset', () => {
    const user = factory.build()
    expect(user.name).toBe('author-1')
  })

  it('test 2: seq also starts at 1 (reset happened again)', () => {
    const user = factory.build()
    expect(user.name).toBe('author-1')
  })
})

describe('useFactory with cleanup', () => {
  const cleanup = vi.fn(async () => {})
  const factory = defineFactory(authors)
  useFactory(factory, { cleanup })

  it('cleanup is called after each test (verify in next test)', () => {
    // Trigger an action — cleanup will fire after this test ends
    factory.build()
    expect(true).toBe(true)
  })

  it('cleanup was called once after previous test', () => {
    expect(cleanup).toHaveBeenCalledTimes(1)
  })
})

describe('useSeeder', () => {
  const db = makeDb()
  const authorFactory = defineFactory(authors)
  const resetSpy = vi.fn(async () => {})

  const mockSeeder = {
    run: vi.fn(async () => ({ authors: [] })),
    reset: resetSpy,
  }

  useSeeder(mockSeeder)

  it('reset() called before first test', () => {
    expect(resetSpy).toHaveBeenCalledTimes(1)
    expect(db).toBeDefined()
    expect(authorFactory).toBeDefined()
  })

  it('reset() called before second test', () => {
    expect(resetSpy).toHaveBeenCalledTimes(2)
  })
})

describe('useSeeder with key filter', () => {
  const resetSpy = vi.fn(async () => {})

  const mockSeeder = {
    run: vi.fn(async () => ({ authors: [] })),
    reset: resetSpy,
  }

  useSeeder(mockSeeder, ['authors'])

  it('reset() called with key filter', () => {
    expect(resetSpy).toHaveBeenCalledWith(['authors'])
  })
})
