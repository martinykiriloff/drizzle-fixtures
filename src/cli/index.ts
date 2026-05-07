#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { generate } from './generate.js'

const { values } = parseArgs({
  options: {
    schema:    { type: 'string', short: 's' },
    out:       { type: 'string', short: 'o' },
    table:     { type: 'string', short: 't' },
    'dry-run': { type: 'boolean', default: false },
  },
  strict: true,
})

if (!values.schema) {
  console.error('Error: --schema is required')
  process.exit(1)
}

void (async () => {
  await generate({
    schema:  values.schema as string,
    dryRun:  values['dry-run'] ?? false,
    ...(values.out   !== undefined ? { out:   values.out   } : {}),
    ...(values.table !== undefined ? { table: values.table } : {}),
  })
})()
