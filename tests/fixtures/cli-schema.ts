import { pgTable, serial, text, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id:        serial('id').primaryKey(),
  email:     varchar('email', { length: 255 }).notNull(),
  name:      text('name'),
  active:    boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const blog_posts = pgTable('blog_posts', {
  id:       serial('id').primaryKey(),
  title:    varchar('title', { length: 500 }).notNull(),
  authorId: integer('author_id').notNull(),
})
