# Changelog

## [1.2.0] — 2026-05-07

### Added
- Batch insert optimization — `createList` uses a single bulk INSERT when no async overrides are present (10–100× faster for large seed scripts)
- `batch` option on `defineFactory`: `'auto'` (default) | `'always'` | `'never'`
- `validate` option on `defineFactory` — validates generated data against `drizzle-zod` insert schema on every `build()`
- `drizzle-zod` optional peer dependency for validation
- CLI: `npx drizzle-fixtures generate` — generates typed factory files from a Drizzle schema file
- MSSQL support — full column type inference (MsSqlVarChar, MsSqlUniqueIdentifier, MsSqlDateTime, MsSqlBit, and more)
- VitePress documentation site at `docs/` — deployed to GitHub Pages via Actions

### Changed
- `tsup.config.ts` — added `src/cli/index.ts` entry point
- `package.json` — added `bin`, docs scripts, `drizzle-zod` optional peer dep meta, `vitepress` devDep

---

## [1.1.0] — 2026-05-07

### Added
- `composeFactory` — group multiple factories into a namespaced object with shared `resetSeq()`
- `defineSeeder` — orchestrate full DB seeding with `run()` and `reset()`, supports `before` hooks per seed
- `drizzle-fixtures/vitest` subpath — `useFactory` and `useSeeder` Vitest helpers (auto-reset seq, optional cleanup)
- `drizzle-fixtures/jest` subpath — same helpers for Jest via `@jest/globals`
- `ComposedFactory`, `Seeder`, `SeedFn`, `SeedEntry` exported types
- CockroachDB support documented — PG-compatible, uses `RETURNING`, works without code changes
- SingleStore support documented — MySQL-compatible, insert + select-by-PK, works without code changes
- JSR publish config (`jsr.json`) at `@martin/drizzle-fixtures`

### Changed
- `package.json` exports now include `./vitest` and `./jest` subpath entries
- `tsup.config.ts` builds integration entry points alongside main bundle
- Version bumped `1.0.x` → `1.1.0`

---

## [0.2.0] — 2026-05-06

### Added
- `use()` in override functions for related record creation in `create()` context
- Circular `use()` detection with descriptive error message
- `use` is `undefined` in `build()` context — allows one override function to handle both contexts
- `BuildCtx`, `CreateCtx`, `FactoryCtx` exported types for typed override functions
- `tests/relations.test.ts` — 12 new test cases for related records

### Changed
- `FactoryCtx` is now a union of `BuildCtx` and `CreateCtx`
- Override functions in `create()` context are resolved sequentially (previously via `build()`) to respect FK insert order

---

## 0.1.0

Initial release.

- `defineFactory` with `build`, `buildList`, `create`, `createList`, `state`, `resetSeq`
- PostgreSQL, SQLite, MySQL dialect support
- Semantic name heuristics (email, firstName, slug, createdAt, etc.)
- Optional faker.js integration (auto-detected)
- Zero runtime dependencies
