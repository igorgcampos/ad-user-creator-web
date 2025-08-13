# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Build and Development
- **Frontend**: `npm run dev` (development), `npm run build` (production)
- **Backend**: `npm run dev` (nodemon), `npm run build` (TypeScript compilation)
- **Docker**: `make up` (production), `make up-dev` (development)
- **Linting**: `make lint` or `npm run lint` (backend), `npm run lint` (frontend)
- **Testing**: `make test` or `npm test` (backend only)
- **Dependencies**: New dependencies: `async-mutex`, `node-cache`, `winston-daily-rotate-file`

### Docker Operations
- Start services: `make up` (production) or `make up-dev` (development)
- Stop services: `make down` or `make down-dev`
- View logs: `make logs` or `make logs-dev`
- Health check: `make health`
- Clean up: `make clean`

### LDAP/AD Testing
- Test AD connection: `make test-ldap` or `docker-compose exec backend curl http://localhost:8000/api/v1/users/connection-test`
- Validate configuration: `make validate-config`
- Test circuit breaker: Monitor logs for circuit breaker state changes
- Test cache performance: Check cache hit/miss rates in logs
- Test connection pool: Monitor active connections via health endpoint

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
- **Core Service**: `adService.ts` - handles all LDAP operations with connection pooling, circuit breaker, and caching
- **API Routes**: REST endpoints in `routes/users.ts`
- **Validation**: Joi schemas in `schemas/user.ts`
- **Configuration**: Environment-based config in `config/index.ts`
- **Logging**: Winston with structured logging, daily rotation, and secure credential handling

### Key LDAP Integration Details
- **Connection Management**: ADService class with LDAP connection pooling (up to 10 concurrent connections)
- **Circuit Breaker Pattern**: Automatic service protection against cascading failures with recovery
- **Thread-Safe Operations**: async-mutex library for proper concurrency control
- **Cache Layer**: Intelligent caching with TTL for user existence, info, and username suggestions
- **LDAP Injection Prevention**: Complete input sanitization with escapeLDAPFilter function
- **Error Recovery**: Automatic reconnection on connection failures with exponential backoff
- **User Creation**: Creates users in specified AD OU with proper LDAP attributes
- **Username Suggestions**: Generates available usernames based on first/last name with caching
- **Password Validation**: Configurable password requirements with real-time validation

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
- **Connection Pooling**: Pool of up to 10 concurrent LDAP connections with automatic management
- **Circuit Breaker**: Automatic failure detection and recovery with configurable thresholds
- **Thread-Safe Operations**: async-mutex library prevents race conditions and deadlocks
- **Cache Layer**: 5-10 minute TTL cache for frequent operations (user existence, info lookups)
- **Input Sanitization**: Complete LDAP injection prevention with character escaping
- **Automatic Retry**: Connections are automatically retried on failure with exponential backoff
- **Timeout Handling**: Comprehensive timeout handling prevents hanging connections
- **Resource Management**: Proper connection binding/unbinding with automatic cleanup
- **Memory Leak Prevention**: Event listener cleanup and connection disposal
- **Health Monitoring**: Continuous connection health checking and automatic recovery

### Security Features
- **LDAP Injection Prevention**: Complete input sanitization and escaping
- **Credential Security**: Sanitized logging without credential exposure
- **Connection Pool Security**: Secure connection management with automatic cleanup
- **Circuit Breaker Protection**: DoS and cascading failure protection
- **Helmet**: Complete security headers
- **CORS configuration**: Environment-specific CORS settings
- **Rate limiting**: Configurable per-endpoint rate limiting
- **Input validation**: Comprehensive Joi schema validation
- **Password complexity**: Configurable password requirements
- **Memory Leak Prevention**: Proper event listener cleanup and resource management

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

## New Architecture Features (Latest Updates)

### Connection Pooling
- ADService now uses a connection pool with up to 10 concurrent LDAP connections
- Automatic connection health monitoring and cleanup
- Thread-safe operations using async-mutex library

### Circuit Breaker Pattern
- Automatic failure detection with configurable thresholds (default: 5 failures)
- 60-second recovery timeout with automatic state transitions
- Prevents cascading failures and improves system resilience

### Caching Layer
- 5-minute TTL cache for user existence checks
- 10-minute TTL cache for user information lookups  
- 1-hour TTL cache for username suggestions
- Automatic cache invalidation on user creation

### Security Improvements
- Complete LDAP injection prevention with input escaping
- Sanitized logging that never exposes credentials or sensitive information
- Memory leak prevention with proper event listener cleanup
- Secure connection management with automatic resource disposal

### Logging and Monitoring
- Daily log rotation with 20MB file size limits
- 14-day log retention policy
- Structured JSON logging with service metadata
- Circuit breaker state change logging
- Connection pool metrics and health information

### Important Notes for Development
- The backend now requires the new dependencies: `async-mutex`, `node-cache`, `winston-daily-rotate-file`
- Environment variables must be properly configured in `backend/.env`
- Frontend is served on port 8082, backend runs internally on port 8000
- All LDAP operations are now cached and much more performant
- Connection failures are automatically handled with circuit breaker pattern
- Memory usage is optimized with proper resource cleanup