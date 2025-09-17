import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { orchestrator } from "./agents/orchestrator";
import { getVoiceService, AudioGenerationRequestSchema } from "./services/voice-service";
import { 
  insertSessionSchema, insertProblemSchema, insertSolutionSchema, 
  insertDebatePointSchema, insertEvidenceSchema, insertQuestionSchema,
  insertSummarySchema, insertVoteSchema, updateSessionSchema,
  insertUserSchema 
} from "@shared/schema";
import { z } from "zod";

// Rate limiting store (in-memory for development, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Extend session types
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    username?: string;
  }
}

// Authentication middleware
interface AuthenticatedRequest extends Request {
  user?: { id: string; username: string };
  session: import('express-session').Session & Partial<import('express-session').SessionData>;
}

interface SessionRequest extends Request {
  session: import('express-session').Session & Partial<import('express-session').SessionData>;
}

const authenticateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Check if user is logged in via session
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get user data
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Invalid session" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: "Authentication error" });
  }
};

// Rate limiting middleware 
const rateLimit = (windowMs: number, maxRequests: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    const entries = Array.from(rateLimitStore.entries());
    for (const [ip, data] of entries) {
      if (now > data.resetTime) {
        rateLimitStore.delete(ip);
      }
    }
    
    const userData = rateLimitStore.get(key);
    
    if (!userData || now > userData.resetTime) {
      // Reset window
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (userData.count >= maxRequests) {
      return res.status(429).json({ 
        message: "Too many requests", 
        retryAfter: Math.ceil((userData.resetTime - now) / 1000) 
      });
    }
    
    userData.count++;
    next();
  };
};

