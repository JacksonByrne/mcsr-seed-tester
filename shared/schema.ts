import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Testers - people who evaluate seeds
export const testers = sqliteTable("testers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  // JSON array of league numbers (1-6) the tester plays in
  leagues: text("leagues").notNull(), // stored as JSON string e.g. "[1, 3]"
});

// Seed types
export const SEED_TYPES = [
  "Village",
  "Desert Temple",
  "Ruined Portal",
  "Buried Treasure",
  "Shipwreck",
] as const;

export type SeedType = (typeof SEED_TYPES)[number];

// Seeds - minecraft seeds to be tested
export const seeds = sqliteTable("seeds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  overworldSeed: text("overworld_seed").notNull(),
  netherSeed: text("nether_seed").notNull(),
  seedType: text("seed_type").notNull(), // one of SEED_TYPES
  // "pending" | "approved" | "rejected"
  status: text("status").notNull().default("pending"),
  // JSON array of league numbers this seed is approved for
  approvedLeagues: text("approved_leagues"), // e.g. "[1, 2, 4]"
  // Which tester evaluated it
  testerId: integer("tester_id"),
  notes: text("notes"),
});

// Insert schemas
export const insertTesterSchema = createInsertSchema(testers).omit({ id: true });
export const insertSeedSchema = createInsertSchema(seeds).omit({ id: true });

// Types
export type InsertTester = z.infer<typeof insertTesterSchema>;
export type Tester = typeof testers.$inferSelect;
export type InsertSeed = z.infer<typeof insertSeedSchema>;
export type Seed = typeof seeds.$inferSelect;
