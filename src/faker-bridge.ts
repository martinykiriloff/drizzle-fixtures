import type { faker as FakerType } from '@faker-js/faker'

export type FakerInstance = typeof FakerType

let _faker: FakerInstance | null | undefined = undefined

export async function getFaker(): Promise<FakerInstance | null> {
  if (_faker !== undefined) return _faker
  try {
    const mod = await import('@faker-js/faker')
    _faker = mod.faker
  } catch {
    _faker = null
  }
  return _faker
}

export function getCachedFaker(): FakerInstance | null {
  return _faker ?? null
}

// Eagerly attempt to load faker when this module is imported
getFaker().catch(() => { _faker = null })
