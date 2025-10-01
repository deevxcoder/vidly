# YouTube Video Management Platform

## Overview

A full-stack web application for managing and publishing videos across multiple YouTube channels. The platform provides a centralized dashboard for content creators to upload videos, organize their content library, connect multiple YouTube channels, and publish videos to selected channels. Built with a modern tech stack featuring React, Express, PostgreSQL, and the YouTube Data API.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework:** React with TypeScript and Vite as the build tool
- **UI Library:** Shadcn UI components built on Radix UI primitives
- **Styling:** Tailwind CSS with custom design system inspired by YouTube Creator Studio
- **State Management:** TanStack Query (React Query) for server state
- **Routing:** Wouter for client-side routing
- **Form Handling:** React Hook Form with Zod validation

**Design System:**
- Professional content creator aesthetic with card-based layouts
- YouTube-inspired color palette (brand red: `hsl(0 100% 50%)`)
- Roboto font family for consistency with Google products
- Responsive grid layouts with Tailwind spacing primitives
- Custom elevation system for hover states (`hover-elevate`, `active-elevate-2`)

**Key Pages:**
- Landing page for unauthenticated users
- Login/Signup flows with session-based authentication
- Dashboard with stats overview and recent activity
- Video library with grid/list view toggles and status filtering
- Upload page with drag-and-drop interface
- Channels management for connecting YouTube accounts
- Settings page for API configuration

### Backend Architecture

**Technology Stack:**
- **Runtime:** Node.js with Express.js framework
- **Language:** TypeScript with ES modules
- **Database ORM:** Drizzle ORM for type-safe database operations
- **Database:** PostgreSQL via Neon serverless driver with WebSocket support
- **Session Management:** express-session with connect-pg-simple for PostgreSQL-backed sessions
- **Authentication:** bcrypt for password hashing (10 salt rounds)
- **File Upload:** Multer for handling multipart/form-data video uploads

**API Structure:**
- RESTful API design with `/api` prefix
- Authentication routes: `/api/auth/signup`, `/api/auth/login`, `/api/auth/user`
- Video management: `/api/videos` (CRUD operations), `/api/videos/upload`, `/api/videos/:id/publish`
- YouTube integration: `/api/youtube/oauth/url`, `/api/youtube/oauth/callback`, `/api/youtube/channels`
- Session-based authentication with HTTP-only cookies

**Database Schema:**
- **users:** Core user accounts with email/password authentication
- **sessions:** PostgreSQL-backed session storage (auto-created by connect-pg-simple)
- **videos:** Video metadata including title, description, file path, and upload status
- **youtubeChannels:** Connected YouTube channel information with subscriber counts
- **youtubeTokens:** OAuth 2.0 tokens (access/refresh) for YouTube API authentication

**Storage Strategy:**
- Video files stored locally in `uploads/` directory
- File size limit: 1GB per upload
- Allowed formats: MP4, MPEG, QuickTime, AVI, Matroska (MKV)
- Unique filenames generated using timestamp and random suffix

### Authentication & Authorization

**Session Management:**
- Session TTL: 7 days (604,800,000ms)
- Production: secure cookies with HTTPS only
- Development: fallback to MemoryStore if DATABASE_URL unavailable
- Trust proxy enabled for deployment behind reverse proxies

**Password Security:**
- bcrypt hashing with 10 salt rounds
- Minimum password length: 6 characters enforced client and server-side
- Passwords never returned in API responses

**Route Protection:**
- Session validation middleware on protected routes
- 401 Unauthorized responses trigger client-side redirects to login
- Query client configured to handle 401s gracefully

### External Dependencies

**YouTube Data API v3:**
- **OAuth 2.0 Flow:** Three-legged OAuth with offline access for refresh tokens
- **Scopes Required:**
  - `youtube.readonly` - Read channel information
  - `youtube.upload` - Upload videos to channels
  - `youtube.force-ssl` - Full account access over SSL
- **Configuration:** Client ID and Secret stored in environment variables (`YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`)
- **OAuth Callback:** Dynamic redirect URI based on deployment domain (`REPLIT_DEV_DOMAIN` or localhost fallback)
- **Token Storage:** Access and refresh tokens stored per channel in `youtubeTokens` table
- **Token Refresh:** Automatic token refresh when access tokens expire

**Database Service:**
- **Provider:** Neon serverless PostgreSQL
- **Connection:** WebSocket-based connections using `@neondatabase/serverless` and `ws`
- **Connection Pooling:** Single pool instance with lazy initialization
- **Retry Logic:** 10 retry attempts with 500ms delay on startup if DATABASE_URL unavailable
- **Migrations:** Drizzle Kit for schema migrations stored in `migrations/` directory

**Google Fonts CDN:**
- Roboto font family (weights 100-900, regular and italic)
- Roboto Mono for technical data display
- Preconnect optimization for faster font loading

**Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string (required)
- `SESSION_SECRET` - Session encryption key (defaults to placeholder in dev)
- `YOUTUBE_CLIENT_ID` - Google OAuth client ID (required for YouTube features)
- `YOUTUBE_CLIENT_SECRET` - Google OAuth client secret (required for YouTube features)
- `REPLIT_DEV_DOMAIN` - Deployment domain for OAuth callbacks (optional, defaults to localhost)
- `NODE_ENV` - Environment flag (development/production)

**Build & Development Tools:**
- Vite plugins: React, runtime error overlay, Replit cartographer and dev banner (dev-only)
- ESBuild for server-side bundling
- TypeScript with strict mode and incremental compilation
- Path aliases: `@/` for client source, `@shared/` for shared types