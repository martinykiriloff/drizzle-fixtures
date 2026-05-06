import { describe, it, expect, vi } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { defineFactory } from '../src/factory.js'
import { defineSeeder } from '../src/seeder.js'
import { authors, articles } from './fixtures/relations-schema.js'

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
  `)
  return drizzle(sqlite)
}

describe('defineSeeder', () => {
  it('run() executes all seeds and returns results', async () => {
    const db = makeDb()
    const authorFactory = defineFactory(authors)
    const articleFactory = defineFactory(articles)

    const seeder = defineSeeder(db, {
      authors: () => authorFactory.createList(db, 2),
      articles: () => articleFactory.createList(db, 3, { authorId: 1 }),
    })

    const result = await seeder.run()
    expect(result.authors).toHaveLength(2)
    expect(result.articles).toHaveLength(3)
  })

  it('run() returns typed result with all outputs', async () => {
    const db = makeDb()
    const authorFactory = defineFactory(authors)
    const seeder = defineSeeder(db, {
      authors: () => authorFactory.createList(db, 1),
    })
    const result = await seeder.run()
    expect(result.authors[0]!.id).toBeDefined()
    expect(typeof result.authors[0]!.name).toBe('string')
  })

  it('run([key]) runs only specified seeds', async () => {
    const db = makeDb()
    const authorFactory = defineFactory(authors)
    const articleFactory = defineFactory(articles)
    const articleSeed = vi.fn(async () => articleFactory.createList(db, 2, { authorId: 1 }))

    const seeder = defineSeeder(db, {
      authors: () => authorFactory.createList(db, 2),
      articles: articleSeed,
    })

    const result = await seeder.run(['authors'])
    expect(result.authors).toHaveLength(2)
    expect(articleSeed).not.toHaveBeenCalled()
    expect(result).not.toHaveProperty('articles')
  })

  it('run([keys]) respects definition order not key array order', async () => {
    const db = makeDb()
    const order: string[] = []
    const authorFactory = defineFactory(authors)
    const articleFactory = defineFactory(articles)

    const seeder = defineSeeder(db, {
      authors: async () => { order.push('authors'); return authorFactory.createList(db, 1) },
      articles: async () => { order.push('articles'); return articleFactory.createList(db, 1, { authorId: 1 }) },
    })

    await seeder.run(['articles', 'authors'])
    expect(order).toEqual(['authors', 'articles'])
  })

  it('reset() calls before hooks then re-seeds', async () => {
    const db = makeDb()
    const authorFactory = defineFactory(authors)
    const beforeHook = vi.fn(async () => { /* truncate */ })

    const seeder = defineSeeder(db, {
      authors: {
        seed: () => authorFactory.createList(db, 2),
        before: beforeHook,
      },
    })

    await seeder.reset()
    expect(beforeHook).toHaveBeenCalledOnce()
  })

  it('reset([key]) only resets specified seeds', async () => {
    const db = makeDb()
    const authorFactory = defineFactory(authors)
    const articleFactory = defineFactory(articles)
    const authorBefore = vi.fn(async () => {})
    const articleBefore = vi.fn(async () => {})

    const seeder = defineSeeder(db, {
      authors: { seed: () => authorFactory.createList(db, 1), before: authorBefore },
      articles: { seed: () => articleFactory.createList(db, 1, { authorId: 1 }), before: articleBefore },
    })

    await seeder.reset(['authors'])
    expect(authorBefore).toHaveBeenCalledOnce()
    expect(articleBefore).not.toHaveBeenCalled()
  })

  it('seed with no before hook: reset() skips hook silently', async () => {
    const db = makeDb()
    const authorFactory = defineFactory(authors)

    const seeder = defineSeeder(db, {
      authors: () => authorFactory.createList(db, 1),
    })

    await expect(seeder.reset()).resolves.not.toThrow()
  })

  it('later seeds can reference earlier seed results via closure', async () => {
    const db = makeDb()
    const authorFactory = defineFactory(authors)
    const articleFactory = defineFactory(articles)
    let createdAuthorId = 0

    const seeder = defineSeeder(db, {
      authors: async () => {
        const list = await authorFactory.createList(db, 1)
        createdAuthorId = list[0]!.id
        return list
      },
      articles: () => articleFactory.createList(db, 2, { authorId: createdAuthorId }),
    })

    const result = await seeder.run()
    expect(result.articles[0]!.authorId).toBe(createdAuthorId)
    expect(result.articles[1]!.authorId).toBe(createdAuthorId)
  })

  it('shorthand and object-form seeds can be mixed', async () => {
    const db = makeDb()
    const authorFactory = defineFactory(authors)
    const articleFactory = defineFactory(articles)
    const beforeHook = vi.fn(async () => {})

    const seeder = defineSeeder(db, {
      authors: {
        seed: () => authorFactory.createList(db, 1),
        before: beforeHook,
      },
      articles: () => articleFactory.createList(db, 1, { authorId: 1 }),
    })

    const result = await seeder.run()
    expect(result.authors).toHaveLength(1)
    expect(result.articles).toHaveLength(1)
    expect(beforeHook).not.toHaveBeenCalled()
  })
})
