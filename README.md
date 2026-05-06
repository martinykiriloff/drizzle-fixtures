# drizzle-fixtures

[![CI](https://github.com/martinykiriloff/drizzle-fixtures/actions/workflows/ci.yml/badge.svg)](https://github.com/martinykiriloff/drizzle-fixtures/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/drizzle-fixtures)](https://www.npmjs.com/package/drizzle-fixtures)
[![license](https://img.shields.io/github/license/martinykiriloff/drizzle-fixtures)](LICENSE)

Type-safe test data factories for [Drizzle ORM](https://orm.drizzle.team). 
Introspects your schema at runtime. Generates fully-typed fixture data. Zero configuration.

```ts
// Other factory libraries require you to map every field manually:
const usersFactory = defineFactory({
 table: 'users',
 resolver: ({ sequence }) => ({  // ← you write this for every column
  id: sequence,
  email: `user-${sequence}@example.com`,
  role: 'viewer',
  verified: false,
  createdAt: new Date(),
 }),
})

// drizzle-fixtures reads your schema and figures it out:
const userFactory = defineFactory(users) // ← that's it

const user = userFactory.build()         // InsertUser no DB needed
const admin = userFactory.build({ role: 'admin' }) // typed override
const saved = await userFactory.create(db)     // SelectUser inserts to DB
```

---

## Table of Contents

- [Why](#why)
- [vs @praha/drizzle-factory](#vs-prahadrizzle-factory)
- [Install](#install)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Related Records](#related-records)
- [Value Generation](#value-generation)
- [Faker.js Integration](#fakerjs-integration)
- [Supported Dialects](#supported-dialects)
- [TypeScript](#typescript)
- [How It Works](#how-it-works)
- [Contributing](#contributing)

---

## Why

Most test helpers require you to manually map every column to a fake value. drizzle-fixtures reads your Drizzle schema at runtime and generates sensible values automatically with full TypeScript inference.

| Feature | drizzle-fixtures |
|---------|----------------|
| Zero config setup | ✓ |
| Fully typed `build()` / `create()` | ✓ |
| Works without a database | ✓ |
| Optional faker.js for richer values | ✓ |
| Sequence counter for unique values | ✓ |
| Immutable state presets | ✓ |
| Zero runtime dependencies | ✓ |

---

## vs @praha/drizzle-factory

The main alternative is [`@praha/drizzle-factory`](https://github.com/praha-inc/drizzle-factory).
It is a solid library, but uses a different philosophy: you write a `resolver` function that explicitly maps every column to a value.

drizzle-fixtures takes the opposite approach schema introspection does the mapping for you.

| | drizzle-fixtures | @praha/drizzle-factory |
|---|---|---|
| Setup | Zero config | Manual resolver per table |
| Value inference | Automatic from schema | Manual |
| Faker.js | Auto-detected | Not built-in |
| Related records (`use()`) | ✓ | ✓ |
| Compose factories | Planned | ✓ |

**When to use drizzle-fixtures:** You want to get going fast with minimal boilerplate. 
**When to use @praha/drizzle-factory:** You want full explicit control over every generated value.

---

## Install

```bash
# npm
npm install --save-dev drizzle-fixtures

# pnpm
pnpm add -D drizzle-fixtures

# yarn
yarn add -D drizzle-fixtures

# bun
bun add -d drizzle-fixtures
```

**Peer dependencies**

```bash
# required already installed if you use Drizzle
npm install drizzle-orm

# optional enables richer generated values (see Faker.js section)
npm install --save-dev @faker-js/faker
```

**Requirements:** Node.js >= 18, Bun, or Deno (ESM-compatible runtimes).

---

## Quick Start

### 1. Define your schema (normal Drizzle)

```ts
// schema.ts
import { pgTable, serial, text, varchar, boolean, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
 id:  serial('id').primaryKey(),
 email:  varchar('email', { length: 255 }).notNull(),
 firstName: text('first_name'),
 role:  text('role').notNull().default('viewer'),
 verified: boolean('verified').notNull().default(false),
 createdAt: timestamp('created_at').notNull().defaultNow(),
})
```

### 2. Create a factory

```ts
// factories/user.ts
import { defineFactory } from 'drizzle-fixtures'
import { users } from '../schema'

export const userFactory = defineFactory(users)
```

### 3. Use in tests

```ts
import { userFactory } from './factories/user'
import { db } from './db'

// --- Build in-memory (no DB) ---
const user = userFactory.build()
// { email: 'user-1@example.com', firstName: 'John', ... }

const admin = userFactory.build({ role: 'admin' })
// overrides merge on top of generated values

const batch = userFactory.buildList(5)
// array of 5 InsertUser objects, seq 1–5

// --- Insert to DB ---
const saved = await userFactory.create(db)
// full SelectUser with id, createdAt, etc.

const records = await userFactory.createList(db, 3)
// 3 rows inserted, returns SelectUser[]
```

---

## API Reference

### `defineFactory(table, options?)`

Creates a factory. Call this once per table, typically in a `factories/` file.

```ts
import { defineFactory } from 'drizzle-fixtures'

const userFactory = defineFactory(users, {
 overrides: {
 // static value
 role: 'viewer',
 // or function receiving { seq }
 email: ({ seq }) => `user-${seq}@example.com`,
 },
})
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `overrides` | `Partial<Overrides<InsertUser>>` | Default field values or generator functions applied to every `build()` call |

---

### `factory.build(overrides?)`

Returns a typed insert object. Never touches the database. Increments the sequence counter.

```ts
const user = userFactory.build()
// InsertUser all required fields populated

const admin = userFactory.build({ role: 'admin' })
// call-site overrides merge on top of factory overrides

const custom = userFactory.build({
 email: ({ seq }) => `custom-${seq}@test.com`,
})
// override functions also work at call site
```

**Returns:** `typeof users.$inferInsert`

---

### `factory.buildList(n, overrides?)`

Returns an array of `n` objects. Sequence counter increments across all items.

```ts
const users = userFactory.buildList(5)
// seq: 1, 2, 3, 4, 5

const admins = userFactory.buildList(3, { role: 'admin' })
// all 3 get role: 'admin', seq continues from current value
```

**Returns:** `Array<typeof users.$inferInsert>`

---

### `factory.create(db, overrides?)`

Inserts one record and returns the full select result (including DB-generated fields like `id`, `createdAt`).

```ts
const user = await userFactory.create(db)
// SelectUser has id, defaulted fields, etc.

const admin = await userFactory.create(db, { role: 'admin' })
```

**Returns:** `Promise<typeof users.$inferSelect>`

> For MySQL (no `RETURNING` support), drizzle-fixtures automatically does an insert followed by a select by primary key.

---

### `factory.createList(db, n, overrides?)`

Inserts `n` records sequentially. Returns all rows.

```ts
const users = await userFactory.createList(db, 10)
// SelectUser[] 10 rows inserted
```

**Returns:** `Promise<Array<typeof users.$inferSelect>>`

---

### `factory.state(name, overrides)`

Returns a **new factory** with preset overrides merged on top. The original factory is not mutated.

```ts
const adminFactory = userFactory.state('admin', {
 role: 'admin',
 verified: true,
})

const admin = adminFactory.build()
// role: 'admin', verified: true plus auto-generated email, firstName, etc.

// States can be further overridden at build time
const superAdmin = adminFactory.build({ email: 'root@example.com' })

// States chain
const premiumAdmin = adminFactory.state('premium', { plan: 'pro' })
```

> State factories have their own independent sequence counters.

---

### `factory.resetSeq()`

Resets the internal sequence counter to 0. The next `build()` call will use seq 1.

```ts
userFactory.build() // seq 1
userFactory.build() // seq 2
userFactory.resetSeq()
userFactory.build() // seq 1 again
```

Useful in `beforeEach` when you want predictable seq values across tests:

```ts
beforeEach(() => {
 userFactory.resetSeq()
})
```

---

### `factory.ready()`

Waits for faker detection to complete. Returns immediately if faker is not installed.

```ts
const userFactory = defineFactory(users)
await userFactory.ready() // ensure faker is loaded before first build()
const user = userFactory.build() // guaranteed to use faker values if installed
```

`build()` without `await factory.ready()` works but may use deterministic values on the very first call if the async faker import hasn't resolved yet.

---

## Related Records

Use `use()` inside an override function to create a related record automatically when calling `create()`.

```ts
import { defineFactory } from 'drizzle-fixtures'
import { users, posts } from './schema'

const userFactory = defineFactory(users)

const postFactory = defineFactory(posts, {
 overrides: {
  // use is undefined in build() context guard with a ternary
  authorId: ({ use, seq }) =>
   use
    ? use(userFactory).then(u => u.id) // create() → inserts real user
    : seq,                // build() → uses seq as fallback
 },
})

// build() sync, no DB, authorId = seq value
const post = postFactory.build()

// create() inserts a user first, then inserts a post with the real user.id
const saved = await postFactory.create(db)
// saved.authorId === inserted user's real id
```

### How it works

- `use` is `undefined` in `build()` context and a live function in `create()` context
- Always guard: `use ? use(factory).then(...) : fallback`
- Each `use()` call creates a **new** related record no deduplication
- Circular `use()` chains (A → B → A) throw an error immediately

### Multiple relations

```ts
const commentFactory = defineFactory(comments, {
 overrides: {
  authorId: ({ use, seq }) => use ? use(userFactory).then(u => u.id) : seq,
  postId:  ({ use, seq }) => use ? use(postFactory).then(p => p.id) : seq,
 },
})

// Inserts: 1 user (for the post's author) + 1 user (for the comment's author) + 1 post + 1 comment
const comment = await commentFactory.create(db)
```

> **Note:** `use()` is not available in `build()` context because `build()` is synchronous and has no database connection. If you call `use()` in `build()` without guarding, a `TypeError` will be thrown. The guard pattern `use ? use(factory)... : fallback` handles both contexts cleanly.

---

## Value Generation

drizzle-fixtures uses a two-level system to generate values.

### Level 1 Semantic name heuristics

Checked first. Matches against the TypeScript field name (case-insensitive, substring match).

| Pattern | Generated value (no faker) |
|---------|---------------------------|
| `email` | `user-1@example.com` |
| `firstName`, `first_name` | `John` |
| `lastName`, `last_name` | `Doe` |
| `name` | `Entity 1` |
| `username` | `user_1` |
| `slug` | `slug-1` |
| `phone`, `phoneNumber` | `+15550000001` |
| `url`, `website` | `https://example-1.com` |
| `description`, `bio`, `content`, `body` | `Lorem ipsum dolor sit amet` |
| `title` | `Title 1` |
| `createdAt`, `created_at` | `new Date()` |
| `updatedAt`, `updated_at` | `new Date()` |
| `deletedAt`, `deleted_at` | `null` |
| `verified`, `isVerified`, `active`, `isActive`, `enabled` | `true` |
| `count`, `quantity`, `amount`, `total` | `seq` |
| `price`, `cost` | `seq * 10` |
| `order`, `position`, `rank`, `sort`, `index` | `seq` |
| `avatar`, `image`, `photo`, `picture`, `thumbnail` | `null` |
| `token`, `secret`, `hash`, `password` | `secret-1` |
| `code` | `CODE0001` |
| `city` | `City 1` |
| `country` | `US` |
| `address` | `1 Main St` |
| `zip`, `zipCode`, `postalCode` | `10001` |

### Level 2 Column type fallback

Used when no semantic match found.

| Data type | Column type examples | Generated value |
|-----------|---------------------|-----------------|
| `string` | PgText, PgVarchar, SQLiteText | `text-1` |
| `number` | PgInteger, MySqlInt | `seq` |
| `number` | PgBigInt, MySqlBigInt | `BigInt(seq)` |
| `number` | PgNumeric, PgDecimal | `"10.00"` |
| `number` | PgDoublePrecision, PgReal | `seq * 1.5` |
| `boolean` | PgBoolean, MySqlBoolean | `true` |
| `date` | PgTimestamp, MySqlDatetime | `new Date()` |
| `date` | PgDate, MySqlDate | `"2024-01-01"` |
| `string` | PgUUID | `crypto.randomUUID()` |
| `json` | PgJson, PgJsonb, MySqlJson | `{}` |
| `string` | PgEnum, MySqlEnum | first enum value |

### Skip conditions

These fields are omitted from `build()` output the database handles them:

- Serial / autoincrement primary keys (`id SERIAL PRIMARY KEY`, `id INTEGER AUTOINCREMENT`)
- Any column with a DB default (`defaultNow()`, `.default('viewer')`, `.defaultRandom()`, etc.) unless overridden

UUID primary keys are the exception drizzle-fixtures generates a `crypto.randomUUID()` for them.

---

## Faker.js Integration

Install `@faker-js/faker` and drizzle-fixtures detects it automatically at runtime. No configuration needed.

```bash
npm install --save-dev @faker-js/faker
```

When faker is available, semantic heuristics use realistic values:

| Pattern | Faker value |
|---------|-------------|
| `email` | `faker.internet.email()` |
| `firstName` | `faker.person.firstName()` |
| `lastName` | `faker.person.lastName()` |
| `name` | `faker.person.fullName()` |
| `username` | `faker.internet.username()` |
| `slug` | `faker.helpers.slugify(faker.lorem.words(2))` |
| `phone` | `faker.phone.number()` |
| `url`, `website` | `faker.internet.url()` |
| `description`, `bio`, `content`, `body` | `faker.lorem.paragraph()` |
| `title` | `faker.lorem.sentence(3)` |
| `avatar`, `image`, `photo` | `faker.image.avatar()` |
| `city` | `faker.location.city()` |
| `country` | `faker.location.country()` |
| `address` | `faker.location.streetAddress()` |
| `zip`, `postalCode` | `faker.location.zipCode()` |

> Faker is detected via a dynamic `import()` at module load time. If the package is not installed the import fails silently and drizzle-fixtures falls back to deterministic values. Call `await factory.ready()` before the first `build()` to guarantee faker values are used.

---

## Supported Dialects

| Dialect | Status | Notes |
|---------|--------|-------|
| PostgreSQL | Supported | Uses `RETURNING` for `create()` |
| SQLite | Supported | Uses `RETURNING` for `create()` |
| MySQL | Supported | Insert + select-by-PK (no `RETURNING`) |
| CockroachDB | Planned | Phase 2 |
| SingleStore / MSSQL | Backlog | Phase 3 |

---

## TypeScript

drizzle-fixtures is fully typed end-to-end. No `any`.

```ts
import { defineFactory } from 'drizzle-fixtures'
import { users } from './schema'

const factory = defineFactory(users)

// build() return type is exactly typeof users.$inferInsert
const user = factory.build()
// ^? { email: string; firstName: string | null; role: string; ... }

// create() return type is exactly typeof users.$inferSelect
const saved = await factory.create(db)
// ^? { id: number; email: string; createdAt: Date; ... }

// Overrides are typed wrong field types are a compile error
factory.build({ role: 123 })
//     ^^^ Type 'number' is not assignable to type 'string'
```

**Override function types:**

```ts
import type { BuildCtx, CreateCtx, FactoryCtx } from 'drizzle-fixtures'

// build() context use is always undefined
interface BuildCtx { seq: number; use: undefined }

// create() context use is a live async function
interface CreateCtx { seq: number; use: <T extends Table>(factory: Factory<T>) => Promise<InferSelectModel<T>> }

// union use when one function handles both contexts
type FactoryCtx = BuildCtx | CreateCtx

// FieldOverride accepts a static value, a sync function, or an async function
type FieldOverride<T> =
 | T
 | ((ctx: BuildCtx) => T)
 | ((ctx: FactoryCtx) => T | Promise<T>)
```

Override functions receive `BuildCtx` in `build()` and `CreateCtx` in `create()`. Use the `FactoryCtx` union when writing a single function that handles both:

```ts
// Typed override handles both build() and create() contexts
const postFactory = defineFactory(posts, {
 overrides: {
  authorId: ({ use, seq }: FactoryCtx) =>
   use ? use(userFactory).then(u => u.id) : seq,
 },
})
```

---

## How It Works

### Schema introspection

`defineFactory` calls `getTableColumns(table)` from `drizzle-orm` once at definition time. This returns an object whose keys are the TypeScript field names and values are column descriptors with `dataType`, `columnType`, `notNull`, `hasDefault`, `primary`, `enumValues`, and more.

### Build pipeline (per field, per `build()` call)

```
seq += 1
for each column:
 1. user override provided? → resolve sync (fn(BuildCtx) or static value) → use it
  └─ if override returns a Promise → throw (build() is synchronous)
 2. skip?  → serial PK or hasDefault (no override) → omit field
 3. semantic match? → name heuristic → use it
 4. type fallback  → dataType/columnType dispatch → use it
```

### Create pipeline (per field, per `create()` call)

```
seq += 1
build CreateCtx with live use() function
for each column (sequential respects FK insert order):
 1. user override provided? → await resolve (fn(CreateCtx) or static value)
  └─ fn may call use(relatedFactory) → triggers relatedFactory.create(db)
 2. skip?  → serial PK or hasDefault (no override) → omit field
 3. semantic match? → name heuristic → use it
 4. type fallback  → dataType/columnType dispatch → use it
insert resolved data → return full row (RETURNING or select-by-PK)
```

### Sequence counter

Each factory instance holds a closure variable `seq` starting at 0. It increments at the start of every `build()` and `create()` call. `buildList(n)` calls `build()` n times so seq increments continuously. Independent factories have independent counters.

### MySQL `create()` path

MySQL does not support `RETURNING`. drizzle-fixtures duck-types the insert query builder if `.returning` is not present as a function on the result of `.values()`, it falls back to:

1. Execute the insert
2. Find the primary key column from the table config
3. `SELECT * FROM table WHERE pk = insertedValue LIMIT 1`

### Faker detection

At module import time drizzle-fixtures fires `import('@faker-js/faker')` asynchronously and caches the result. `build()` is synchronous and reads the cached value `null` if faker is absent or not yet resolved.

---

## Contributing

Issues and PRs welcome. Please include a failing test case when reporting a bug.
