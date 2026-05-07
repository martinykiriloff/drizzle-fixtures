# defineFactory

```ts
function defineFactory<TTable extends Table>(
  table: TTable,
  options?: FactoryOptions<InferInsertModel<TTable>>,
): Factory<TTable>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `overrides` | `Overrides<TInsert>` | — | Field overrides applied to every build/create |
| `batch` | `'auto' \| 'always' \| 'never'` | `'auto'` | Controls bulk INSERT behavior in createList |
| `validate` | `boolean` | `false` | Validates generated data with drizzle-zod on every build |

## Factory methods

### build(overrides?)

Returns a plain object matching `InferInsertModel<TTable>`. Synchronous — no DB needed.

```ts
const user = userFactory.build()
const admin = userFactory.build({ role: 'admin' })
```

### buildList(n, overrides?)

Returns an array of `n` objects.

```ts
const users = userFactory.buildList(10)
```

### create(db, overrides?)

Inserts one record and returns the full `InferSelectModel<TTable>`. Includes DB-generated fields (id, timestamps, etc.).

```ts
const user = await userFactory.create(db)
```

### createList(db, n, overrides?)

Inserts `n` records. Uses bulk INSERT when possible (`batch: 'auto'`).

```ts
const users = await userFactory.createList(db, 50)
```

### state(name, overrides)

Returns a new factory with preset overrides merged in. Original factory is unchanged.

```ts
const adminFactory = userFactory.state('admin', { role: 'admin' })
```

### resetSeq()

Resets the sequence counter to 0.

### ready()

Awaits async initialisation (faker, drizzle-zod). Call before the first `build()` when using `validate: true`.
