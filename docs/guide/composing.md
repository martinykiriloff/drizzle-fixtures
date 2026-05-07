# Composing Factories

`composeFactory` groups multiple factories under a single object with a shared `resetSeq()`.

## Usage

```ts
import { composeFactory } from 'drizzle-fixtures'

const factories = composeFactory({
  user: userFactory,
  post: postFactory,
  comment: commentFactory,
})

// Access individual factories
const user = factories.user.build()
const post = await factories.post.create(db)

// Reset all sequence counters at once
factories.resetSeq()
```

## With test helpers

```ts
import { useFactory } from 'drizzle-fixtures/vitest'

const { factories } = useFactory(() => composeFactory({ user: userFactory, post: postFactory }))

// Sequence resets automatically before each test
```

## Type inference

`composeFactory` preserves the full type of each member factory:

```ts
const f = composeFactory({ user: userFactory })
// f.user is fully typed as Factory<typeof users>
```
