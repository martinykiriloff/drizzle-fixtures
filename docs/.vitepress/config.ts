import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'drizzle-fixtures',
  description: 'Type-safe test data factories for Drizzle ORM',
  base: '/drizzle-fixtures/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/define-factory' },
      { text: 'npm', link: 'https://www.npmjs.com/package/drizzle-fixtures' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Factories', link: '/guide/factories' },
          { text: 'Related Records', link: '/guide/related-records' },
          { text: 'Composing', link: '/guide/composing' },
          { text: 'Seeding', link: '/guide/seeding' },
          { text: 'Test Helpers', link: '/guide/test-helpers' },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: 'defineFactory', link: '/api/define-factory' },
          { text: 'composeFactory', link: '/api/compose-factory' },
          { text: 'defineSeeder', link: '/api/define-seeder' },
          { text: 'CLI', link: '/api/cli' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/martinykiriloff/drizzle-fixtures' },
    ],
    editLink: {
      pattern: 'https://github.com/martinykiriloff/drizzle-fixtures/edit/main/docs/:path',
    },
  },
})
