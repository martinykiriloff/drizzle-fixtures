import { getTableColumns } from 'drizzle-orm'
import type { Column, InferInsertModel, InferSelectModel, Table } from 'drizzle-orm'
import { SKIP, getTypeDefault } from './infer.js'
import { getSemanticDefault } from './semantic.js'
import { getFaker, getCachedFaker } from './faker-bridge.js'
import type { AnyDrizzleDb, Factory, FactoryContext, FactoryOptions, Overrides } from './types.js'

// Minimal internal DB interface for duck-typed operations
interface RawInsertBuilder {
  returning?: () => Promise<Record<string, unknown>[]>
  then?: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => void
}

interface RawDb {
  insert(table: Table): { values(data: Record<string, unknown>): RawInsertBuilder }
  select(): { from(table: Table): { where(cond: unknown): { limit(n: number): Promise<Record<string, unknown>[]> } } }
}

function toRawDb(db: AnyDrizzleDb): RawDb {
  return db as unknown as RawDb
}

function resolveOverride<T>(
  override: T | ((ctx: FactoryContext) => T),
  ctx: FactoryContext,
): T {
  if (typeof override === 'function') {
    return (override as (ctx: FactoryContext) => T)(ctx)
  }
  return override
}

export function defineFactory<TTable extends Table>(
  table: TTable,
  options?: FactoryOptions<InferInsertModel<TTable>>,
): Factory<TTable> {
  const columnMap = getTableColumns(table) as Record<string, Column>
  const columnEntries: Array<[string, Column]> = Object.entries(columnMap)

  let seq = 0

  // Pre-load faker eagerly
  getFaker().catch(() => undefined)

  function build(callOverrides?: Overrides<InferInsertModel<TTable>>): InferInsertModel<TTable> {
    seq += 1
    const ctx: FactoryContext = { seq }
    const faker = getCachedFaker()

    const mergedOverrides = {
      ...options?.overrides,
      ...callOverrides,
    } as Record<string, unknown>

    const result: Record<string, unknown> = {}

    for (const [tsKey, col] of columnEntries) {
      // User override takes priority
      if (tsKey in mergedOverrides && mergedOverrides[tsKey] !== undefined) {
        result[tsKey] = resolveOverride(
          mergedOverrides[tsKey] as unknown | ((ctx: FactoryContext) => unknown),
          ctx,
        )
        continue
      }

      // Type-based skip check first (serial PKs, hasDefault fields)
      const typeVal = getTypeDefault(col, seq)
      if (typeVal === SKIP) {
        continue
      }

      // Semantic name check
      const semanticVal = getSemanticDefault(tsKey, seq, faker)
      if (semanticVal !== undefined) {
        result[tsKey] = semanticVal
        continue
      }

      result[tsKey] = typeVal
    }

    return result as InferInsertModel<TTable>
  }

  function buildList(
    n: number,
    callOverrides?: Overrides<InferInsertModel<TTable>>,
  ): Array<InferInsertModel<TTable>> {
    return Array.from({ length: n }, () => build(callOverrides))
  }

  async function create(
    db: AnyDrizzleDb,
    callOverrides?: Overrides<InferInsertModel<TTable>>,
  ): Promise<InferSelectModel<TTable>> {
    await getFaker()
    const data = build(callOverrides)
    const rawDb = toRawDb(db)

    const valuesQb = rawDb.insert(table).values(data as Record<string, unknown>)

    // Duck-type RETURNING support: PG and SQLite have it, MySQL does not
    if (typeof valuesQb.returning === 'function') {
      const rows = await valuesQb.returning()
      const row = rows[0]
      if (!row) throw new Error('drizzle-factory: insert returned no rows')
      return row as InferSelectModel<TTable>
    }

    // MySQL path: insert then select by PK
    await new Promise<void>((resolve, reject) => {
      if (valuesQb.then) {
        valuesQb.then(() => resolve(), reject)
      } else {
        resolve()
      }
    })

    const pkEntry = columnEntries.find(([, col]) => col.primary)
    if (!pkEntry) throw new Error('drizzle-factory: cannot find primary key for select-after-insert')

    const [pkTsKey, pkCol] = pkEntry
    const pkValue = (data as Record<string, unknown>)[pkTsKey]

    const { eq } = await import('drizzle-orm')
    const rows = await rawDb
      .select()
      .from(table)
      .where(eq(pkCol, pkValue as Column))
      .limit(1)

    const row = rows[0]
    if (!row) throw new Error('drizzle-factory: select after insert returned no rows')
    return row as InferSelectModel<TTable>
  }

  async function createList(
    db: AnyDrizzleDb,
    n: number,
    callOverrides?: Overrides<InferInsertModel<TTable>>,
  ): Promise<Array<InferSelectModel<TTable>>> {
    const results: Array<InferSelectModel<TTable>> = []
    for (let i = 0; i < n; i++) {
      results.push(await create(db, callOverrides))
    }
    return results
  }

  function state(
    _name: string,
    stateOverrides: Overrides<InferInsertModel<TTable>>,
  ): Factory<TTable> {
    return defineFactory(table, {
      overrides: {
        ...options?.overrides,
        ...stateOverrides,
      } as Overrides<InferInsertModel<TTable>>,
    })
  }

  function resetSeq(): void {
    seq = 0
  }

  return { build, buildList, create, createList, state, resetSeq }
}
