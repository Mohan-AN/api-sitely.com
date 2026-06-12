import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env['DB_URL'];

if (!databaseUrl) {
  throw new Error('DB_URL is required. Put it in .env or set it in the shell.');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
