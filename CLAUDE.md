# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Build and Development
- **Frontend**: `npm run dev` (development), `npm run build` (production)
- **Backend**: `npm run dev` (nodemon), `npm run build` (TypeScript compilation)
- **Docker**: `make up` (production), `make up-dev` (development)
- **Linting**: `make lint` or `npm run lint` (backend), `npm run lint` (frontend)
- **Testing**: `make test` or `npm test` (backend only)

### Docker Operations
- Start services: `make up` (production) or `make up-dev` (development)
- Stop services: `make down` or `make down-dev`
- View logs: `make logs` or `make logs-dev`
- Health check: `make health`
- Clean up: `make clean`

### LDAP/AD Testing
- Test AD connection: `make test-ldap` or `curl http://localhost:8000/api/v1/users/connection-test`
- Validate configuration: `make validate-config`

## Architecture Overview

This is a full-stack AD User Creator application with React frontend and Express.js backend for creating users in Active Directory via LDAP.

### Frontend (`src/`)
- **Technology**: React 18 + TypeScript + Vite + Tailwind CSS
- **UI Components**: Radix UI components in `src/components/ui/`
- **Main Component**: `UserCreationForm.tsx` handles user creation workflow
- **State Management**: React Query for API calls
- **Routing**: React Router (pages in `src/pages/`)

### Backend (`backend/src/`)
- **Technology**: Express.js + TypeScript + ldapjs
- **Core Service**: `adService.ts` - handles all LDAP operations with Active Directory
- **API Routes**: REST endpoints in `routes/users.ts`
- **Validation**: Joi schemas in `schemas/user.ts`
- **Configuration**: Environment-based config in `config/index.ts`
- **Logging**: Winston with structured logging

### Key LDAP Integration Details
- **Connection Management**: ADService class with connection pooling and mutex for concurrent requests
- **Error Recovery**: Automatic reconnection on connection failures
- **User Creation**: Creates users in specified AD OU with proper LDAP attributes
- **Username Suggestions**: Generates available usernames based on first/last name
- **Password Validation**: Configurable password requirements

### Docker Architecture
- **Multi-container**: Frontend (Nginx) + Backend (Node.js) + optional Nginx proxy
- **Development**: Hot reload with volume mounts via `docker-compose.dev.yml`
- **Production**: Optimized builds with multi-stage Dockerfiles

## Environment Configuration

### Required Environment Variables
The application requires these AD/LDAP environment variables in `.env`:

```
AD_SERVER=ldap://server:389
AD_DOMAIN=domain.local
AD_BASE_DN=DC=domain,DC=local
AD_USERNAME=service_account
AD_PASSWORD=service_password
AD_USERS_OU=OU=Users,DC=domain,DC=local
```

### Development Setup
1. Copy `env.example` to `.env` and configure AD settings
2. For Docker: `make up-dev`
3. For local development: `npm run dev` in both frontend and backend dirs

## API Endpoints

### User Management
- `POST /api/v1/users/create` - Create AD user
- `GET /api/v1/users/exists/{login_name}` - Check user existence
- `GET /api/v1/users/info/{login_name}` - Get user info
- `POST /api/v1/users/validate-password` - Validate password strength
- `GET /api/v1/users/suggest-username/{first_name}/{last_name}` - Generate username suggestions
- `GET /api/v1/users/connection-test` - Test AD connectivity

### System
- `GET /health` - Health check endpoint
- `GET /` - API information

## Important Implementation Notes

### LDAP Connection Handling
- The ADService uses a connection mutex to prevent deadlocks
- Connections are automatically retried on failure
- Timeout handling prevents hanging connections
- All LDAP operations are properly bound and unbound

### Security Features
- Helmet for security headers
- CORS configuration
- Rate limiting
- Input validation with Joi
- Password complexity requirements

### Error Handling
- Custom error types for different failure scenarios
- Structured error responses with appropriate HTTP status codes
- Comprehensive logging for debugging AD issues

### Testing and Diagnostics
Multiple shell scripts are available for AD diagnosis:
- `diagnose-ad.sh` - Basic AD connectivity tests
- `test-backend.sh` - Backend API testing
- Various other diagnostic utilities

When working with this codebase, always ensure AD connectivity is working before attempting user operations, and check the backend logs for LDAP-related issues.