---
layout: home

hero:
  name: drizzle-fixtures
  text: Test data factories for Drizzle ORM
  tagline: Introspects your schema. Generates typed fixtures. Zero configuration.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/martinykiriloff/drizzle-fixtures

features:
  - title: Zero Configuration
    details: Point it at your Drizzle table. Get a fully-typed factory. No manual field mapping.
  - title: Works Without a DB
    details: build() is synchronous and needs no database connection — perfect for unit tests.
  - title: Full DB Integration
    details: create() inserts real records and returns typed SelectModel results, including auto-generated fields.
  - title: Related Records
    details: use() in create() context inserts related factories first and threads FKs automatically.
  - title: Seeding Built-in
    details: defineSeeder orchestrates ordered seed runs with truncate-and-reseed support.
  - title: Faker.js Optional
    details: Install @faker-js/faker for richer values. Auto-detected. No config needed.
---