// Validation schemas
// Enhanced password policy for production security
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")  
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const registerSchema = insertUserSchema.extend({
  password: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure secure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'sid', // Don't use default 'connect.sid' for security
    cookie: {
      httpOnly: true, // Prevent XSS attacks
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // Prevent CSRF attacks
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    genid: () => {
      // Generate cryptographically secure session IDs
      return randomBytes(32).toString('hex');
    }
  }));

  // Authentication Routes
  
  // Register user
  app.post("/api/auth/register", rateLimit(15 * 60 * 1000, 5), async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser({
        username: userData.username,
        password: userData.password
      });
      
      res.status(201).json({ 
        message: "User created successfully", 
        user: { id: user.id, username: user.username } 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user", error });
    }
  });

  // Login user
  app.post("/api/auth/login", rateLimit(15 * 60 * 1000, 10), async (req: SessionRequest, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const isValid = await storage.validateUserPassword(username, password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Regenerate session ID to prevent session fixation attacks
      req.session.regenerate((err: any) => {
        if (err) {
          return res.status(500).json({ message: "Session creation failed" });
        }
        
        // Set session data after regeneration
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.json({ 
          message: "Login successful", 
          user: { id: user.id, username: user.username } 
        });
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Login failed", error });
    }
  });

  // Logout user
  app.post("/api/auth/logout", (req: SessionRequest, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      // Clear the session cookie
      res.clearCookie('sid', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      res.json({ message: "Logout successful" });
    });
  });

  // Get current user
  app.get("/api/auth/me", authenticateUser, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  // Apply rate limiting to AI endpoints
  const aiRateLimit = rateLimit(60 * 1000, 10); // 10 requests per minute
  // Session Management Routes (Protected)
  
  // Create a new session
  app.post("/api/sessions", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const sessionData = insertSessionSchema.parse({
        ...req.body,
        facilitatorId: req.user!.id // Ensure session is owned by authenticated user
      });
      const session = await storage.createSession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: "Invalid session data", error });
    }
  });

  // Get all sessions (with pagination)
  app.get("/api/sessions", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      // Add pagination support
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      
      const sessions = await storage.getUserSessions(req.user!.id);
      const paginatedSessions = sessions.slice(offset, offset + limit);
      
      res.json({
        sessions: paginatedSessions,
        pagination: {
          page,
          limit,
          total: sessions.length,
          pages: Math.ceil(sessions.length / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sessions", error });
    }
  });

  // Get specific session
  app.get("/api/sessions/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch session", error });
    }
  });

  // Update session (for phase progression)
  app.patch("/api/sessions/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const updates = updateSessionSchema.parse(req.body);
      const session = await storage.updateSession(req.params.id, updates);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: "Invalid session update data", error });
    }
  });

  // Problem Statement Routes

  // Submit problem statement
  app.post("/api/sessions/:sessionId/problems", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const problemData = insertProblemSchema.parse({
        ...req.body,
        sessionId: req.params.sessionId,
        submittedBy: req.user!.id
      });
      const problem = await storage.createProblem(problemData);
      res.json(problem);
    } catch (error) {
      res.status(400).json({ message: "Invalid problem data", error });
    }
  });

  // Get session problems
  app.get("/api/sessions/:sessionId/problems", async (req, res) => {
    try {
      const problems = await storage.getSessionProblems(req.params.sessionId);
      res.json(problems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch problems", error });
    }
  });

  // Approve/reject problem (legacy route)
  app.patch("/api/problems/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const problem = await storage.updateProblemStatus(req.params.id, status);
      if (!problem) {
        return res.status(404).json({ message: "Problem not found" });
      }
      res.json(problem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update problem status", error });
    }
  });

  // Update problem status in session context (matches frontend expectation)
  app.patch("/api/sessions/:sessionId/problems/:problemId", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.body;
      const problem = await storage.updateProblemStatus(req.params.problemId, status);
      if (!problem) {
        return res.status(404).json({ message: "Problem not found" });
      }
      res.json(problem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update problem status", error });
    }
  });

  // Solution Generation Routes

  // Create solution (AI-generated)
  app.post("/api/sessions/:sessionId/solutions", authenticateUser, aiRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const solutionData = insertSolutionSchema.parse({
        ...req.body,
        sessionId: req.params.sessionId
      });
      const solution = await storage.createSolution(solutionData);
      res.json(solution);
    } catch (error) {
      res.status(400).json({ message: "Invalid solution data", error });
    }
  });

  // Get session solutions
  app.get("/api/sessions/:sessionId/solutions", async (req, res) => {
    try {
      const solutions = await storage.getSessionSolutions(req.params.sessionId);
      res.json(solutions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch solutions", error });
    }
  });

  // Get specific solution
  app.get("/api/solutions/:id", async (req, res) => {
    try {
      const solution = await storage.getSolution(req.params.id);
      if (!solution) {
        return res.status(404).json({ message: "Solution not found" });
      }
      res.json(solution);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch solution", error });
    }
  });

  // Debate Routes

  // Create debate point  
  app.post("/api/sessions/:sessionId/debate-points", authenticateUser, aiRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const pointData = insertDebatePointSchema.parse({
        ...req.body,
        sessionId: req.params.sessionId
      });
      const point = await storage.createDebatePoint(pointData);
      res.json(point);
    } catch (error) {
      res.status(400).json({ message: "Invalid debate point data", error });
    }
  });

  // Get session debate points
  app.get("/api/sessions/:sessionId/debate-points", async (req, res) => {
    try {
      const points = await storage.getSessionDebatePoints(req.params.sessionId);
      res.json(points);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch debate points", error });
    }
  });

  // Get solution debate points
  app.get("/api/solutions/:solutionId/debate-points", async (req, res) => {
    try {
      const points = await storage.getSolutionDebatePoints(req.params.solutionId);
      res.json(points);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch solution debate points", error });
    }
  });

  // Vote on debate point with transactional vote counting
  app.post("/api/debate-points/:pointId/vote", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const voteData = insertVoteSchema.parse({
        ...req.body,
        pointId: req.params.pointId,
        userId: req.user!.id
      });

      // Use transactional vote creation with count update
      const result = await storage.createVoteWithCountUpdate(voteData);
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      res.json(result.vote);
    } catch (error) {
      res.status(400).json({ message: "Invalid vote data", error });
    }
  });

  // Evidence Routes

  // Create evidence
  app.post("/api/sessions/:sessionId/evidence", async (req, res) => {
    try {
      const evidenceData = insertEvidenceSchema.parse({
        ...req.body,
        sessionId: req.params.sessionId
      });
      const evidence = await storage.createEvidence(evidenceData);
      res.json(evidence);
    } catch (error) {
      res.status(400).json({ message: "Invalid evidence data", error });
    }
  });

  // Get session evidence
  app.get("/api/sessions/:sessionId/evidence", async (req, res) => {
    try {
      const evidence = await storage.getSessionEvidence(req.params.sessionId);
      res.json(evidence);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch evidence", error });
    }
  });

  // Question Routes

  // Create question
  app.post("/api/sessions/:sessionId/questions", async (req, res) => {
    try {
      const questionData = insertQuestionSchema.parse({
        ...req.body,
        sessionId: req.params.sessionId
      });
      const question = await storage.createQuestion(questionData);
      res.json(question);
    } catch (error) {
      res.status(400).json({ message: "Invalid question data", error });
    }
  });

  // Get session questions
  app.get("/api/sessions/:sessionId/questions", async (req, res) => {
    try {
      const questions = await storage.getSessionQuestions(req.params.sessionId);
      res.json(questions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch questions", error });
    }
  });

  // Answer question
  app.patch("/api/questions/:id/answer", async (req, res) => {
    try {
      const { answer, answeredBy } = req.body;
      const question = await storage.updateQuestionAnswer(req.params.id, answer, answeredBy);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      res.json(question);
    } catch (error) {
      res.status(500).json({ message: "Failed to update question answer", error });
    }
  });


  // Phase Progression Routes

  // Progress to next phase
  app.post("/api/sessions/:sessionId/progress-phase", async (req, res) => {
    try {
      const session = await storage.getSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const currentPhase = session.currentPhase;
      if (currentPhase >= 6) {
        return res.status(400).json({ message: "Session already completed" });
      }

      const nextPhase = currentPhase + 1;
      const isCompleted = nextPhase > 6;
      
      const updatedSession = await storage.updateSession(req.params.sessionId, {
        currentPhase: isCompleted ? 6 : nextPhase,
        completedPhases: [...session.completedPhases, currentPhase],
        status: isCompleted ? "completed" : "in_progress"
      });

      res.json(updatedSession);
    } catch (error) {
      res.status(500).json({ message: "Failed to progress phase", error });
    }
  });

  // Workflow trigger routes (for AI agent processing)
  
  // Trigger solution generation
  app.post("/api/sessions/:sessionId/generate-solutions", async (req, res) => {
    try {
      const result = await orchestrator.processPhase(req.params.sessionId, 3);
      if (result.success) {
        res.json({ 
          message: "Solution generation completed", 
          sessionId: req.params.sessionId,
          messages: result.messages,
          nextActions: result.nextActions
        });
      } else {
        res.status(500).json({ message: result.error || "Failed to generate solutions" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to trigger solution generation", error });
    }
  });

  // Trigger debate round
  app.post("/api/sessions/:sessionId/start-debate", async (req, res) => {
    try {
      const result = await orchestrator.processPhase(req.params.sessionId, 4);
      if (result.success) {
        res.json({ 
          message: "Debate completed", 
          sessionId: req.params.sessionId,
          messages: result.messages,
          nextActions: result.nextActions
        });
      } else {
        res.status(500).json({ message: result.error || "Failed to conduct debate" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to start debate", error });
    }
  });

  // Trigger evidence gathering
  app.post("/api/sessions/:sessionId/gather-evidence", async (req, res) => {
    try {
      const result = await orchestrator.processPhase(req.params.sessionId, 5);
      if (result.success) {
        res.json({ 
          message: "Evidence gathering completed", 
          sessionId: req.params.sessionId,
          messages: result.messages,
          nextActions: result.nextActions
        });
      } else {
        res.status(500).json({ message: result.error || "Failed to gather evidence" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to trigger evidence gathering", error });
    }
  });

  // Trigger summary generation
  app.post("/api/sessions/:sessionId/generate-summary", async (req, res) => {
    try {
      const result = await orchestrator.processPhase(req.params.sessionId, 6);
      if (result.success) {
        res.json({ 
          message: "Summary generation completed", 
          sessionId: req.params.sessionId,
          messages: result.messages,
          nextActions: result.nextActions
        });
      } else {
        res.status(500).json({ message: result.error || "Failed to generate summary" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to trigger summary generation", error });
    }
  });

  // Process current phase automatically
  app.post("/api/sessions/:sessionId/process-current-phase", async (req, res) => {
    try {
      const session = await storage.getSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Validate phase bounds
      if (session.currentPhase < 1 || session.currentPhase > 6) {
        return res.status(400).json({ message: `Invalid phase: ${session.currentPhase}` });
      }

      const result = await orchestrator.processPhase(req.params.sessionId, session.currentPhase);
      if (result.success) {
        res.json({ 
          message: `Phase ${session.currentPhase} processing completed`, 
          sessionId: req.params.sessionId,
          currentPhase: session.currentPhase,
          nextPhase: Math.min(session.currentPhase + 1, 6),
          messages: result.messages,
          nextActions: result.nextActions,
          phaseComplete: result.phaseComplete,
          data: result.data || {}
        });
      } else {
        res.status(500).json({ 
          message: result.error || "Failed to process current phase",
          sessionId: req.params.sessionId,
          currentPhase: session.currentPhase,
          success: false
        });
      }
    } catch (error) {
      console.error("Phase processing error:", error);
      res.status(500).json({ 
        message: "Failed to process current phase", 
        error: error instanceof Error ? error.message : "Unknown error",
        sessionId: req.params.sessionId
      });
    }
  });

  // Voice Integration Routes
  
  // Health check for voice service
  app.get("/api/voice/health", async (req, res) => {
    try {
      const voiceService = getVoiceService();
      const health = await voiceService.getHealth();
      
      if (health.available) {
        res.json({
          status: "healthy",
          available: true,
          configured: health.configured
        });
      } else {
        res.status(503).json({
          status: "unavailable",
          available: false,
          configured: health.configured,
          error: health.lastError || "Service unavailable"
        });
      }
    } catch (error) {
      res.status(503).json({
        status: "error",
        available: false,
        configured: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Generate speech from text
  app.post("/api/voice/generate", async (req, res) => {
    try {
      const voiceService = getVoiceService();
      
      // Check service availability first
      const isAvailable = await voiceService.isServiceAvailable();
      if (!isAvailable) {
        const health = await voiceService.getHealth();
        return res.status(503).json({ 
          message: "Voice service is currently unavailable", 
          error: health.lastError || "Service not available",
          configured: health.configured
        });
      }

      // Validate request with Zod schema
      const validation = AudioGenerationRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validation.error.issues 
        });
      }

      const { text, voiceId, modelId, voiceSettings } = validation.data;

      const result = await voiceService.generateSpeech({
        text,
        voiceId,
        modelId,
        voiceSettings
      });

      res.json({
        success: true,
        audioUrl: result.audioUrl,
        duration: result.duration,
        characterCount: result.characterCount
      });
    } catch (error) {
      console.error("Speech generation error:", error);
      if (error instanceof Error && error.message.includes('not available')) {
        res.status(503).json({ 
          message: "Voice service is currently unavailable", 
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          message: "Failed to generate speech", 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }
  });

  // Narrate debate summary
  app.post("/api/voice/narrate-debate/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // Get session and debate data
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const problems = await storage.getSessionProblems(sessionId);
      const approvedProblem = problems.find(p => p.status === 'approved');
      
      if (!approvedProblem) {
        return res.status(400).json({ message: "No approved problem found for narration" });
      }

      const debatePoints = await storage.getSessionDebatePoints(sessionId);
      const sessionSummary = await storage.getSessionSummary(sessionId);

      // Build debate summary structure
      const rounds = debatePoints.reduce((acc, point) => {
        const roundIndex = point.round - 1;
        if (!acc[roundIndex]) {
          acc[roundIndex] = {
            roundNumber: point.round,
            summary: `Round ${point.round}: Debate between proponent and opponent positions.`,
            winnerRole: 'draw' as const
          };
        }
        return acc;
      }, [] as any[]);

      const finalSummary = sessionSummary;
      
      const debateSummaryData = {
        sessionTitle: session.title,
        problemStatement: approvedProblem.description,
        rounds: rounds.length > 0 ? rounds : [{
          roundNumber: 1,
          summary: "Debate session completed with arguments from both sides.",
          winnerRole: 'draw' as const
        }],
        finalConclusion: finalSummary?.content || "Thank you for participating in this AI Think Tank session.",
        winnerPosition: 'draw' as const
      };

      const voiceService = getVoiceService();
      
      // Check service availability first
      const isAvailable = await voiceService.isServiceAvailable();
      if (!isAvailable) {
        const health = await voiceService.getHealth();
        return res.status(503).json({ 
          message: "Voice service is currently unavailable", 
          error: health.lastError || "Service not available",
          configured: health.configured
        });
      }

      const result = await voiceService.narrateDebateSummary(debateSummaryData);

      res.json({
        success: true,
        audioUrl: result.audioUrl,
        duration: result.duration,
        characterCount: result.characterCount,
        title: `Debate Summary: ${session.title}`
      });
    } catch (error) {
      console.error("Debate narration error:", error);
      if (error instanceof Error && error.message.includes('not available')) {
        res.status(503).json({ 
          message: "Voice service is currently unavailable", 
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          message: "Failed to generate debate narration", 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }
  });

  // Narrate problem statement
  app.post("/api/voice/narrate-problem", async (req, res) => {
    try {
      const { problemStatement, context } = req.body;
      
      if (!problemStatement || typeof problemStatement !== 'string') {
        return res.status(400).json({ message: "Problem statement is required" });
      }

      const voiceService = getVoiceService();
      
      // Check service availability first
      const isAvailable = await voiceService.isServiceAvailable();
      if (!isAvailable) {
        const health = await voiceService.getHealth();
        return res.status(503).json({ 
          message: "Voice service is currently unavailable", 
          error: health.lastError || "Service not available",
          configured: health.configured
        });
      }

      const result = await voiceService.narrateProblemStatement(problemStatement, context);

      res.json({
        success: true,
        audioUrl: result.audioUrl,
        duration: result.duration,
        characterCount: result.characterCount,
        title: "Problem Statement Confirmation"
      });
    } catch (error) {
      console.error("Problem narration error:", error);
      if (error instanceof Error && error.message.includes('not available')) {
        res.status(503).json({ 
          message: "Voice service is currently unavailable", 
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          message: "Failed to generate problem narration", 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }
  });

  // Get available voices
  app.get("/api/voice/voices", async (req, res) => {
    try {
      const voiceService = getVoiceService();
      
      // Check service availability first
      const isAvailable = await voiceService.isServiceAvailable();
      if (!isAvailable) {
        const health = await voiceService.getHealth();
        return res.status(503).json({ 
          message: "Voice service is currently unavailable", 
          error: health.lastError || "Service not available",
          configured: health.configured,
          voices: []
        });
      }

      const voices = await voiceService.getAvailableVoices();
      res.json({
        success: true,
        voices
      });
    } catch (error) {
      console.error("Failed to fetch voices:", error);
      if (error instanceof Error && error.message.includes('not available')) {
        res.status(503).json({ 
          message: "Voice service is currently unavailable", 
          error: error.message,
          voices: [] 
        });
      } else {
        res.status(500).json({ 
          message: "Failed to fetch available voices", 
          error: error instanceof Error ? error.message : "Unknown error",
          voices: []
        });
      }
    }
  });

  // Summary and Library Routes

  // Get session summary
  app.get("/api/sessions/:sessionId/summary", async (req, res) => {
    try {
      const summary = await storage.getSessionSummary(req.params.sessionId);
      if (!summary) {
        return res.status(404).json({ message: "Summary not found" });
      }
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch summary", error });
    }
  });

  // Create or update session summary
  app.post("/api/sessions/:sessionId/summary", async (req, res) => {
    try {
      const summaryData = insertSummarySchema.omit({ sessionId: true }).parse(req.body);
      const summary = await storage.upsertSummary(req.params.sessionId, summaryData);
      
      // Mark session as completed when summary is saved
      await storage.updateSession(req.params.sessionId, { 
        status: "completed",
        currentPhase: 6,
        completedPhases: [1, 2, 3, 4, 5, 6]
      });
      
      res.json(summary);
    } catch (error) {
      res.status(400).json({ message: "Invalid summary data", error });
    }
  });

  // Generate AI summary from session data
  app.post("/api/sessions/:sessionId/summary/generate", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      
      // Fetch session data
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Generate summary using orchestrator
      const summaryResult = await orchestrator.generateSummary(sessionId);
      
      if (!summaryResult.success) {
        return res.status(500).json({ 
          message: "Failed to generate summary", 
          error: summaryResult.error 
        });
      }

      // Save the generated summary
      const summary = await storage.upsertSummary(sessionId, summaryResult.summary);
      
      // Mark session as completed
      await storage.updateSession(sessionId, { 
        status: "completed",
        currentPhase: 6,
        completedPhases: [1, 2, 3, 4, 5, 6]
      });

      res.json(summary);
    } catch (error) {
      console.error("Summary generation error:", error);
      res.status(500).json({ 
        message: "Failed to generate summary", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Get library sessions (with filtering)
  app.get("/api/library", async (req, res) => {
    try {
      const { status, outcome } = req.query;
      const filter: any = {};
      
      if (status && typeof status === 'string') {
        filter.status = status;
      }
      if (outcome && typeof outcome === 'string') {
        filter.outcome = outcome;
      }

      const sessions = await storage.listSessions(filter);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch library sessions", error });
    }
  });

  // Get summary narration (voice synthesis)
  app.get("/api/sessions/:sessionId/narration", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const voiceId = req.query.voice as string || "21m00Tcm4TlvDq8ikWAM"; // Default voice
      
      // Get session summary
      const summary = await storage.getSessionSummary(sessionId);
      if (!summary) {
        return res.status(404).json({ message: "Summary not found" });
      }

      const voiceService = getVoiceService();
      
      // Check service availability
      const isAvailable = await voiceService.isServiceAvailable();
      if (!isAvailable) {
        const health = await voiceService.getHealth();
        return res.status(503).json({ 
          message: "Voice service is currently unavailable", 
          error: health.lastError || "Service not available",
          configured: health.configured
        });
      }

      // Create narration text from summary
      const narrationText = `
      Session Summary: ${summary.moderatorInsights}
      
      Key Decision Prompts: ${summary.decisionPrompts.join('. ')}
      
      ${summary.recommendedActions ? `Recommended Actions: ${summary.recommendedActions}` : ''}
      `.trim();

      // Generate audio
      const result = await voiceService.generateAudio(narrationText, voiceId);

      res.json({
        success: true,
        audioUrl: result.audioUrl,
        duration: result.duration,
        characterCount: result.characterCount,
        title: "Session Summary Narration"
      });
    } catch (error) {
      console.error("Summary narration error:", error);
      if (error instanceof Error && error.message.includes('not available')) {
        res.status(503).json({ 
          message: "Voice service is currently unavailable", 
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          message: "Failed to generate summary narration", 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
