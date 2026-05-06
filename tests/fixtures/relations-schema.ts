import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

export const authors = sqliteTable('authors', {
  id:    integer('id').primaryKey({ autoIncrement: true }),
  name:  text('name').notNull(),
  email: text('email').notNull(),
})

export const articles = sqliteTable('articles', {
  id:       integer('id').primaryKey({ autoIncrement: true }),
  title:    text('title').notNull(),
  authorId: integer('author_id').notNull(),
})

export const comments = sqliteTable('comments', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  body:      text('body').notNull(),
  authorId:  integer('author_id').notNull(),
  articleId: integer('article_id').notNull(),
})

// Two FKs to the same table — used to test non-deduplication of use() calls
export const connections = sqliteTable('connections', {
  id:     integer('id').primaryKey({ autoIncrement: true }),
  fromId: integer('from_id').notNull(),
  toId:   integer('to_id').notNull(),
})

// Circular detection test tables
export const nodeA = sqliteTable('node_a', {
  id:  integer('id').primaryKey({ autoIncrement: true }),
  bId: integer('b_id'),
})

export const nodeB = sqliteTable('node_b', {
  id:  integer('id').primaryKey({ autoIncrement: true }),
  aId: integer('a_id'),
})
