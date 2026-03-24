import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
  schema: './src/config/schema.ts',
  out: './database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
