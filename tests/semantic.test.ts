import { describe, it, expect } from 'vitest'
import { getSemanticDefault } from '../src/semantic.js'

describe('getSemanticDefault (no faker)', () => {
  it('email → email pattern', () => {
    const val = getSemanticDefault('email', 1, null)
    expect(typeof val).toBe('string')
    expect(val as string).toMatch(/@/)
  })

  it('firstName → John', () => {
    expect(getSemanticDefault('firstName', 1, null)).toBe('John')
  })

  it('first_name → John', () => {
    expect(getSemanticDefault('first_name', 1, null)).toBe('John')
  })

  it('lastName → Doe', () => {
    expect(getSemanticDefault('lastName', 1, null)).toBe('Doe')
  })

  it('username → user_{seq}', () => {
    expect(getSemanticDefault('username', 3, null)).toBe('user_3')
  })

  it('name → Entity {seq}', () => {
    expect(getSemanticDefault('name', 2, null)).toBe('Entity 2')
  })

  it('slug → slug-{seq}', () => {
    expect(getSemanticDefault('slug', 1, null)).toBe('slug-1')
  })

  it('phone → phone pattern', () => {
    const val = getSemanticDefault('phone', 1, null)
    expect(typeof val).toBe('string')
    expect(val as string).toMatch(/^\+/)
  })

  it('url → https URL', () => {
    const val = getSemanticDefault('url', 1, null)
    expect(val as string).toMatch(/^https:\/\//)
  })

  it('description → lorem ipsum', () => {
    const val = getSemanticDefault('description', 1, null)
    expect(typeof val).toBe('string')
  })

  it('title → Title {seq}', () => {
    expect(getSemanticDefault('title', 5, null)).toBe('Title 5')
  })

  it('createdAt → Date instance', () => {
    expect(getSemanticDefault('createdAt', 1, null)).toBeInstanceOf(Date)
  })

  it('created_at → Date instance', () => {
    expect(getSemanticDefault('created_at', 1, null)).toBeInstanceOf(Date)
  })

  it('updatedAt → Date instance', () => {
    expect(getSemanticDefault('updatedAt', 1, null)).toBeInstanceOf(Date)
  })

  it('deletedAt → null', () => {
    expect(getSemanticDefault('deletedAt', 1, null)).toBeNull()
  })

  it('deleted_at → null', () => {
    expect(getSemanticDefault('deleted_at', 1, null)).toBeNull()
  })

  it('verified → true', () => {
    expect(getSemanticDefault('verified', 1, null)).toBe(true)
  })

  it('isActive → true', () => {
    expect(getSemanticDefault('isActive', 1, null)).toBe(true)
  })

  it('price → seq * 10', () => {
    expect(getSemanticDefault('price', 3, null)).toBe(30)
  })

  it('count → seq', () => {
    expect(getSemanticDefault('count', 7, null)).toBe(7)
  })

  it('token → secret-{seq}', () => {
    expect(getSemanticDefault('token', 2, null)).toBe('secret-2')
  })

  it('code → CODE{padded}', () => {
    expect(getSemanticDefault('code', 5, null)).toBe('CODE0005')
  })

  it('avatar → null (no faker)', () => {
    expect(getSemanticDefault('avatar', 1, null)).toBeNull()
  })

  it('unknown field → undefined', () => {
    expect(getSemanticDefault('xyzUnknownField', 1, null)).toBeUndefined()
  })

  it('id → undefined (no semantic match)', () => {
    expect(getSemanticDefault('id', 1, null)).toBeUndefined()
  })
})
