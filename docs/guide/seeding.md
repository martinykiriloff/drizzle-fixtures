# Seeding

`defineSeeder` orchestrates ordered seed runs with optional truncate-and-reseed support.

## Basic usage

```ts
import { defineSeeder } from 'drizzle-fixtures'

const seeder = defineSeeder(db, {
  roles: async () => {
    return await roleFactory.createList(db, 3)
  },
  users: {
    before: async () => db.delete(users),  // truncate before re-seeding
    seed: async () => userFactory.createList(db, 50),
  },
})

// Run all seeds in definition order
const { roles, users } = await seeder.run()

// Run specific seeds only
await seeder.run(['users'])

// Reset (runs before hooks then re-seeds)
await seeder.reset()
await seeder.reset(['users'])
```

## Seed dependencies

Seeds run in definition order. Use closures to access previously seeded data:

```ts
let seededRoles: Role[] = []

const seeder = defineSeeder(db, {
  roles: async () => {
    seededRoles = await roleFactory.createList(db, 3)
    return seededRoles
  },
  users: async () => {
    return userFactory.createList(db, 10, {
      roleId: () => seededRoles[0]!.id,
    })
  },
})
```

## With test helpers

```ts
import { useSeeder } from 'drizzle-fixtures/vitest'

const { data } = useSeeder(() => seeder)
// seeder.reset() is called before each test
// data.roles, data.users are available in tests
```
