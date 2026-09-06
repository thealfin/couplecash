import { sql } from 'drizzle-orm';
import { uuid } from 'drizzle-orm/pg-core';

export const uuidV7PrimaryKey = () =>
  uuid('id').primaryKey().default(sql`uuid_generate_v7()`);

export const uuidV7Column = (name: string) =>
  uuid(name).default(sql`uuid_generate_v7()`);
