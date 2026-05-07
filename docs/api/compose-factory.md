# composeFactory

```ts
function composeFactory<T extends Record<string, Factory<Table>>>(
  factories: T,
): ComposedFactory<T>
```

Groups multiple factories under a single object. Adds a shared `resetSeq()` that resets all member sequences.

## Example

```ts
import { composeFactory } from 'drizzle-fixtures'

const factories = composeFactory({
  user: userFactory,
  post: postFactory,
})

factories.user.build()
factories.post.buildList(5)
factories.resetSeq() // resets both user and post seq
```

## Type

```ts
type ComposedFactory<TFactories extends Record<string, Factory<Table>>> = {
  [K in keyof TFactories]: TFactories[K]
} & { resetSeq(): void }
```
