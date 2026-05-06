import { pgTable, serial, text, varchar, integer, boolean, timestamp, uuid, pgEnum, jsonb } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['admin', 'editor', 'viewer'])

export const users = pgTable('users', {
  id:          serial('id').primaryKey(),
  email:       varchar('email', { length: 255 }).notNull().unique(),
  firstName:   text('first_name'),
  lastName:    text('last_name'),
  role:        roleEnum('role').notNull().default('viewer'),
  verified:    boolean('verified').notNull().default(false),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  deletedAt:   timestamp('deleted_at'),
  preferences: jsonb('preferences'),
  sessionId:   uuid('session_id').defaultRandom(),
  loginCount:  integer('login_count').notNull().default(0),
})

export const posts = pgTable('posts', {
  id:          serial('id').primaryKey(),
  title:       varchar('title', { length: 500 }).notNull(),
  slug:        varchar('slug', { length: 500 }).notNull().unique(),
  content:     text('content'),
  authorId:    integer('author_id').notNull(),
  published:   boolean('published').notNull().default(false),
  publishedAt: timestamp('published_at'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
})
