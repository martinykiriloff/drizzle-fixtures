import { beforeEach, afterEach } from '@jest/globals'
import type { Table } from 'drizzle-orm'
import type { Factory, Seeder, SeedFn } from '../types.js'

export interface UseFactoryOptions {
  cleanup?: () => Promise<void> | void
}

export function useFactory<TTable extends Table>(
  factory: Factory<TTable>,
  options?: UseFactoryOptions,
): Factory<TTable> {
  beforeEach(() => { factory.resetSeq() })
  if (options?.cleanup) {
    afterEach(async () => { await options.cleanup!() })
  }
  return factory
}

export function useSeeder<TSeeds extends Record<string, SeedFn>>(
  seeder: Seeder<TSeeds>,
  keys?: Array<keyof TSeeds>,
): void {
  beforeEach(async () => { await seeder.reset(keys) })
}
