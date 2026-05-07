# Getting Started

## Installation

```bash
pnpm add -D drizzle-fixtures
# or
npm install -D drizzle-fixtures
```

`drizzle-orm` is the only required peer dependency.

## Optional peer dependencies

```bash
# Richer auto-generated values (emails, names, URLs…)
pnpm add -D @faker-js/faker

# Schema validation on every build()
pnpm add -D drizzle-zod zod
```

## Your first factory

```ts
import { defineFactory } from 'drizzle-fixtures'
import { users } from './schema'

const userFactory = defineFactory(users)

// Build an object — no DB needed
const user = userFactory.build()
// { email: 'user-1@example.com', firstName: 'John', … }

// Insert into DB — returns the full select model
const dbUser = await userFactory.create(db)
// { id: 1, email: 'user-1@example.com', … }
```

## Overriding fields

```ts
// Static override
const admin = userFactory.build({ role: 'admin' })

// Function override — receives { seq } and optionally { use }
const seqUser = userFactory.build({ email: ({ seq }) => `user-${seq}@test.com` })
```

## Next steps

- [Factories in depth](./factories)
- [Related records](./related-records)
- [Seeding your database](./seeding)
