import type { Table } from 'drizzle-orm'
import type { Factory, ComposedFactory } from './types.js'

export function composeFactory<T extends Record<string, Factory<Table>>>(
  factories: T,
): ComposedFactory<T> {
  const composed = { ...factories } as ComposedFactory<T>
  composed.resetSeq = () => {
    for (const factory of Object.values(factories)) {
      factory.resetSeq()
    }
  }
  return composed
}
