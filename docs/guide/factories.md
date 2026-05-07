# Factories

## defineFactory

```ts
const userFactory = defineFactory(users)
const userFactory = defineFactory(users, { overrides: { role: 'admin' } })
```

## build()

Synchronous. No DB required.

```ts
const user = userFactory.build()
const user = userFactory.build({ email: 'custom@test.com' })
```

## buildList(n)

```ts
const users = userFactory.buildList(10)
const admins = userFactory.buildList(5, { role: 'admin' })
```

## Sequence counter

Each factory has an independent auto-incrementing `seq`. Override functions receive it:

```ts
const factory = defineFactory(users, {
  overrides: { email: ({ seq }) => `user-${seq}@test.com` },
})

factory.build() // email: user-1@test.com
factory.build() // email: user-2@test.com
factory.resetSeq()
factory.build() // email: user-1@test.com
```

## Immutable presets with state()

```ts
const adminFactory = userFactory.state('admin', { role: 'admin' })
const admin = adminFactory.build()
// Call-site overrides still work:
adminFactory.build({ email: 'custom@example.com' })
```

## Batch insert option

```ts
const factory = defineFactory(users, { batch: 'auto' })   // default
const factory = defineFactory(users, { batch: 'never' })  // always sequential
const factory = defineFactory(users, { batch: 'always' }) // throws if use() detected
```

`createList` automatically uses a single bulk INSERT when no `use()` overrides are detected (`auto` mode). This is 10–100× faster for large seed scripts.

## Validation option

```ts
import { defineFactory } from 'drizzle-fixtures'

const factory = defineFactory(users, { validate: true })
await factory.ready()  // ensures drizzle-zod is loaded

// Throws ZodError with field details if generated data is invalid
const user = factory.build()
```

Requires `drizzle-zod` to be installed.
