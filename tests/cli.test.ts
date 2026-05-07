import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, rm, readFile, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { generate } from '../src/cli/generate.js'

const SCHEMA_PATH = resolve('./tests/fixtures/cli-schema.ts')

let outDir: string

beforeEach(async () => {
  outDir = join(tmpdir(), `drizzle-fixtures-cli-test-${Date.now()}`)
})

afterEach(async () => {
  await rm(outDir, { recursive: true, force: true })
})

describe('CLI generate', () => {
  it('generates one factory file per table found in schema', async () => {
    const files = await generate({ schema: SCHEMA_PATH, out: outDir })
    // 2 tables + 1 index file
    const factoryFiles = files.filter(f => f.path.endsWith('.factory.ts'))
    expect(factoryFiles).toHaveLength(2)
  })

  it('generated factory file contains correct import path to schema', async () => {
    const files = await generate({ schema: SCHEMA_PATH, out: outDir })
    const userFile = files.find(f => f.path.endsWith('user.factory.ts'))
    expect(userFile).toBeDefined()
    expect(userFile!.content).toContain("from '")
    expect(userFile!.content).toContain('cli-schema')
  })

  it('generated factory file contains correct factory variable name', async () => {
    const files = await generate({ schema: SCHEMA_PATH, out: outDir })
    const userFile = files.find(f => f.path.endsWith('user.factory.ts'))
    expect(userFile!.content).toContain('export const userFactory')
    expect(userFile!.content).toContain('defineFactory(users)')
  })

  it('--table filter generates only one factory', async () => {
    const files = await generate({ schema: SCHEMA_PATH, out: outDir, table: 'users' })
    const factoryFiles = files.filter(f => f.path.endsWith('.factory.ts'))
    expect(factoryFiles).toHaveLength(1)
    expect(factoryFiles[0]!.path).toContain('user.factory.ts')
  })

  it('dryRun: true returns content but writes no files', async () => {
    const files = await generate({ schema: SCHEMA_PATH, out: outDir, dryRun: true })
    expect(files.length).toBeGreaterThan(0)
    // output directory should not be created
    await expect(stat(outDir)).rejects.toThrow()
  })

  it('creates --out directory if it does not exist', async () => {
    const nested = join(outDir, 'deep', 'nested')
    await generate({ schema: SCHEMA_PATH, out: nested })
    const info = await stat(nested)
    expect(info.isDirectory()).toBe(true)
  })

  it('re-running overwrites existing files (idempotent)', async () => {
    await generate({ schema: SCHEMA_PATH, out: outDir })
    const files1 = await readFile(join(outDir, 'user.factory.ts'), 'utf8')
    await generate({ schema: SCHEMA_PATH, out: outDir })
    const files2 = await readFile(join(outDir, 'user.factory.ts'), 'utf8')
    expect(files1).toBe(files2)
  })

  it('generates index.ts barrel that exports all factories', async () => {
    const files = await generate({ schema: SCHEMA_PATH, out: outDir })
    const indexFile = files.find(f => f.path.endsWith('index.ts'))
    expect(indexFile).toBeDefined()
    expect(indexFile!.content).toContain('userFactory')
    expect(indexFile!.content).toContain('blogPostFactory')
  })

  it('snake_case table name → camelCase factory variable', async () => {
    const files = await generate({ schema: SCHEMA_PATH, out: outDir, table: 'blog_posts' })
    const factoryFile = files.find(f => f.path.endsWith('.factory.ts'))
    expect(factoryFile!.content).toContain('export const blogPostFactory')
  })

  it('snake_case table name → hyphen-case file name', async () => {
    const files = await generate({ schema: SCHEMA_PATH, out: outDir, table: 'blog_posts' })
    const factoryFile = files.find(f => f.path.endsWith('.factory.ts'))
    expect(factoryFile!.path).toContain('blog-post.factory.ts')
  })
})
