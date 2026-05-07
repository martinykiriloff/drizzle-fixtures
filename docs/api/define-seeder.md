# defineSeeder

```ts
function defineSeeder<TSeeds extends Record<string, SeedFn>>(
  db: AnyDrizzleDb,
  seeds: { [K in keyof TSeeds]: SeedFn | SeedEntry },
): Seeder<TSeeds>
```

## SeedEntry

```ts
interface SeedEntry {
  seed: SeedFn                       // required: the seed function
  before?: () => Promise<void> | void  // optional: runs before seed on reset()
}
```

## Seeder methods

### run(keys?)

Runs all seeds (or specified keys) in definition order. Returns typed results.

```ts
const { users, posts } = await seeder.run()
await seeder.run(['users'])
```

### reset(keys?)

Runs `before` hooks then re-runs seeds. Used to wipe and re-seed between tests.

```ts
await seeder.reset()
await seeder.reset(['users'])
```

## Example

```ts
const seeder = defineSeeder(db, {
  users: {
    before: async () => db.delete(users),
    seed: async () => userFactory.createList(db, 10),
  },
  posts: async () => postFactory.createList(db, 20),
})
```
