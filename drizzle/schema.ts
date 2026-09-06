import { pgTable, serial, text, varchar } from "drizzle-orm/pg-core";

// Contoh schema untuk project fjgiolmwwpgxesbikjnp (MCP baru)
// Disimpan terpisah dari server/db/schema.ts (CoupleCash wrwgmma)
// Untuk pakai schema ini: ubah drizzle.config.ts schema ke './drizzle/schema.ts' atau './drizzle/schema.ts,./server/db/schema.ts'
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  fullName: text('full_name'),
  phone: varchar('phone', { length: 256 }),
});
