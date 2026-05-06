import type { InferInsertModel, InferSelectModel, Table } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'

export type AnyDrizzleDb =
  | NodePgDatabase<Record<string, never>>
  | MySql2Database<Record<string, never>>
  | BetterSQLite3Database<Record<string, never>>

export interface FactoryContext {
  seq: number
}

export type FieldOverride<T> = T | ((ctx: FactoryContext) => T)

export type Overrides<TInsert> = {
  [K in keyof TInsert]?: FieldOverride<TInsert[K]>
}

export interface FactoryOptions<TInsert> {
  overrides?: Overrides<TInsert>
}

export interface Factory<TTable extends Table> {
  build(overrides?: Overrides<InferInsertModel<TTable>>): InferInsertModel<TTable>
  buildList(n: number, overrides?: Overrides<InferInsertModel<TTable>>): Array<InferInsertModel<TTable>>
  create(db: AnyDrizzleDb, overrides?: Overrides<InferInsertModel<TTable>>): Promise<InferSelectModel<TTable>>
  createList(db: AnyDrizzleDb, n: number, overrides?: Overrides<InferInsertModel<TTable>>): Promise<Array<InferSelectModel<TTable>>>
  state(name: string, overrides: Overrides<InferInsertModel<TTable>>): Factory<TTable>
  resetSeq(): void
  ready(): Promise<void>
}
