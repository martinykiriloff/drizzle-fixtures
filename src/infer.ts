import type { Column } from 'drizzle-orm'

export const SKIP = Symbol('drizzle-factory:skip')

export function getTypeDefault(column: Column, seq: number): unknown {
  const dataType = column.dataType as string
  const columnType = column.columnType as string
  const notNull = column.notNull
  const hasDefault = column.hasDefault
  const primary = column.primary
  const enumValues = column.enumValues as string[] | undefined

  // Primary key with auto-increment/serial → skip, DB handles it
  if (primary && (dataType === 'number' || /serial/i.test(columnType) || /autoincrement/i.test(columnType))) {
    return SKIP
  }

  // Primary key UUID → generate one
  if (primary && /uuid/i.test(columnType)) {
    return crypto.randomUUID()
  }

  // Has DB default and not PK → skip
  if (hasDefault && !primary) {
    return SKIP
  }

  // Enum values
  if (enumValues !== undefined && enumValues.length > 0) {
    return enumValues[0]
  }

  // UUID column (non-PK)
  if (/uuid/i.test(columnType)) {
    return crypto.randomUUID()
  }

  // Type dispatch
  if (dataType === 'string') {
    if (/date$/i.test(columnType)) {
      return new Date().toISOString().split('T')[0]
    }
    return `text-${seq}`
  }

  if (dataType === 'number') {
    if (/bigint/i.test(columnType)) {
      return BigInt(seq)
    }
    if (/numeric|decimal/i.test(columnType)) {
      return '10.00'
    }
    if (/double|real|float/i.test(columnType)) {
      return seq * 1.5
    }
    return seq
  }

  if (dataType === 'boolean') {
    return true
  }

  if (dataType === 'date') {
    if (/date$/i.test(columnType)) {
      return new Date().toISOString().split('T')[0]
    }
    return new Date()
  }

  if (dataType === 'json') {
    return {}
  }

  if (dataType === 'buffer') {
    return Buffer.from('')
  }

  if (!notNull) {
    return null
  }

  return `text-${seq}`
}
