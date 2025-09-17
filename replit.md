# AI Think Tank - Design Thinking Workshop Platform

## Overview

AI Think Tank is a sophisticated web application that facilitates AI-powered design thinking workshops. The platform guides teams through a structured 6-phase process where specialized AI agents collaborate to transform problem statements into evidence-based solution proposals through structured debates. Five AI agents participate: Solution Agent, Proponent, Opponent, Analyst, and Moderator, each with distinct roles in the collaborative problem-solving process.

The application serves facilitators who manage workshop sessions and participants who engage with the AI-driven debate process. Key features include problem statement submission, AI-generated solution proposals, structured debates between proponent and opponent agents, evidence gathering with citations, and comprehensive summaries with actionable next steps.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type-safe component development
- **Routing**: Wouter for lightweight client-side routing between workshop phases
- **UI Components**: Radix UI primitives with shadcn/ui design system for consistent, accessible interfaces
- **Styling**: Tailwind CSS with custom design tokens for light/dark theme support
- **State Management**: TanStack Query for server state management and React Context for session state
- **Design System**: Custom component library inspired by Notion and Linear with sophisticated information hierarchy

### Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful endpoints organized by feature domains (sessions, problems, solutions, debates)
- **Agent System**: Modular AI agent architecture with base classes and specialized implementations
- **Orchestration**: Central orchestrator manages multi-agent workflows and phase progression

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Schema**: Comprehensive relational model supporting sessions, problems, solutions, debate points, evidence, and voting
- **Migrations**: Structured database versioning with Drizzle Kit
- **Data Relationships**: Foreign key constraints maintaining referential integrity across workshop entities

### AI Agent Architecture
- **Provider Abstraction**: Unified interface supporting OpenAI, Anthropic, and Google Gemini models
- **Agent Specialization**: Five distinct agent types with role-specific system prompts and behaviors
- **Context Management**: Shared context objects enabling agents to build upon previous interactions
- **Debate Engine**: Sophisticated multi-round debate system with voting and consensus tracking

### Authentication & Sessions
- **Session Management**: HTTP sessions with PostgreSQL session store for persistent login state
- **User System**: Bcrypt-hashed passwords with role-based access (facilitators vs participants)
- **Context Persistence**: Session state maintained in React Context with localStorage backup

### Voice Integration
- **Speech Recognition**: Browser Web Speech API for voice input functionality
- **Text-to-Speech**: ElevenLabs integration for AI-generated audio narration
- **Audio Management**: Client-side audio controls with playback state management

## External Dependencies

### AI Services
- **OpenAI GPT-4**: Primary model for Solution and Proponent agents
- **Anthropic Claude**: Used for Moderator and Opponent agents for balanced perspectives
- **Google Gemini**: Alternative provider for redundancy and specialized tasks
- **Perplexity API**: Real-world evidence gathering for Analyst agent citations

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **PostgreSQL**: Primary database with full ACID compliance and complex query support

### UI & Design Libraries
- **Radix UI**: Headless component primitives for accessibility compliance
- **Lucide React**: Consistent icon library for interface elements
- **Google Fonts**: Inter typography for professional appearance

### Development Tools
- **Vite**: Fast development server with hot module replacement
- **ESBuild**: Production bundling for optimized server builds
- **TypeScript**: Static typing across frontend, backend, and shared schemas

### Voice Services
- **ElevenLabs**: High-quality text-to-speech for workshop summaries and narration
- **Web Speech API**: Browser-native speech recognition for problem statement input

### Build & Deployment
- **Replit**: Development environment with integrated deployment pipeline
- **Node.js**: Server runtime supporting ES modules and modern JavaScript features