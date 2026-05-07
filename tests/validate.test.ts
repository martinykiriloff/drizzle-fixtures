import { describe, it, expect } from 'vitest'
import { defineFactory } from '../src/factory.js'
import { items } from './fixtures/sqlite-schema.js'

describe('validate option', () => {
  it('validate: true + valid generated data passes silently', async () => {
    const factory = defineFactory(items, { validate: true })
    await factory.ready()
    expect(() => factory.build()).not.toThrow()
  })

  it('validate: true + invalid override throws', async () => {
    const factory = defineFactory(items, { validate: true })
    await factory.ready()
    expect(() => factory.build({ name: null as unknown as string })).toThrow()
  })

  it('error message contains table name', async () => {
    const factory = defineFactory(items, { validate: true })
    await factory.ready()
    let caught: unknown
    try {
      factory.build({ name: null as unknown as string })
    } catch (err) {
      caught = err
    }
    expect(String(caught)).toContain('items')
  })

  it('validate: false (default) — no validation, no throw for invalid value', () => {
    const factory = defineFactory(items)
    expect(() => factory.build({ name: null as unknown as string })).not.toThrow()
  })

  it('validate: true + valid call-site override passes', async () => {
    const factory = defineFactory(items, { validate: true })
    await factory.ready()
    expect(() => factory.build({ name: 'explicit name' })).not.toThrow()
  })

  it('validate: true + state() factory also validates', async () => {
    const base = defineFactory(items, { validate: true })
    const stated = base.state('named', { name: 'valid-state-name' })
    await stated.ready()
    expect(() => stated.build()).not.toThrow()
  })

  it('validate: true + invalid state override throws', async () => {
    const base = defineFactory(items, { validate: true })
    const stated = base.state('bad', { name: null as unknown as string })
    await stated.ready()
    expect(() => stated.build()).toThrow('[drizzle-fixtures] Validation failed')
  })
})
