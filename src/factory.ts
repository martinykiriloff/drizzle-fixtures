import { getTableColumns, getTableName } from 'drizzle-orm'
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
  insert(table: Table): { values(data: Record<string, unknown> | Record<string, unknown>[]): RawInsertBuilder }
  select(): { from(table: Table): { where(cond: unknown): { limit(n: number): Promise<Record<string, unknown>[]> } & Promise<Record<string, unknown>[]> } }
}

function toRawDb(db: AnyDrizzleDb): RawDb {
  return db as unknown as RawDb
}

// Module-level set tracking factories currently being resolved (circular detection)
const _resolving = new Set<object>()

function isAsyncOverride(override: unknown): boolean {
  if (typeof override !== 'function') return false
  const sentinel: CreateCtx = { seq: 0, use: () => Promise.resolve({} as never) }
  try {
    const result = (override as (ctx: CreateCtx) => unknown)(sentinel)
    return result instanceof Promise
  } catch {
    return false
  }
}

export function defineFactory<TTable extends Table>(
  table: TTable,
  options?: FactoryOptions<InferInsertModel<TTable>>,
): Factory<TTable> {
  const columnMap = getTableColumns(table) as Record<string, Column>
  const columnEntries: Array<[string, Column]> = Object.entries(columnMap)
  const identity: object = {}

  let seq = 0
  const fakerPromise = initFaker()

  type InsertSchemaFn = (t: TTable) => {
    safeParse(data: unknown): {
      success: boolean
      error?: { issues: Array<{ path: (string | number)[]; message: string }> }
    }
  }
  let _createInsertSchema: InsertSchemaFn | null | undefined = undefined
  let _drizzleZodPromise: Promise<void> | null = null

  if (options?.validate) {
    _drizzleZodPromise = (async () => {
      try {
        const mod = await import('drizzle-zod')
        _createInsertSchema = mod.createInsertSchema as InsertSchemaFn
      } catch {
        _createInsertSchema = null
      }
    })()
  }

  function validateData(data: Record<string, unknown>): void {
    if (!options?.validate) return
    if (_createInsertSchema === null) {
      throw new Error(
        '[drizzle-fixtures] validate: true requires drizzle-zod to be installed.\n' +
        'Run: pnpm add -D drizzle-zod',
      )
    }
    if (_createInsertSchema === undefined) return
    const schema = _createInsertSchema(table)
    const parsed = schema.safeParse(data)
    if (!parsed.success && parsed.error) {
      const tableName = getTableName(table)
      throw new Error(
        `[drizzle-fixtures] Validation failed for table "${tableName}":\n` +
        parsed.error.issues
          .map(i => `  ${i.path.join('.')}: ${i.message}`)
          .join('\n'),
      )
    }
  }

  function buildDataForSeq(
    currentSeq: number,
    mergedOverrides: Record<string, unknown>,
  ): Record<string, unknown> {
    const buildCtx: BuildCtx = { seq: currentSeq, use: undefined }
    const faker = getFaker()
    const result: Record<string, unknown> = {}

    for (const [tsKey, col] of columnEntries) {
      if (tsKey in mergedOverrides && mergedOverrides[tsKey] !== undefined) {
        const override = mergedOverrides[tsKey]
        if (typeof override === 'function') {
          const resolved = (override as (ctx: BuildCtx) => unknown)(buildCtx)
          if (resolved instanceof Promise) {
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

      const typeVal = getTypeDefault(col, currentSeq)
      if (typeVal === SKIP) continue

      const semanticVal = getSemanticDefault(tsKey, currentSeq, faker)
      if (semanticVal !== undefined) {
        result[tsKey] = semanticVal
        continue
      }

      result[tsKey] = typeVal
    }

    validateData(result)
    return result
  }

  function build(callOverrides?: Overrides<InferInsertModel<TTable>>): InferInsertModel<TTable> {
    seq += 1
    const mergedOverrides = {
      ...options?.overrides,
      ...callOverrides,
    } as Record<string, unknown>
    return buildDataForSeq(seq, mergedOverrides) as InferInsertModel<TTable>
  }

  function buildList(
    n: number,
    callOverrides?: Overrides<InferInsertModel<TTable>>,
  ): Array<InferInsertModel<TTable>> {
    return Array.from({ length: n }, () => build(callOverrides))
  }

  async function ready(): Promise<void> {
    await fakerPromise
    if (_drizzleZodPromise) await _drizzleZodPromise
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

      if (_drizzleZodPromise) await _drizzleZodPromise
      validateData(data)
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
    await fakerPromise

    const batchMode = options?.batch ?? 'auto'
    const merged = {
      ...options?.overrides,
      ...callOverrides,
    } as Record<string, unknown>

    const hasAsync = Object.values(merged).some(isAsyncOverride)

    if (batchMode === 'always' && hasAsync) {
      throw new Error(
        '[drizzle-fixtures] batch: "always" set but an async use() override was detected. ' +
        'Remove the use() override or change batch to "auto".',
      )
    }

    const useSequential = batchMode === 'never' || (batchMode === 'auto' && hasAsync)

    if (useSequential) {
      const results: Array<InferSelectModel<TTable>> = []
      for (let i = 0; i < n; i++) {
        results.push(await create(db, callOverrides))
      }
      return results
    }

    // Bulk path — build all rows synchronously, then single INSERT
    const rows = Array.from({ length: n }, () => {
      seq += 1
      return buildDataForSeq(seq, merged)
    })

    const rawDb = toRawDb(db)
    const qb = rawDb.insert(table).values(rows)

    if (typeof qb.returning === 'function') {
      const inserted = await qb.returning()
      return inserted as Array<InferSelectModel<TTable>>
    }

    // MySQL / SingleStore — no RETURNING; select by PK values
    await new Promise<void>((resolve, reject) => {
      if (qb.then) {
        qb.then(() => resolve(), reject)
      } else {
        resolve()
      }
    })

    const pkEntry = columnEntries.find(([, col]) => col.primary)
    if (!pkEntry) throw new Error('drizzle-fixtures: no primary key for bulk select-after-insert')

    const [pkTsKey, pkCol] = pkEntry
    const pks = rows.map(r => r[pkTsKey]).filter(pk => pk !== undefined)

    if (pks.length === 0) {
      throw new Error(
        'drizzle-fixtures: bulk insert cannot retrieve rows — auto-increment PK not available before insert. ' +
        'Use batch: "never" with auto-increment MySQL tables.',
      )
    }

    const { inArray } = await import('drizzle-orm')
    const selected = await (rawDb
      .select()
      .from(table)
      .where(inArray(pkCol, pks as never[])) as unknown as Promise<Record<string, unknown>[]>)

    return selected as Array<InferSelectModel<TTable>>
  }

  function state(
    _name: string,
    stateOverrides: Overrides<InferInsertModel<TTable>>,
  ): Factory<TTable> {
    return defineFactory(table, {
      ...options,
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
