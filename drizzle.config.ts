import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/schema/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/clothpur.db',
  },
} satisfies Config
