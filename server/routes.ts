import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTesterSchema, insertSeedSchema, SEED_TYPES, insertWeeklySeedSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === TESTERS ===
  app.get("/api/testers", async (_req, res) => {
    const testers = await storage.getTesters();
    res.json(testers);
  });

  app.post("/api/testers", async (req, res) => {
    const result = insertTesterSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.message });
    }
    const tester = await storage.createTester(result.data);
    res.status(201).json(tester);
  });

  app.patch("/api/testers/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const tester = await storage.updateTester(id, req.body);
    if (!tester) return res.status(404).json({ error: "Tester not found" });
    res.json(tester);
  });

  app.delete("/api/testers/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteTester(id);
    res.status(204).send();
  });

  // === SEEDS ===
  app.get("/api/seeds", async (_req, res) => {
    const seeds = await storage.getSeeds();
    res.json(seeds);
  });

  app.post("/api/seeds", async (req, res) => {
    const result = insertSeedSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.message });
    }
    const seed = await storage.createSeed(result.data);
    res.status(201).json(seed);
  });

  // Bulk add seeds
  // Expects { seeds: Array<{ overworldSeed, netherSeed, seedType }> }
  app.post("/api/seeds/bulk", async (req, res) => {
    const { seeds: seedList } = req.body;
    if (!Array.isArray(seedList)) {
      return res.status(400).json({ error: "seeds must be an array" });
    }
    const created = [];
    for (const entry of seedList) {
      if (
        entry &&
        typeof entry.overworldSeed === "string" && entry.overworldSeed.trim() &&
        typeof entry.netherSeed === "string" && entry.netherSeed.trim() &&
        typeof entry.seedType === "string" && (SEED_TYPES as readonly string[]).includes(entry.seedType)
      ) {
        const seed = await storage.createSeed({
          overworldSeed: entry.overworldSeed.trim(),
          netherSeed: entry.netherSeed.trim(),
          seedType: entry.seedType,
          status: "pending",
        });
        created.push(seed);
      }
    }
    res.status(201).json(created);
  });

  app.patch("/api/seeds/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const seed = await storage.updateSeed(id, req.body);
    if (!seed) return res.status(404).json({ error: "Seed not found" });
    res.json(seed);
  });

  app.delete("/api/seeds/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteSeed(id);
    res.status(204).send();
  });

  // === ASSIGNMENT: get seeds a tester can evaluate ===
  app.get("/api/seeds/assignable/:testerId", async (req, res) => {
    const testerId = parseInt(req.params.testerId);
    const tester = await storage.getTester(testerId);
    if (!tester) return res.status(404).json({ error: "Tester not found" });

    const allSeeds = await storage.getSeeds();
    const assignable = allSeeds.filter(s => s.status === "pending" && !s.testerId);
    res.json(assignable);
  });

  // === STATS ===
  app.get("/api/stats", async (_req, res) => {
    const allSeeds = await storage.getSeeds();
    const allTesters = await storage.getTesters();

    const leagueStats: Record<number, { approved: number; pending: number; rejected: number }> = {};
    for (let i = 1; i <= 6; i++) {
      leagueStats[i] = { approved: 0, pending: 0, rejected: 0 };
    }

    for (const seed of allSeeds) {
      if (seed.status === "approved" && seed.approvedLeagues) {
        const leagues: number[] = JSON.parse(seed.approvedLeagues);
        for (const l of leagues) {
          if (leagueStats[l]) leagueStats[l].approved++;
        }
      }
    }

    const totalPending = allSeeds.filter(s => s.status === "pending").length;
    const totalApproved = allSeeds.filter(s => s.status === "approved").length;
    const totalRejected = allSeeds.filter(s => s.status === "rejected").length;

    // Count by seed type
    const typeStats: Record<string, { total: number; approved: number; pending: number; rejected: number }> = {};
    for (const t of SEED_TYPES) {
      typeStats[t] = { total: 0, approved: 0, pending: 0, rejected: 0 };
    }
    for (const seed of allSeeds) {
      if (typeStats[seed.seedType]) {
        typeStats[seed.seedType].total++;
        if (seed.status === "approved") typeStats[seed.seedType].approved++;
        else if (seed.status === "rejected") typeStats[seed.seedType].rejected++;
        else typeStats[seed.seedType].pending++;
      }
    }

    res.json({
      totalSeeds: allSeeds.length,
      totalPending,
      totalApproved,
      totalRejected,
      totalTesters: allTesters.length,
      leagueStats,
      typeStats,
    });
  });

  // === WEEKLY SEEDS ===
  app.get("/api/weekly-seeds", async (_req, res) => {
    const all = await storage.getWeeklySeeds();
    res.json(all);
  });

  app.get("/api/weekly-seeds/weeks", async (_req, res) => {
    const weeks = await storage.getWeekLabels();
    res.json(weeks);
  });

  app.get("/api/weekly-seeds/:weekLabel", async (req, res) => {
    const weekLabel = decodeURIComponent(req.params.weekLabel);
    const seeds = await storage.getWeeklySeedsByWeek(weekLabel);
    res.json(seeds);
  });

  app.post("/api/weekly-seeds", async (req, res) => {
    const result = insertWeeklySeedSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.message });
    }
    const ws = await storage.createWeeklySeed(result.data);
    res.status(201).json(ws);
  });

  // Bulk add weekly seeds
  app.post("/api/weekly-seeds/bulk", async (req, res) => {
    const { entries } = req.body;
    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: "entries must be an array" });
    }
    const created = [];
    for (const entry of entries) {
      const parsed = insertWeeklySeedSchema.safeParse(entry);
      if (parsed.success) {
        const ws = await storage.createWeeklySeed(parsed.data);
        created.push(ws);
      }
    }
    res.status(201).json(created);
  });

  app.patch("/api/weekly-seeds/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const ws = await storage.updateWeeklySeed(id, req.body);
    if (!ws) return res.status(404).json({ error: "Weekly seed not found" });
    res.json(ws);
  });

  app.delete("/api/weekly-seeds/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteWeeklySeed(id);
    res.status(204).send();
  });

  return httpServer;
}
