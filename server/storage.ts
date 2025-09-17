import { 
  type User, type InsertUser,
  type Session, type InsertSession,
  type Problem, type InsertProblem,
  type Solution, type InsertSolution,
  type DebatePoint, type InsertDebatePoint,
  type Evidence, type InsertEvidence,
  type Question, type InsertQuestion,
  type Summary, type InsertSummary,
  type Vote, type InsertVote,
  users, sessions, problems, solutions, debatePoints, evidence, questions, summaries, votes
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

// Safe user type without password for API responses
export type SafeUser = Omit<User, 'password'>;

export interface IStorage {
  // User operations
  getUser(id: string): Promise<SafeUser | undefined>;
  getUserByUsername(username: string): Promise<SafeUser | undefined>;
  getUserByUsernameWithPassword(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<SafeUser>;
  validateUserPassword(username: string, password: string): Promise<boolean>;

  // Session operations
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined>;
  getUserSessions(facilitatorId: string): Promise<Session[]>;
  getAllSessions(): Promise<Session[]>;

  // Problem operations
  createProblem(problem: InsertProblem): Promise<Problem>;
  getSessionProblems(sessionId: string): Promise<Problem[]>;
  updateProblemStatus(id: string, status: string): Promise<Problem | undefined>;

  // Solution operations
  createSolution(solution: InsertSolution): Promise<Solution>;
  getSessionSolutions(sessionId: string): Promise<Solution[]>;
  getSolution(id: string): Promise<Solution | undefined>;

  // Debate operations
  createDebatePoint(point: InsertDebatePoint): Promise<DebatePoint>;
  getDebatePoint(id: string): Promise<DebatePoint | undefined>;
  getSessionDebatePoints(sessionId: string): Promise<DebatePoint[]>;
  getSolutionDebatePoints(solutionId: string): Promise<DebatePoint[]>;
  updateDebatePointVotes(id: string, upvotes: number, downvotes: number): Promise<DebatePoint | undefined>;

  // Evidence operations
  createEvidence(evidenceData: InsertEvidence): Promise<Evidence>;
  getEvidence(id: string): Promise<Evidence | undefined>;
  getSessionEvidence(sessionId: string): Promise<Evidence[]>;
  getPointEvidence(pointId: string): Promise<Evidence[]>;
  linkEvidenceToDebatePoint(argumentId: string, evidenceId: string): Promise<boolean>;

  // Question operations
  createQuestion(question: InsertQuestion): Promise<Question>;
  getSessionQuestions(sessionId: string): Promise<Question[]>;
  updateQuestionAnswer(id: string, answer: string, answeredBy: string): Promise<Question | undefined>;

  // Summary operations
  createSummary(summary: InsertSummary): Promise<Summary>;
  getSessionSummary(sessionId: string): Promise<Summary | undefined>;

  // Vote operations
  createVote(vote: InsertVote): Promise<Vote>;
  getUserVoteForPoint(userId: string, pointId: string): Promise<Vote | undefined>;
  createVoteWithCountUpdate(vote: InsertVote): Promise<{success: boolean, vote?: Vote, message?: string}>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<SafeUser | undefined> {
    const result = await db.select({
      id: users.id,
      username: users.username
    }).from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<SafeUser | undefined> {
    const result = await db.select({
      id: users.id,
      username: users.username
    }).from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByUsernameWithPassword(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<SafeUser> {
    // Hash the password before storing
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(user.password, saltRounds);
    
    const result = await db.insert(users).values({
      ...user,
      password: hashedPassword
    }).returning({
      id: users.id,
      username: users.username
    });
    
    if (!result.length) {
      throw new Error('Failed to create user');
    }
    return result[0];
  }

  async validateUserPassword(username: string, password: string): Promise<boolean> {
    const user = await this.getUserByUsernameWithPassword(username);
    if (!user) {
      return false;
    }
    return await bcrypt.compare(password, user.password);
  }

  // Session operations
  async createSession(session: InsertSession): Promise<Session> {
    const result = await db.insert(sessions).values({
      ...session,
      updatedAt: new Date()
    }).returning();
    
    if (!result.length) {
      throw new Error('Failed to create session');
    }
    return result[0];
  }

  async getSession(id: string): Promise<Session | undefined> {
    const result = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    return result[0];
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined> {
    const result = await db.update(sessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sessions.id, id))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }

  async getUserSessions(facilitatorId: string): Promise<Session[]> {
    return await db.select().from(sessions)
      .where(eq(sessions.facilitatorId, facilitatorId))
      .orderBy(desc(sessions.updatedAt));
  }

  async getAllSessions(): Promise<Session[]> {
    return await db.select().from(sessions)
      .orderBy(desc(sessions.updatedAt));
  }

  // Problem operations
  async createProblem(problem: InsertProblem): Promise<Problem> {
    const result = await db.insert(problems).values(problem).returning();
    
    if (!result.length) {
      throw new Error('Failed to create problem');
    }
    return result[0];
  }

  async getSessionProblems(sessionId: string): Promise<Problem[]> {
    return await db.select().from(problems)
      .where(eq(problems.sessionId, sessionId))
      .orderBy(desc(problems.createdAt));
  }

  async updateProblemStatus(id: string, status: string): Promise<Problem | undefined> {
    const result = await db.update(problems)
      .set({ status })
      .where(eq(problems.id, id))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }

  // Solution operations
  async createSolution(solution: InsertSolution): Promise<Solution> {
    const result = await db.insert(solutions).values(solution).returning();
    
    if (!result.length) {
      throw new Error('Failed to create solution');
    }
    return result[0];
  }

  async getSessionSolutions(sessionId: string): Promise<Solution[]> {
    return await db.select().from(solutions)
      .where(eq(solutions.sessionId, sessionId))
      .orderBy(desc(solutions.createdAt));
  }

  async getSolution(id: string): Promise<Solution | undefined> {
    const result = await db.select().from(solutions).where(eq(solutions.id, id)).limit(1);
    return result[0];
  }

  // Debate operations
  async createDebatePoint(point: InsertDebatePoint): Promise<DebatePoint> {
    const result = await db.insert(debatePoints).values(point).returning();
    
    if (!result.length) {
      throw new Error('Failed to create debate point');
    }
    return result[0];
  }

  async getSessionDebatePoints(sessionId: string): Promise<DebatePoint[]> {
    return await db.select().from(debatePoints)
      .where(eq(debatePoints.sessionId, sessionId))
      .orderBy(desc(debatePoints.createdAt));
  }

  async getSolutionDebatePoints(solutionId: string): Promise<DebatePoint[]> {
    return await db.select().from(debatePoints)
      .where(eq(debatePoints.solutionId, solutionId))
      .orderBy(desc(debatePoints.createdAt));
  }

  async getDebatePoint(id: string): Promise<DebatePoint | undefined> {
    const result = await db.select().from(debatePoints).where(eq(debatePoints.id, id)).limit(1);
    return result[0];
  }

  async updateDebatePointVotes(id: string, upvotes: number, downvotes: number): Promise<DebatePoint | undefined> {
    const result = await db.update(debatePoints)
      .set({ upvotes, downvotes })
      .where(eq(debatePoints.id, id))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }

  // Evidence operations
  async createEvidence(evidenceData: InsertEvidence): Promise<Evidence> {
    const result = await db.insert(evidence).values(evidenceData).returning();
    
    if (!result.length) {
      throw new Error('Failed to create evidence');
    }
    return result[0];
  }

  async getSessionEvidence(sessionId: string): Promise<Evidence[]> {
    return await db.select().from(evidence)
      .where(eq(evidence.sessionId, sessionId))
      .orderBy(desc(evidence.createdAt));
  }

  async getEvidence(id: string): Promise<Evidence | undefined> {
    const result = await db.select().from(evidence).where(eq(evidence.id, id)).limit(1);
    return result[0];
  }

  async getPointEvidence(pointId: string): Promise<Evidence[]> {
    return await db.select().from(evidence)
      .where(eq(evidence.pointId, pointId))
      .orderBy(desc(evidence.createdAt));
  }

  async linkEvidenceToDebatePoint(argumentId: string, evidenceId: string): Promise<boolean> {
    try {
      const result = await db.update(evidence)
        .set({ pointId: argumentId })
        .where(eq(evidence.id, evidenceId))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Failed to link evidence to debate point:', error);
      return false;
    }
  }

  // Question operations
  async createQuestion(question: InsertQuestion): Promise<Question> {
    const result = await db.insert(questions).values(question).returning();
    
    if (!result.length) {
      throw new Error('Failed to create question');
    }
    return result[0];
  }

  async getSessionQuestions(sessionId: string): Promise<Question[]> {
    return await db.select().from(questions)
      .where(eq(questions.sessionId, sessionId))
      .orderBy(desc(questions.votes), desc(questions.createdAt));
  }

  async updateQuestionAnswer(id: string, answer: string, answeredBy: string): Promise<Question | undefined> {
    const result = await db.update(questions)
      .set({ answer, answeredBy, answered: true })
      .where(eq(questions.id, id))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }

  // Summary operations
  async createSummary(summary: InsertSummary): Promise<Summary> {
    const result = await db.insert(summaries).values(summary).returning();
    
    if (!result.length) {
      throw new Error('Failed to create summary');
    }
    return result[0];
  }

  async getSessionSummary(sessionId: string): Promise<Summary | undefined> {
    const result = await db.select().from(summaries)
      .where(eq(summaries.sessionId, sessionId))
      .limit(1);
    return result[0];
  }

  // Vote operations
  async createVote(vote: InsertVote): Promise<Vote> {
    const result = await db.insert(votes).values(vote).returning();
    
    if (!result.length) {
      throw new Error('Failed to create vote');
    }
    return result[0];
  }

  async getUserVoteForPoint(userId: string, pointId: string): Promise<Vote | undefined> {
    const result = await db.select().from(votes)
      .where(and(eq(votes.userId, userId), eq(votes.pointId, pointId)))
      .limit(1);
    return result[0];
  }

  async createVoteWithCountUpdate(vote: InsertVote): Promise<{success: boolean, vote?: Vote, message?: string}> {
    // Use database transaction to ensure atomicity
    try {
      const result = await db.transaction(async (tx) => {
        // Check if user already voted
        const existingVote = await tx.select().from(votes)
          .where(and(eq(votes.userId, vote.userId), eq(votes.pointId, vote.pointId)))
          .limit(1);
        
        if (existingVote.length > 0) {
          throw new Error("User already voted on this point");
        }

        // Create the vote
        const newVote = await tx.insert(votes).values(vote).returning();
        
        // Update debate point vote counts
        const isUpvote = vote.voteType === "up";
        await tx.update(debatePoints)
          .set({
            upvotes: isUpvote ? sql`${debatePoints.upvotes} + 1` : debatePoints.upvotes,
            downvotes: !isUpvote ? sql`${debatePoints.downvotes} + 1` : debatePoints.downvotes
          })
          .where(eq(debatePoints.id, vote.pointId));
        
        return newVote[0];
      });
      
      return { success: true, vote: result };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to create vote" 
      };
    }
  }
}

export const storage = new DatabaseStorage();
