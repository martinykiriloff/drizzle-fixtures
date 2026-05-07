# drizzle-fixtures

[![CI](https://github.com/martinykiriloff/drizzle-fixtures/actions/workflows/ci.yml/badge.svg)](https://github.com/martinykiriloff/drizzle-fixtures/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/drizzle-fixtures)](https://www.npmjs.com/package/drizzle-fixtures)
[![license](https://img.shields.io/github/license/martinykiriloff/drizzle-fixtures)](LICENSE)

📖 **[Documentation](https://martinykiriloff.github.io/drizzle-fixtures/)** — full API reference and guides

Type-safe test data factories for [Drizzle ORM](https://orm.drizzle.team).  
Introspects your schema at runtime. Generates fully-typed fixture data. Zero configuration.

```ts
// Other factory libraries require you to map every field manually:
const usersFactory = defineFactory({
  table: 'users',
  resolver: ({ sequence }) => ({    // ← you write this for every column
    id: sequence,
    email: `user-${sequence}@example.com`,
    role: 'viewer',
    verified: false,
    createdAt: new Date(),
  }),
})

// drizzle-fixtures reads your schema and figures it out:
const userFactory = defineFactory(users)  // ← that's it

const user  = userFactory.build()                  // InsertUser   no DB needed
const admin = userFactory.build({ role: 'admin' }) // typed override
const saved = await userFactory.create(db)         // SelectUser   inserts to DB
```

---

## Table of Contents

- [Why](#why)
- [vs @praha/drizzle-factory](#vs-prahadrizzle-factory)
- [Install](#install)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Related Records](#related-records)
- [Composing Factories](#composing-factories)
- [Seeding](#seeding)
- [Test Framework Integration](#test-framework-integration)
- [Value Generation](#value-generation)
- [Faker.js Integration](#fakerjs-integration)
- [Supported Dialects](#supported-dialects)
- [TypeScript](#typescript)
- [How It Works](#how-it-works)
- [Contributing](#contributing)

---

## Why

Most test helpers require you to manually map every column to a fake value. drizzle-fixtures reads your Drizzle schema at runtime and generates sensible values automatically   with full TypeScript inference and zero configuration.

| Feature | drizzle-fixtures |
| --- | --- |
| Zero config setup | ✓ |
| Fully typed `build()` / `create()` | ✓ |
| Works without a database | ✓ |
| Related records via `use()` | ✓ |
| Compose factories | ✓ |
| DB seeding with `defineSeeder` | ✓ |
| Vitest & Jest helpers | ✓ |
| Optional faker.js for richer values | ✓ |
| Sequence counter for unique values | ✓ |
| Immutable state presets | ✓ |
| Zero runtime dependencies | ✓ |

---

## vs @praha/drizzle-factory

The main alternative is [`@praha/drizzle-factory`](https://github.com/praha-inc/drizzle-factory). It is a solid library, but uses a different philosophy: you write a `resolver` function that explicitly maps every column to a value.

drizzle-fixtures takes the opposite approach   schema introspection does the mapping for you.

| | drizzle-fixtures | @praha/drizzle-factory |
|---|---|---|
| Setup | Zero config | Manual resolver per table |
| Value inference | Automatic from schema | Manual |
| Faker.js | Auto-detected | Not built-in |
| Related records | ✓ `use()` | ✓ `use()` |
| Compose factories | ✓ `composeFactory` | ✓ `composeFactory` |
| DB seeding | ✓ `defineSeeder` | ✗ |
| Test framework helpers | ✓ Vitest + Jest | ✗ |
| CockroachDB / SingleStore | ✓ | ✗ |

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
# required   already installed if you use Drizzle
npm install drizzle-orm

# optional   enables richer generated values (see Faker.js section)
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
  id:        serial('id').primaryKey(),
  email:     varchar('email', { length: 255 }).notNull(),
  firstName: text('first_name'),
  role:      text('role').notNull().default('viewer'),
  verified:  boolean('verified').notNull().default(false),
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

// Build in-memory (no DB)
const user  = userFactory.build()
// { email: 'user-1@example.com', firstName: 'John', ... }

const admin = userFactory.build({ role: 'admin' })
const batch = userFactory.buildList(5)

// Insert to DB
const saved   = await userFactory.create(db)
const records = await userFactory.createList(db, 3)
```

---

## API Reference

### `defineFactory(table, options?)`

Creates a factory. Call this once per table, typically in a `factories/` file.

```ts
import { defineFactory } from 'drizzle-fixtures'

const userFactory = defineFactory(users, {
  overrides: {
    role:  'viewer',
    email: ({ seq }) => `user-${seq}@example.com`,
  },
})
```

| Option | Type | Description |
| --- | --- | --- |
| `overrides` | `Overrides<InsertUser>` | Default field values or generator functions applied to every `build()` |

---

### `factory.build(overrides?)`

Returns a typed insert object. Never touches the database. Increments the sequence counter.

```ts
const user   = userFactory.build()
const admin  = userFactory.build({ role: 'admin' })
const custom = userFactory.build({
  email: ({ seq }) => `custom-${seq}@test.com`,
})
```

**Returns:** `typeof users.$inferInsert`

---

### `factory.buildList(n, overrides?)`

Returns an array of `n` objects. Sequence counter increments across all items.

```ts
const users  = userFactory.buildList(5)
const admins = userFactory.buildList(3, { role: 'admin' })
```

**Returns:** `Array<typeof users.$inferInsert>`

---

### `factory.create(db, overrides?)`

Inserts one record and returns the full select result (including DB-generated fields like `id`, `createdAt`).

```ts
const user  = await userFactory.create(db)
const admin = await userFactory.create(db, { role: 'admin' })
```

**Returns:** `Promise<typeof users.$inferSelect>`

> For MySQL and SingleStore (no `RETURNING`), drizzle-fixtures automatically does an insert followed by a select by primary key.

---

### `factory.createList(db, n, overrides?)`

Inserts `n` records sequentially. Returns all rows.

```ts
const users = await userFactory.createList(db, 10)
```

**Returns:** `Promise<Array<typeof users.$inferSelect>>`

---

### `factory.state(name, overrides)`

Returns a **new factory** with preset overrides merged on top. The original factory is not mutated.

```ts
const adminFactory = userFactory.state('admin', {
  role:     'admin',
  verified: true,
})

const admin      = adminFactory.build()
const superAdmin = adminFactory.build({ email: 'root@example.com' })

// States chain
const premiumAdmin = adminFactory.state('premium', { plan: 'pro' })
```

> State factories have their own independent sequence counters.

---

### `factory.resetSeq()`

Resets the internal sequence counter to 0. The next `build()` call will use seq 1.

```ts
userFactory.build()  // seq 1
userFactory.build()  // seq 2
userFactory.resetSeq()
userFactory.build()  // seq 1 again
```

---

### `factory.ready()`

Resolves when faker.js detection is complete. Optional but recommended if you want guaranteed faker values on the first `build()` call.

```ts
const userFactory = defineFactory(users)
await userFactory.ready()
const user = userFactory.build() // guaranteed faker values if installed
```

---

## Related Records

Use `use()` inside an override function to create a related record automatically when calling `create()`.

```ts
import { defineFactory } from 'drizzle-fixtures'
import { users, posts } from './schema'

const userFactory = defineFactory(users)

const postFactory = defineFactory(posts, {
  overrides: {
    // use is undefined in build() context   guard with a ternary
    authorId: ({ use, seq }) =>
      use
        ? use(userFactory).then(u => u.id)  // create() → inserts real user
        : seq,                               // build() → uses seq as fallback
  },
})

// build()   sync, no DB, authorId = seq value
const post = postFactory.build()

// create()   inserts a user first, then inserts a post with the real user.id
const saved = await postFactory.create(db)
```

### How it works

- `use` is `undefined` in `build()` context and a live function in `create()` context
- Always guard: `use ? use(factory).then(...) : fallback`
- Each `use()` call creates a **new** related record   no deduplication
- Circular `use()` chains (A → B → A) throw an error immediately

### Multiple relations

```ts
const commentFactory = defineFactory(comments, {
  overrides: {
    authorId: ({ use, seq }) => use ? use(userFactory).then(u => u.id) : seq,
    postId:   ({ use, seq }) => use ? use(postFactory).then(p => p.id) : seq,
  },
})

// Inserts: 1 user (post author) + 1 post + 1 user (comment author) + 1 comment
const comment = await commentFactory.create(db)
```

---

## Composing Factories

Group multiple factories into a single namespaced object with a shared `resetSeq()`.

```ts
import { composeFactory } from 'drizzle-fixtures'

const factory = composeFactory({
  users:    userFactory,
  posts:    postFactory,
  comments: commentFactory,
})

// Full factory API on each member
const user = factory.users.build()
const post = await factory.posts.create(db, { authorId: user.id })

// Reset all sequences at once
factory.resetSeq()
```

---

## Seeding

Orchestrate full database seeding with ordered operations and clean reset support.

```ts
import { defineSeeder } from 'drizzle-fixtures'

const seeder = defineSeeder(db, {
  users: {
    seed:   () => userFactory.createList(db, 10),
    before: async () => db.delete(users),  // truncate before re-seed
  },
  posts: {
    seed:   () => postFactory.createList(db, 50),
    before: async () => db.delete(posts),
  },
  // Shorthand   no before hook
  tags: () => tagFactory.createList(db, 20),
})

// Run all seeds in definition order
const result = await seeder.run()
// result: { users: User[], posts: Post[], tags: Tag[] }

// Run only specific seeds
await seeder.run(['users'])

// Truncate + re-seed (calls before hooks, then seed functions)
await seeder.reset()

// Reset only specific tables
await seeder.reset(['posts'])
```

> Seeds always execute **sequentially** in definition order   later seeds can safely reference FK values from earlier ones.

---

## Test Framework Integration

Eliminate per-file boilerplate for sequence reset and DB cleanup.

### Vitest

```ts
import { useFactory, useSeeder } from 'drizzle-fixtures/vitest'

// Auto-reset seq in beforeEach
const user = useFactory(userFactory)
const post = useFactory(postFactory)

it('creates a user', () => {
  const u = user.build()  // seq always starts at 1 in each test
})

// Auto-reset seq + DB cleanup in afterEach
const user = useFactory(userFactory, {
  db,
  cleanup: () => db.delete(users),
})

// Seeder helper   runs seeder.reset() in beforeEach
useSeeder(seeder)
useSeeder(seeder, ['users', 'posts'])  // reset specific seeds only
```

### Jest

```ts
import { useFactory, useSeeder } from 'drizzle-fixtures/jest'

// Identical API
const user = useFactory(userFactory)
useSeeder(seeder)
```

---

## Value Generation

drizzle-fixtures uses a two-level system to generate values.

### Level 1   Semantic name heuristics

Checked first. Matches against the TypeScript field name (case-insensitive, substring match).

| Pattern | Generated value (no faker) |
| --- | --- |
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

### Level 2   Column type fallback

Used when no semantic match found.

| Data type | Column type examples | Generated value |
| --- | --- | --- |
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

These fields are omitted from `build()` output   the database handles them:

- Serial / autoincrement primary keys
- Any column with a DB default (`defaultNow()`, `.default('viewer')`, `.defaultRandom()`) unless explicitly overridden

> UUID primary keys are the exception   drizzle-fixtures generates a `crypto.randomUUID()` for them.

---

## Faker.js Integration

Install `@faker-js/faker` and drizzle-fixtures detects it automatically at runtime. No configuration needed.

```bash
npm install --save-dev @faker-js/faker
```

When faker is available, semantic heuristics use realistic values:

| Pattern | Faker value |
| --- | --- |
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

> Faker is detected via a dynamic `import()` at module load time. Call `await factory.ready()` to guarantee faker values on the first `build()` call.

---

## Supported Dialects

| Dialect | Status | Notes |
| --- | --- | --- |
| PostgreSQL | ✅ Supported | Uses `RETURNING` for `create()` |
| SQLite | ✅ Supported | Uses `RETURNING` for `create()` |
| MySQL | ✅ Supported | Insert + select-by-PK (no `RETURNING`) |
| CockroachDB | ✅ Supported | PG-compatible, uses `RETURNING` |
| SingleStore | ✅ Supported | MySQL-compatible, insert + select-by-PK |
| MSSQL | 🔜 Planned | Phase 4 |

---

## TypeScript

drizzle-fixtures is fully typed end-to-end. No `any`.

```ts
import { defineFactory } from 'drizzle-fixtures'
import { users } from './schema'

const factory = defineFactory(users)

// build() return type is exactly typeof users.$inferInsert
const user = factory.build()
//    ^? { email: string; firstName: string | null; role: string; ... }

// create() return type is exactly typeof users.$inferSelect
const saved = await factory.create(db)
//    ^? { id: number; email: string; createdAt: Date; ... }

// Wrong field types are a compile error
factory.build({ role: 123 })
//             ^^^^ Type 'number' is not assignable to type 'string'
```

**Override function type:**

```ts
// build() context   use is undefined
type BuildCtx  = { seq: number; use: undefined }

// create() context   use is a live function
type CreateCtx = { seq: number; use: <T extends Table>(factory: Factory<T>) => Promise<InferSelectModel<T>> }

type FieldOverride<T> = T | ((ctx: BuildCtx | CreateCtx) => T | Promise<T>)
```

---

## How It Works

### Schema introspection

`defineFactory` calls `getTableColumns(table)` from `drizzle-orm` once at definition time. This returns an object keyed by TypeScript field names, with column descriptors exposing `dataType`, `columnType`, `notNull`, `hasDefault`, `primary`, `enumValues`, and more.

### Build pipeline (per field, per `build()` call)

```
for each column:
  1. skip?              → serial PK or hasDefault (no user override) → omit
  2. user override?     → resolve (static or fn({ seq, use: undefined })) → use it
  3. semantic match?    → name heuristic → use it
  4. type fallback      → dataType/columnType dispatch → use it
```

### Create pipeline (per field, per `create()` call)

```
for each column:
  1. skip?              → serial PK or hasDefault (no user override) → omit
  2. user override?     → resolve (static or async fn({ seq, use })) → await it
  3. semantic match?    → name heuristic → use it
  4. type fallback      → dataType/columnType dispatch → use it
→ insert to DB (sequential, respects FK order)
→ return full SelectModel via RETURNING or select-by-PK
```

### MySQL / SingleStore `create()` path

These dialects do not support `RETURNING`. drizzle-fixtures duck-types the insert builder   if `.returning` is not present, it falls back to insert → find PK column → `SELECT * FROM table WHERE pk = insertedValue LIMIT 1`.

### Faker detection

At module import time drizzle-fixtures fires `import('@faker-js/faker')` asynchronously and caches the result. `build()` is synchronous and reads the cached value (`null` if faker is absent or not yet resolved). Call `await factory.ready()` to wait for detection before your first `build()`.

---

## Contributing

Issues and PRs welcome. Please include a failing test case when reporting a bug.

[Open an issue](https://github.com/martinykiriloff/drizzle-fixtures/issues)
