import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (keep existing structure)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// AI Think Tank Sessions
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  facilitatorId: varchar("facilitator_id").references(() => users.id),
  currentPhase: integer("current_phase").notNull().default(1), // 1-6 for the phases
  completedPhases: integer("completed_phases").array().notNull().default(sql`ARRAY[]::integer[]`),
  status: text("status").notNull().default("draft"), // draft, in_progress, completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  config: jsonb("config"), // Session configuration (agent settings, research mode, etc.)
  groundingMaterials: jsonb("grounding_materials").default(sql`'[]'::jsonb`), // Array of uploaded files/links
});

// Problem statements submitted for sessions
export const problems = pgTable("problems", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => sessions.id).notNull(),
  statement: text("statement").notNull(),
  submittedBy: varchar("submitted_by").references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI-generated solutions for problems
export const solutions = pgTable("solutions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => sessions.id).notNull(),
  problemId: varchar("problem_id").references(() => problems.id).notNull(),
  title: text("title").notNull(),
  objective: text("objective").notNull(),
  approach: text("approach").notNull(),
  enablers: text("enablers").array().notNull().default(sql`ARRAY[]::text[]`),
  risks: text("risks").array().notNull().default(sql`ARRAY[]::text[]`),
  expectedOutcomes: text("expected_outcomes").array().notNull().default(sql`ARRAY[]::text[]`),
  impact: jsonb("impact").notNull(), // { timeframe, effort, confidence }
  generatedBy: text("generated_by").notNull().default("solution_agent"), // Which AI agent generated it
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Debate points and rebuttals
export const debatePoints = pgTable("debate_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => sessions.id).notNull(),
  solutionId: varchar("solution_id").references(() => solutions.id).notNull(),
  agent: text("agent").notNull(), // proponent, opponent
  pointNumber: integer("point_number").notNull(),
  round: integer("round").notNull().default(1),
  title: text("title").notNull(),
  content: text("content").notNull(),
  rebuttalTo: varchar("rebuttal_to"), // Self-reference ID without FK constraint to avoid circular dependency
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  evidenceAttached: boolean("evidence_attached").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Evidence and citations gathered by Analyst agent
export const evidence = pgTable("evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => sessions.id).notNull(),
  pointId: varchar("point_id").references(() => debatePoints.id), // Which debate point this supports
  claim: text("claim").notNull(),
  snippet: text("snippet").notNull(),
  source: jsonb("source").notNull(), // { title, url, type, date }
  confidence: integer("confidence").notNull(), // 0-100 confidence score
  relevanceScore: integer("relevance_score").notNull(), // 0-100 relevance score
  gatheredBy: text("gathered_by").notNull().default("analyst_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Participant questions and answers
export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => sessions.id).notNull(),
  question: text("question").notNull(),
  askedBy: varchar("asked_by").references(() => users.id),
  votes: integer("votes").notNull().default(0),
  answered: boolean("answered").notNull().default(false),
  answer: text("answer"),
  answeredBy: text("answered_by"), // Which AI agent answered
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Final session summaries
export const summaries = pgTable("summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => sessions.id).notNull(),
  moderatorInsights: text("moderator_insights").notNull(),
  sections: jsonb("sections").notNull(), // Array of summary sections with sentiment
  participantSentiment: jsonb("participant_sentiment").notNull(), // Sentiment breakdown
  decisionPrompts: text("decision_prompts").array().notNull().default(sql`ARRAY[]::text[]`),
  recommendedActions: text("recommended_actions"),
  outcome: text("outcome"), // adopted, modified, rejected, pending
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User votes on debate points
export const votes = pgTable("votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  pointId: varchar("point_id").references(() => debatePoints.id).notNull(),
  voteType: text("vote_type").notNull(), // up, down
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProblemSchema = createInsertSchema(problems).omit({
  id: true,
  createdAt: true,
});

export const insertSolutionSchema = createInsertSchema(solutions).omit({
  id: true,
  createdAt: true,
});

export const insertDebatePointSchema = createInsertSchema(debatePoints).omit({
  id: true,
  createdAt: true,
});

export const insertEvidenceSchema = createInsertSchema(evidence).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
});

export const insertSummarySchema = createInsertSchema(summaries).omit({
  id: true,
  createdAt: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true,
});

// Session update schema for PATCH /sessions/:id - only allow safe fields
export const updateSessionSchema = insertSessionSchema.partial().omit({
  facilitatorId: true, // Cannot change facilitator
}).extend({
  currentPhase: z.number().min(1).max(6).optional(),
  status: z.enum(["draft", "in_progress", "completed"]).optional(),
  completedPhases: z.array(z.number().min(1).max(6)).optional(),
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type Problem = typeof problems.$inferSelect;

export type InsertSolution = z.infer<typeof insertSolutionSchema>;
export type Solution = typeof solutions.$inferSelect;

export type InsertDebatePoint = z.infer<typeof insertDebatePointSchema>;
export type DebatePoint = typeof debatePoints.$inferSelect;

export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;
export type Evidence = typeof evidence.$inferSelect;

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

export type InsertSummary = z.infer<typeof insertSummarySchema>;
export type Summary = typeof summaries.$inferSelect;

export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votes.$inferSelect;
