import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core'

export const items = sqliteTable('items', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  name:      text('name').notNull(),
  slug:      text('slug').notNull(),
  price:     real('price'),
  active:    integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const accounts = sqliteTable('accounts', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  email:     text('email').notNull(),
  username:  text('username').notNull(),
  token:     text('token'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})
