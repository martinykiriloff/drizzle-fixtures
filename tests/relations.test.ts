import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { defineFactory } from '../src/factory.js'
import type { Factory } from '../src/types.js'
import {
  authors,
  articles,
  comments,
  connections,
  nodeA,
  nodeB,
} from './fixtures/relations-schema.js'

function makeDb() {
  const sqlite = new Database(':memory:')
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS authors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author_id INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      body TEXT NOT NULL,
      author_id INTEGER NOT NULL,
      article_id INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_id INTEGER NOT NULL,
      to_id INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS node_a (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      b_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS node_b (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      a_id INTEGER
    );
  `)
  return drizzle(sqlite)
}

// 1. create() with use() — related record is inserted before the main record
it('create() with use() inserts the related record', async () => {
  const db = makeDb()
  const authorFactory = defineFactory(authors)
  const articleFactory = defineFactory(articles, {
    overrides: {
      authorId: ({ use, seq }) => use ? use(authorFactory).then(a => a.id) : seq,
    },
  })
  const article = await articleFactory.create(db)
  // First author inserted → autoincrement id = 1
  expect(article.authorId).toBe(1)
})

// 2. create() with use() — main record FK equals the related record PK
it('create() with use() — FK equals related record PK', async () => {
  const db = makeDb()
  const authorFactory = defineFactory(authors)
  let capturedAuthorId: number | undefined
  const articleFactory = defineFactory(articles, {
    overrides: {
      authorId: ({ use, seq }) => {
        if (use) {
          return use(authorFactory).then(a => {
            capturedAuthorId = a.id
            return a.id
          })
        }
        return seq
      },
    },
  })
  const article = await articleFactory.create(db)
  expect(capturedAuthorId).toBeDefined()
  expect(article.authorId).toBe(capturedAuthorId)
})

// 3. create() with use() — related factory seq increments independently
it('create() with use() — related factory seq increments per create', async () => {
  const db = makeDb()
  const authorFactory = defineFactory(authors)
  const articleFactory = defineFactory(articles, {
    overrides: {
      authorId: ({ use, seq }) => use ? use(authorFactory).then(a => a.id) : seq,
    },
  })
  const article1 = await articleFactory.create(db) // author id = 1
  const article2 = await articleFactory.create(db) // author id = 2
  expect(article1.authorId).toBe(1)
  expect(article2.authorId).toBe(2)
})

// 4. createList(3) with use() — creates 3 related records (one per main record)
it('createList() with use() creates one related record per item', async () => {
  const db = makeDb()
  const authorFactory = defineFactory(authors)
  const articleFactory = defineFactory(articles, {
    overrides: {
      authorId: ({ use, seq }) => use ? use(authorFactory).then(a => a.id) : seq,
    },
  })
  const list = await articleFactory.createList(db, 3)
  expect(list).toHaveLength(3)
  const authorIds = list.map(a => a.authorId)
  expect(new Set(authorIds).size).toBe(3)
})

// 5. build() with guarded use — returns seq fallback, no error
it('build() with guarded use() returns seq fallback synchronously', () => {
  const authorFactory = defineFactory(authors)
  const articleFactory = defineFactory(articles, {
    overrides: {
      authorId: ({ use, seq }) => use ? use(authorFactory).then(a => a.id) : seq,
    },
  })
  const article = articleFactory.build()
  expect(article.authorId).toBe(1)
})

// 6. build() with unguarded async use — throws helpful error containing "build() is synchronous"
it('build() with unguarded async use() throws synchronous error', () => {
  const authorFactory = defineFactory(authors)
  const articleFactory = defineFactory(articles, {
    overrides: {
      // async function without guard — returns Promise in build() context
      authorId: async ({ use }) => use!(authorFactory).then(a => a.id),
    },
  })
  expect(() => articleFactory.build()).toThrow('build() is synchronous')
})

// 7. create() with both use() and explicit static override — explicit wins, use() NOT called
it('call-site static override takes precedence over use() — use() not called', async () => {
  const db = makeDb()
  const authorFactory = defineFactory(authors)
  let useCallCount = 0
  const articleFactory = defineFactory(articles, {
    overrides: {
      authorId: ({ use, seq }) => {
        if (use) {
          useCallCount++
          return use(authorFactory).then(a => a.id)
        }
        return seq
      },
    },
  })
  await articleFactory.create(db, { authorId: 999 })
  expect(useCallCount).toBe(0)
})

// 8. create() with use() + call-site override for same field — call-site wins
it('call-site override for same field wins over use() in factory options', async () => {
  const db = makeDb()
  const authorFactory = defineFactory(authors)
  const articleFactory = defineFactory(articles, {
    overrides: {
      authorId: ({ use, seq }) => use ? use(authorFactory).then(a => a.id) : seq,
    },
  })
  const article = await articleFactory.create(db, { authorId: 42 })
  expect(article.authorId).toBe(42)
})

// 9. Two use() calls referencing different factories — both records inserted, both FKs correct
it('two use() calls to different factories both resolve correctly', async () => {
  const db = makeDb()
  const authorFactory = defineFactory(authors)
  const articleFactory = defineFactory(articles, {
    overrides: { authorId: 1 },
  })
  const commentFactory = defineFactory(comments, {
    overrides: {
      authorId:  ({ use, seq }) => use ? use(authorFactory).then(a => a.id) : seq,
      articleId: ({ use, seq }) => use ? use(articleFactory).then(a => a.id) : seq,
    },
  })
  const comment = await commentFactory.create(db)
  expect(comment.authorId).toBeGreaterThan(0)
  expect(comment.articleId).toBeGreaterThan(0)
})

// 10. Two use() calls to the same factory — two separate records (no deduplication)
it('two use() calls to same factory create two separate records', async () => {
  const db = makeDb()
  const authorFactory = defineFactory(authors)
  const connectionFactory = defineFactory(connections, {
    overrides: {
      fromId: ({ use, seq }) => use ? use(authorFactory).then(a => a.id) : seq,
      toId:   ({ use, seq }) => use ? use(authorFactory).then(a => a.id) : seq,
    },
  })
  const conn = await connectionFactory.create(db)
  expect(conn.fromId).not.toBe(conn.toId)
  expect(conn.fromId).toBe(1)
  expect(conn.toId).toBe(2)
})

// 11. Circular use() — A → B → A — throws error containing "Circular use() detected"
it('circular use() chain throws descriptive error', async () => {
  let factoryA: Factory<typeof nodeA>
  let factoryB: Factory<typeof nodeB>

  factoryA = defineFactory(nodeA, {
    overrides: {
      bId: ({ use, seq }) => use ? use(factoryB).then(b => b.id) : seq,
    },
  })
  factoryB = defineFactory(nodeB, {
    overrides: {
      aId: ({ use, seq }) => use ? use(factoryA).then(a => a.id) : seq,
    },
  })

  const db = makeDb()
  await expect(factoryA.create(db)).rejects.toThrow('Circular use() detected')
})

// 12. state() factory with use() override — use() resolves correctly in create()
describe('state() interaction', () => {
  it('state() factory with use() resolves related record in create()', async () => {
    const db = makeDb()
    const authorFactory = defineFactory(authors)
    const articleFactory = defineFactory(articles, {
      overrides: {
        authorId: ({ use, seq }) => use ? use(authorFactory).then(a => a.id) : seq,
      },
    })
    const draftFactory = articleFactory.state('draft', { title: 'Draft Article' })
    const article = await draftFactory.create(db)
    expect(article.title).toBe('Draft Article')
    expect(typeof article.authorId).toBe('number')
    expect(article.authorId).toBeGreaterThan(0)
  })
})
