import type { AnyDrizzleDb, Seeder, SeedFn, SeedEntry } from './types.js'

type SeedInput = SeedFn | SeedEntry

function normalize(input: SeedInput): SeedEntry {
  return typeof input === 'function' ? { seed: input } : input
}

export function defineSeeder<TSeeds extends Record<string, SeedFn>>(
  _db: AnyDrizzleDb,
  seeds: { [K in keyof TSeeds]: SeedInput },
): Seeder<TSeeds> {
  const keys = Object.keys(seeds) as Array<keyof TSeeds>

  async function run(filter?: Array<keyof TSeeds>) {
    const toRun = filter
      ? keys.filter(k => filter.includes(k))
      : keys
    const result = {} as { [K in keyof TSeeds]: Awaited<ReturnType<TSeeds[K]>> }
    for (const key of toRun) {
      const entry = normalize(seeds[key])
      result[key] = (await entry.seed()) as Awaited<ReturnType<TSeeds[typeof key]>>
    }
    return result
  }

  async function reset(filter?: Array<keyof TSeeds>) {
    const toRun = filter
      ? keys.filter(k => filter.includes(k))
      : keys
    for (const key of toRun) {
      const entry = normalize(seeds[key])
      if (entry.before) await entry.before()
    }
    await run(filter)
  }

  return { run, reset }
}
