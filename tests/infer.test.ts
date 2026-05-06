import { describe, it, expect } from 'vitest'
import { getTypeDefault, SKIP } from '../src/infer.js'
import type { Column } from 'drizzle-orm'

function makeCol(overrides: Partial<{
  dataType: string
  columnType: string
  notNull: boolean
  hasDefault: boolean
  primary: boolean
  enumValues: string[] | undefined
  keyAsName: string
}>): Column {
  return {
    dataType: 'string',
    columnType: 'PgText',
    notNull: true,
    hasDefault: false,
    primary: false,
    enumValues: undefined,
    keyAsName: 'field',
    name: 'field',
    ...overrides,
  } as unknown as Column
}

describe('getTypeDefault', () => {
  it('serial primary key → SKIP', () => {
    expect(getTypeDefault(makeCol({ primary: true, dataType: 'number', columnType: 'PgSerial' }), 1)).toBe(SKIP)
  })

  it('autoincrement integer PK → SKIP', () => {
    expect(getTypeDefault(makeCol({ primary: true, dataType: 'number', columnType: 'SQLiteInteger' }), 1)).toBe(SKIP)
  })

  it('UUID primary key → valid UUID', () => {
    const val = getTypeDefault(makeCol({ primary: true, columnType: 'PgUUID', dataType: 'string' }), 1)
    expect(typeof val).toBe('string')
    expect(val as string).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('hasDefault non-PK field → SKIP', () => {
    expect(getTypeDefault(makeCol({ hasDefault: true, primary: false }), 1)).toBe(SKIP)
  })

  it('string column → text-{seq}', () => {
    expect(getTypeDefault(makeCol({ dataType: 'string', columnType: 'PgText' }), 3)).toBe('text-3')
  })

  it('integer column → seq', () => {
    expect(getTypeDefault(makeCol({ dataType: 'number', columnType: 'PgInteger', notNull: true }), 5)).toBe(5)
  })

  it('boolean column → true', () => {
    expect(getTypeDefault(makeCol({ dataType: 'boolean', columnType: 'PgBoolean' }), 1)).toBe(true)
  })

  it('timestamp column → Date', () => {
    const val = getTypeDefault(makeCol({ dataType: 'date', columnType: 'PgTimestamp' }), 1)
    expect(val).toBeInstanceOf(Date)
  })

  it('date column → ISO date string', () => {
    const val = getTypeDefault(makeCol({ dataType: 'date', columnType: 'PgDate' }), 1)
    expect(typeof val).toBe('string')
    expect(val as string).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('enum column → first enum value', () => {
    expect(getTypeDefault(makeCol({ enumValues: ['admin', 'editor', 'viewer'] }), 1)).toBe('admin')
  })

  it('nullable column with no match → null', () => {
    expect(getTypeDefault(makeCol({ dataType: 'string', columnType: 'PgText', notNull: false }), 1)).toBe('text-1')
  })

  it('json column → empty object', () => {
    expect(getTypeDefault(makeCol({ dataType: 'json', columnType: 'PgJsonb' }), 1)).toEqual({})
  })

  it('bigint column → BigInt', () => {
    const val = getTypeDefault(makeCol({ dataType: 'number', columnType: 'PgBigInt' }), 2)
    expect(typeof val).toBe('bigint')
    expect(val).toBe(BigInt(2))
  })

  it('decimal column → string', () => {
    const val = getTypeDefault(makeCol({ dataType: 'number', columnType: 'PgNumeric' }), 1)
    expect(typeof val).toBe('string')
    expect(val).toBe('10.00')
  })

  it('double precision column → seq * 1.5', () => {
    const val = getTypeDefault(makeCol({ dataType: 'number', columnType: 'PgDoublePrecision' }), 4)
    expect(val).toBe(6)
  })
})
