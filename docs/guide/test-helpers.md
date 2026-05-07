# Test Helpers

drizzle-fixtures ships Vitest and Jest integration helpers that auto-reset sequence counters and manage seed lifecycle.

## Vitest

```ts
import { useFactory, useSeeder } from 'drizzle-fixtures/vitest'
```

## Jest

```ts
import { useFactory, useSeeder } from 'drizzle-fixtures/jest'
```

## useFactory

Resets the factory's sequence counter before each test:

```ts
const { factory } = useFactory(() => defineFactory(users))

it('seq starts at 1 in every test', () => {
  const user = factory.build()
  expect(user.email).toBe('user-1@test.com') // always 1, not cumulative
})
```

With a `composeFactory`:

```ts
const { factory } = useFactory(() =>
  composeFactory({ user: userFactory, post: postFactory })
)
// factory.user, factory.post — both seqs reset before each test
```

## useSeeder

Calls `seeder.reset()` before each test:

```ts
const { data } = useSeeder(() => seeder)

it('gets fresh seed data', () => {
  expect(data.users).toHaveLength(50)
})
```

Reset only specific keys:

```ts
const { data } = useSeeder(() => seeder, ['users'])
// Only resets the users seed before each test
```
