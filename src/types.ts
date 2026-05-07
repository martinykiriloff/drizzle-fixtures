import type { InferInsertModel, InferSelectModel, Table } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'

export type AnyDrizzleDb =
  | NodePgDatabase<Record<string, never>>
  | MySql2Database<Record<string, never>>
  | BetterSQLite3Database<Record<string, never>>

/** Context passed to override functions in build() — use is undefined */
export interface BuildCtx {
  seq: number
  use: undefined
}

/** Context passed to override functions in create() — use is a live function */
export interface CreateCtx {
  seq: number
  use: <TRelated extends Table>(factory: Factory<TRelated>) => Promise<InferSelectModel<TRelated>>
}

/** Union context — override functions receive one of these */
export type FactoryCtx = BuildCtx | CreateCtx

/** @deprecated Use BuildCtx or FactoryCtx */
export type FactoryContext = BuildCtx

export type FieldOverride<T> =
  | T
  | ((ctx: BuildCtx) => T)
  | ((ctx: FactoryCtx) => T | Promise<T>)

export type Overrides<TInsert> = {
  [K in keyof TInsert]?: FieldOverride<TInsert[K]>
}

export interface FactoryOptions<TInsert> {
  overrides?: Overrides<TInsert>
  batch?: 'auto' | 'always' | 'never'
  validate?: boolean
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

export type ComposedFactory<TFactories extends Record<string, Factory<Table>>> = {
  [K in keyof TFactories]: TFactories[K]
} & { resetSeq(): void }

export type SeedFn = () => Promise<unknown[]>

export interface SeedEntry {
  seed: SeedFn
  before?: () => Promise<void> | void
}

export interface Seeder<TSeeds extends Record<string, SeedFn>> {
  run(keys?: Array<keyof TSeeds>): Promise<{ [K in keyof TSeeds]: Awaited<ReturnType<TSeeds[K]>> }>
  reset(keys?: Array<keyof TSeeds>): Promise<void>
}
