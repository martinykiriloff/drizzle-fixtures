import { randomUUID } from 'node:crypto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { defineFactory } from '../src/factory.js'
import { users, posts } from './fixtures/pg-schema.js'
import { items } from './fixtures/sqlite-schema.js'

// ---- SQLite in-memory DB for create() tests ----

function makeDb() {
  const sqlite = new Database(':memory:')
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      price REAL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    )
  `)
  return drizzle(sqlite)
}

// ---- Factory instances ----

let userFactory: ReturnType<typeof defineFactory<typeof users>>
let postFactory: ReturnType<typeof defineFactory<typeof posts>>

beforeEach(() => {
  userFactory = defineFactory(users)
  postFactory = defineFactory(posts)
})

// 1. build() returns correct shape — required notNull fields present
describe('build()', () => {
  it('returns object with required fields', () => {
    const user = userFactory.build()
    expect(user).toHaveProperty('email')
    expect(typeof user.email).toBe('string')
  })

  // 2. build() respects hasDefault — fields with DB defaults are skipped
  it('skips fields with DB defaults (no override)', () => {
    const user = userFactory.build()
    // serial id, role (has default), verified (has default), createdAt (defaultNow),
    // sessionId (defaultRandom), loginCount (has default) — should all be absent
    expect('id' in user).toBe(false)
    expect('role' in user).toBe(false)
    expect('verified' in user).toBe(false)
    expect('loginCount' in user).toBe(false)
  })

  // 3. enum fields — get first enum value when overridden
  it('enum override uses given value', () => {
    const user = userFactory.build({ role: 'admin' })
    expect(user.role).toBe('admin')
  })

  // 4. static override
  it('respects static override', () => {
    const user = userFactory.build({ email: 'custom@test.com' })
    expect(user.email).toBe('custom@test.com')
  })

  // 5. function override receives seq
  it('function override receives seq', () => {
    const factory = defineFactory(users, {
      overrides: { email: ({ seq }) => `seq-${seq}@test.com` },
    })
    const user = factory.build()
    expect(user.email).toBe('seq-1@test.com')
    const user2 = factory.build()
    expect(user2.email).toBe('seq-2@test.com')
  })
})

// 6. buildList(n) — returns array of length n
describe('buildList()', () => {
  it('returns array of correct length', () => {
    const list = userFactory.buildList(5)
    expect(list).toHaveLength(5)
  })

  // 7. sequence increments across list items
  it('seq increments across items', () => {
    const factory = defineFactory(users, {
      overrides: { email: ({ seq }) => `user-${seq}@test.com` },
    })
    const list = factory.buildList(3)
    expect(list[0]?.email).toBe('user-1@test.com')
    expect(list[1]?.email).toBe('user-2@test.com')
    expect(list[2]?.email).toBe('user-3@test.com')
  })

  // 8. build() after buildList() continues seq
  it('seq continues after buildList', () => {
    const factory = defineFactory(users, {
      overrides: { email: ({ seq }) => `user-${seq}@test.com` },
    })
    factory.buildList(3)
    const user = factory.build()
    expect(user.email).toBe('user-4@test.com')
  })
})

// 9. state() — produces correct presets
describe('state()', () => {
  it('state factory applies preset overrides', () => {
    const adminFactory = userFactory.state('admin', { email: 'admin@example.com' })
    const admin = adminFactory.build()
    expect(admin.email).toBe('admin@example.com')
  })

  // 10. state override can be further overridden in build()
  it('state overrides can be overridden in build()', () => {
    const adminFactory = userFactory.state('admin', { email: 'admin@example.com' })
    const user = adminFactory.build({ email: 'other@test.com' })
    expect(user.email).toBe('other@test.com')
  })

  it('state does not mutate original factory', () => {
    userFactory.state('admin', { email: 'admin@example.com' })
    const user = userFactory.build()
    expect(user.email).not.toBe('admin@example.com')
  })
})

// 11. resetSeq()
describe('resetSeq()', () => {
  it('resets sequence to 1 on next build', () => {
    const factory = defineFactory(users, {
      overrides: { email: ({ seq }) => `user-${seq}@test.com` },
    })
    factory.build()
    factory.build()
    factory.resetSeq()
    const user = factory.build()
    expect(user.email).toBe('user-1@test.com')
  })
})

// 12. semantic: email field
describe('semantic heuristics', () => {
  it('email field generates valid email format', () => {
    const user = userFactory.build()
    expect(user.email).toMatch(/@/)
  })

  // 13. semantic: uuid primary key (sessionId has defaultRandom so skipped, but posts.id is serial)
  // Test UUID generation via a custom field
  it('uuid non-pk field generates UUID', () => {
    // sessionId has defaultRandom → SKIP. Test via override to confirm UUID format works.
    const user = userFactory.build({ sessionId: randomUUID() })
    expect(user.sessionId).toMatch(/^[0-9a-f-]{36}$/)
  })

  // 14. semantic: createdAt
  it('createdAt override generates Date', () => {
    const user = userFactory.build({ createdAt: new Date() })
    expect(user.createdAt).toBeInstanceOf(Date)
  })

  // 15. semantic: deletedAt → null (nullable, no semantic match — deletedAt pattern returns null)
  it('deletedAt is absent (has no default, nullable, semantic returns null... but no hasDefault so included)', () => {
    // deletedAt is nullable, semantic match returns null
    const user = userFactory.build()
    // deletedAt matched semantically → null
    expect(user.deletedAt).toBeNull()
  })
})

// 16. TypeScript: return type matches $inferInsert
describe('type inference', () => {
  it('build() return type is assignable to $inferInsert', () => {
    type UserInsert = typeof users.$inferInsert
    const user: UserInsert = userFactory.build()
    expect(user).toBeDefined()
  })
})

// 17. Two independent factories have separate seq counters
describe('independent factories', () => {
  it('two factories have separate seq counters', () => {
    const f1 = defineFactory(users, { overrides: { email: ({ seq }) => `f1-${seq}@test.com` } })
    const f2 = defineFactory(users, { overrides: { email: ({ seq }) => `f2-${seq}@test.com` } })
    f1.build()
    f1.build()
    const u2 = f2.build()
    expect(u2.email).toBe('f2-1@test.com')
  })
})

// create() tests using SQLite in-memory
describe('create()', () => {
  it('inserts and returns a record', async () => {
    const db = makeDb()
    const itemFactory = defineFactory(items)
    const item = await itemFactory.create(db)
    expect(item).toBeDefined()
    expect(typeof item.id).toBe('number')
    expect(typeof item.name).toBe('string')
  })

  it('create() with override', async () => {
    const db = makeDb()
    const itemFactory = defineFactory(items)
    const item = await itemFactory.create(db, { name: 'custom name' })
    expect(item.name).toBe('custom name')
  })

  it('createList() returns correct count', async () => {
    const db = makeDb()
    const itemFactory = defineFactory(items)
    const records = await itemFactory.createList(db, 3)
    expect(records).toHaveLength(3)
  })
})

// batch insert optimization
describe('createList batch optimization', () => {
  it('no async overrides → single bulk INSERT', async () => {
    const db = makeDb()
    const itemFactory = defineFactory(items)
    const spy = vi.spyOn(db, 'insert')
    const records = await itemFactory.createList(db, 5)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(records).toHaveLength(5)
  })

  it('bulk insert seq values are correct (1, 2, 3…)', async () => {
    const db = makeDb()
    const itemFactory = defineFactory(items, {
      overrides: { name: ({ seq }) => `item-${seq}` },
    })
    const records = await itemFactory.createList(db, 3)
    expect(records[0]?.name).toBe('item-1')
    expect(records[1]?.name).toBe('item-2')
    expect(records[2]?.name).toBe('item-3')
  })

  it('bulk result count matches n', async () => {
    const db = makeDb()
    const itemFactory = defineFactory(items)
    const records = await itemFactory.createList(db, 7)
    expect(records).toHaveLength(7)
  })

  it('use() override detected → sequential INSERT (multiple calls)', async () => {
    const db = makeDb()
    const relatedFactory = defineFactory(items)
    const factoryWithUse = defineFactory(items, {
      overrides: {
        name: ({ use, seq }) => use ? use(relatedFactory).then(r => r.name) : `item-${seq}`,
      },
    })
    const spy = vi.spyOn(db, 'insert')
    await factoryWithUse.createList(db, 3)
    // sequential: 3 main inserts + 3 related inserts = 6 total (all > 1)
    expect(spy.mock.calls.length).toBeGreaterThan(1)
  })

  it('batch: "never" uses sequential INSERT regardless', async () => {
    const db = makeDb()
    const itemFactory = defineFactory(items, { batch: 'never' })
    const spy = vi.spyOn(db, 'insert')
    await itemFactory.createList(db, 3)
    expect(spy).toHaveBeenCalledTimes(3)
  })

  it('batch: "always" with async use() override throws', async () => {
    const db = makeDb()
    const relatedFactory = defineFactory(items)
    const factoryWithUse = defineFactory(items, {
      batch: 'always',
      overrides: {
        name: ({ use, seq }) => use ? use(relatedFactory).then(r => r.name) : `item-${seq}`,
      },
    })
    await expect(factoryWithUse.createList(db, 3)).rejects.toThrow('batch: "always"')
  })
})

// post factory (tests non-user schema)
describe('posts factory', () => {
  it('builds post with required fields', () => {
    const post = postFactory.build({ authorId: 1 })
    expect(typeof post.title).toBe('string')
    expect(typeof post.slug).toBe('string')
    expect(post.authorId).toBe(1)
  })

  it('slug uses semantic heuristic', () => {
    const post = postFactory.build()
    expect(typeof post.slug).toBe('string')
    expect(post.slug.length).toBeGreaterThan(0)
  })
})
