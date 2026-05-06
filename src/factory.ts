import { getTableColumns } from 'drizzle-orm'
import type { Column, InferInsertModel, InferSelectModel, Table } from 'drizzle-orm'
import { SKIP, getTypeDefault } from './infer.js'
import { getSemanticDefault } from './semantic.js'
import { initFaker, getFaker } from './faker-bridge.js'
import type { AnyDrizzleDb, BuildCtx, CreateCtx, Factory, FactoryOptions, Overrides } from './types.js'

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

// Module-level set tracking factories currently being resolved (circular detection)
const _resolving = new Set<object>()

export function defineFactory<TTable extends Table>(
  table: TTable,
  options?: FactoryOptions<InferInsertModel<TTable>>,
): Factory<TTable> {
  const columnMap = getTableColumns(table) as Record<string, Column>
  const columnEntries: Array<[string, Column]> = Object.entries(columnMap)
  const identity: object = {}

  let seq = 0
  const fakerPromise = initFaker()

  function build(callOverrides?: Overrides<InferInsertModel<TTable>>): InferInsertModel<TTable> {
    seq += 1
    const buildCtx: BuildCtx = { seq, use: undefined }
    const faker = getFaker()

    const mergedOverrides = {
      ...options?.overrides,
      ...callOverrides,
    } as Record<string, unknown>

    const result: Record<string, unknown> = {}

    for (const [tsKey, col] of columnEntries) {
      if (tsKey in mergedOverrides && mergedOverrides[tsKey] !== undefined) {
        const override = mergedOverrides[tsKey]
        if (typeof override === 'function') {
          const resolved = (override as (ctx: BuildCtx) => unknown)(buildCtx)
          if (resolved instanceof Promise) {
            // Suppress the unhandled rejection before throwing the sync error
            resolved.catch(() => undefined)
            throw new Error(
              `[drizzle-fixtures] Override for field "${tsKey}" returned a Promise in build() context. ` +
              `build() is synchronous. Guard your use() call: ({ use, seq }) => use ? use(factory).then(...) : seq`,
            )
          }
          result[tsKey] = resolved
        } else {
          result[tsKey] = override
        }
        continue
      }

      const typeVal = getTypeDefault(col, seq)
      if (typeVal === SKIP) continue

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

  async function ready(): Promise<void> {
    await fakerPromise
  }

  async function insertRow(
    db: AnyDrizzleDb,
    data: Record<string, unknown>,
  ): Promise<InferSelectModel<TTable>> {
    const rawDb = toRawDb(db)
    const valuesQb = rawDb.insert(table).values(data)

    if (typeof valuesQb.returning === 'function') {
      const rows = await valuesQb.returning()
      const row = rows[0]
      if (!row) throw new Error('drizzle-fixtures: insert returned no rows')
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
    if (!pkEntry) throw new Error('drizzle-fixtures: cannot find primary key for select-after-insert')

    const [pkTsKey, pkCol] = pkEntry
    const pkValue = data[pkTsKey]

    const { eq } = await import('drizzle-orm')
    const rows = await rawDb
      .select()
      .from(table)
      .where(eq(pkCol, pkValue as Column))
      .limit(1)

    const row = rows[0]
    if (!row) throw new Error('drizzle-fixtures: select after insert returned no rows')
    return row as InferSelectModel<TTable>
  }

  async function create(
    db: AnyDrizzleDb,
    callOverrides?: Overrides<InferInsertModel<TTable>>,
  ): Promise<InferSelectModel<TTable>> {
    await fakerPromise

    if (_resolving.has(identity)) {
      throw new Error(
        '[drizzle-fixtures] Circular use() detected. ' +
        'Factory is already being resolved in this call chain.',
      )
    }
    _resolving.add(identity)

    try {
      seq += 1
      const faker = getFaker()

      const createCtx: CreateCtx = {
        seq,
        use: async <TRelated extends Table>(relatedFactory: Factory<TRelated>) => {
          return relatedFactory.create(db)
        },
      }

      const mergedOverrides = {
        ...options?.overrides,
        ...callOverrides,
      } as Record<string, unknown>

      const data: Record<string, unknown> = {}

      for (const [tsKey, col] of columnEntries) {
        if (tsKey in mergedOverrides && mergedOverrides[tsKey] !== undefined) {
          const override = mergedOverrides[tsKey]
          if (typeof override === 'function') {
            data[tsKey] = await Promise.resolve(
              (override as (ctx: CreateCtx) => unknown)(createCtx),
            )
          } else {
            data[tsKey] = override
          }
          continue
        }

        const typeVal = getTypeDefault(col, seq)
        if (typeVal === SKIP) continue

        const semanticVal = getSemanticDefault(tsKey, seq, faker)
        if (semanticVal !== undefined) {
          data[tsKey] = semanticVal
          continue
        }

        data[tsKey] = typeVal
      }

      return await insertRow(db, data)
    } finally {
      _resolving.delete(identity)
    }
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

  return { build, buildList, create, createList, state, resetSeq, ready }
}
