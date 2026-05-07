# Related Records

Use `use()` inside an override function to insert a related record before the current one. `use()` is only available in `create()` context — `build()` passes `use: undefined`.

## Basic example

```ts
const postFactory = defineFactory(posts, {
  overrides: {
    authorId: async ({ use }) => {
      const author = await use(userFactory)
      return author.id
    },
  },
})

const post = await postFactory.create(db)
// Inserts a user first, then the post with the correct authorId
```

## Guarding use() for build() compatibility

```ts
const postFactory = defineFactory(posts, {
  overrides: {
    authorId: ({ use, seq }) => use
      ? use(userFactory).then(u => u.id)
      : seq,
  },
})

// Works in both contexts:
postFactory.build()           // authorId: 1
await postFactory.create(db)  // inserts user + post
```

## createList with use()

When `use()` is detected, `createList` automatically falls back to sequential inserts to preserve FK order:

```ts
const posts = await postFactory.createList(db, 5)
// Inserts 5 users + 5 posts sequentially
```

## Circular detection

drizzle-fixtures detects circular `use()` chains and throws a descriptive error:

```
[drizzle-fixtures] Circular use() detected. Factory is already being resolved in this call chain.
```
