import {
  type Tester, type InsertTester, testers,
  type Seed, type InsertSeed, seeds,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";

const dbPath = process.env.DB_PATH || "data.db";
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

// Auto-create tables if they don't exist (handles fresh deployments)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS testers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    leagues TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS seeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    overworld_seed TEXT NOT NULL,
    nether_seed TEXT NOT NULL,
    seed_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    approved_leagues TEXT,
    tester_id INTEGER,
    notes TEXT
  );
`);

export const db = drizzle(sqlite);

export interface IStorage {
  // Testers
  getTesters(): Promise<Tester[]>;
  getTester(id: number): Promise<Tester | undefined>;
  createTester(tester: InsertTester): Promise<Tester>;
  updateTester(id: number, tester: Partial<InsertTester>): Promise<Tester | undefined>;
  deleteTester(id: number): Promise<void>;

  // Seeds
  getSeeds(): Promise<Seed[]>;
  getSeed(id: number): Promise<Seed | undefined>;
  createSeed(seed: InsertSeed): Promise<Seed>;
  updateSeed(id: number, seed: Partial<InsertSeed>): Promise<Seed | undefined>;
  deleteSeed(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Testers
  async getTesters(): Promise<Tester[]> {
    return db.select().from(testers).all();
  }

  async getTester(id: number): Promise<Tester | undefined> {
    return db.select().from(testers).where(eq(testers.id, id)).get();
  }

  async createTester(tester: InsertTester): Promise<Tester> {
    return db.insert(testers).values(tester).returning().get();
  }

  async updateTester(id: number, data: Partial<InsertTester>): Promise<Tester | undefined> {
    return db.update(testers).set(data).where(eq(testers.id, id)).returning().get();
  }

  async deleteTester(id: number): Promise<void> {
    db.delete(testers).where(eq(testers.id, id)).run();
  }

  // Seeds
  async getSeeds(): Promise<Seed[]> {
    return db.select().from(seeds).all();
  }

  async getSeed(id: number): Promise<Seed | undefined> {
    return db.select().from(seeds).where(eq(seeds.id, id)).get();
  }

  async createSeed(seed: InsertSeed): Promise<Seed> {
    return db.insert(seeds).values(seed).returning().get();
  }

  async updateSeed(id: number, data: Partial<InsertSeed>): Promise<Seed | undefined> {
    return db.update(seeds).set(data).where(eq(seeds.id, id)).returning().get();
  }

  async deleteSeed(id: number): Promise<void> {
    db.delete(seeds).where(eq(seeds.id, id)).run();
  }
}

export const storage = new DatabaseStorage();
