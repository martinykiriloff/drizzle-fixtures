import { mysqlTable, int, varchar, boolean, datetime, mysqlEnum } from 'drizzle-orm/mysql-core'

export const orders = mysqlTable('orders', {
  id:        int('id').primaryKey().autoincrement(),
  email:     varchar('email', { length: 255 }).notNull(),
  status:    mysqlEnum('status', ['pending', 'paid', 'cancelled']).notNull().default('pending'),
  total:     int('total').notNull(),
  createdAt: datetime('created_at').notNull(),
})
