import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { defineFactory } from '../src/factory.js'
import { composeFactory } from '../src/compose.js'
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

const authorFactory = defineFactory(authors)
const articleFactory = defineFactory(articles)

describe('composeFactory', () => {
  beforeEach(() => {
    authorFactory.resetSeq()
    articleFactory.resetSeq()
  })

  it('delegates build() to member factory', () => {
    const factory = composeFactory({ authors: authorFactory, articles: articleFactory })
    const author = factory.authors.build()
    expect(author).toMatchObject({ name: expect.any(String), email: expect.any(String) })
    expect(author).not.toHaveProperty('id')
  })

  it('delegates create() to member factory', async () => {
    const db = makeDb()
    const factory = composeFactory({ authors: authorFactory, articles: articleFactory })
    const author = await factory.authors.create(db)
    expect(author.id).toBeDefined()
    expect(typeof author.name).toBe('string')
  })

  it('resetSeq() resets all member factory sequences', () => {
    const seqFactory = defineFactory(authors, {
      overrides: { name: ({ seq }) => `author-${seq}` },
    })
    const factory = composeFactory({ authors: seqFactory, articles: articleFactory })
    factory.authors.build()
    factory.authors.build()
    factory.resetSeq()
    const afterReset = factory.authors.build()
    expect(afterReset.name).toBe('author-1')
  })

  it('member factory sequences are independent before resetSeq()', () => {
    const factory = composeFactory({ authors: authorFactory, articles: articleFactory })
    factory.resetSeq()
    const a1 = factory.authors.build()
    const a2 = factory.authors.build()
    const b1 = factory.articles.build()
    expect(a1.email).not.toBe(a2.email)
    expect(b1).toBeDefined()
  })

  it('buildList works through composed access', () => {
    const factory = composeFactory({ authors: authorFactory, articles: articleFactory })
    const list = factory.authors.buildList(3)
    expect(list).toHaveLength(3)
    expect(list[0]!.email).not.toBe(list[1]!.email)
  })

  it('state() works through composed access', () => {
    const factory = composeFactory({ authors: authorFactory, articles: articleFactory })
    const adminState = factory.authors.state('admin', { name: 'Admin User' })
    const admin = adminState.build()
    expect(admin.name).toBe('Admin User')
  })

  it('returns the same factory instances (reference equality)', () => {
    const factory = composeFactory({ authors: authorFactory, articles: articleFactory })
    expect(factory.authors).toBe(authorFactory)
    expect(factory.articles).toBe(articleFactory)
  })
})
