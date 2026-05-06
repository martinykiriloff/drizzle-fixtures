# Changelog

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
