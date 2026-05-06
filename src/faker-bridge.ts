import type { faker as FakerType } from '@faker-js/faker'

export type FakerInstance = typeof FakerType

let _faker: FakerInstance | null | undefined = undefined
let _warnedOnce = false

export async function initFaker(): Promise<void> {
  if (_faker !== undefined) return
  try {
    const mod = await import('@faker-js/faker')
    _faker = mod.faker
  } catch {
    _faker = null
  }
}

export function getFaker(): FakerInstance | null {
  if (_faker === undefined && !_warnedOnce) {
    _warnedOnce = true
    console.warn(
      '[drizzle-fixtures] faker.js detected but not yet initialized. Call await factory.ready() first for faker-powered values.',
    )
  }
  return _faker ?? null
}

// Eagerly attempt to load faker when this module is imported
initFaker().catch(() => { _faker = null })
