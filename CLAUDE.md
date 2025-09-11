# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Naver Maps Field Management Program (네이버 지도 필지 관리 프로그램) - a web application for managing parcels/lots using Naver Maps API and Vworld API. It allows users to visualize, color-code, and manage land parcel information with features like address search, parcel data management, and Google Sheets integration.

## Development Commands

```bash
# Development server (Express.js) - Primary method
node server.js

# Testing (Playwright) - 30 test files available
npm test                # Run all tests
npx playwright test     # Run Playwright tests directly
npx playwright test --ui # Run tests with UI mode
npx playwright test tests/final-production-test.spec.js # Run final production test
npx playwright test tests/api-response-check.spec.js # API response validation
npx playwright test tests/8-color-click-test.spec.js # Color functionality test
npx playwright test --grep "parcel" # Run tests matching pattern
npx playwright test --grep "color" # Run color-related tests

# Environment setup
cp .env.example .env    # Copy environment template
# Edit .env with your API keys

# Legacy serving methods (from README.md, less preferred)
python -m http.server 8000  # Python server on port 8000
npx http-server             # Node.js static server

# Note: package.json contains Next.js commands but project uses static Express.js
npm run dev            # Next.js dev (not used in this static project)
npm run build          # Next.js build (not used)
npm run start          # Next.js start (not used)
```

The server runs on port 3000 by default, with automatic fallback to port 4000 if 3000 is occupied.

## Architecture Overview

### Frontend Structure
- **Static HTML/CSS/JavaScript application** served via Express.js (40+ JS modules)
- **Main entry point**: `public/index.html` with Korean UI
- **Core Architecture Classes** in `public/js/`:
  - `map-engine.js` - Centralized MapEngine class for Naver Maps v3 integration
  - `api-racing.js` - APIRacingSystem: Multi-API competitive racing with Cache/VWorld/Backup APIs
  - `data-manager.js` - Triple-layer DataManager: localStorage → Supabase → Google Sheets
  - `smart-cache.js` - 30-second TTL caching with circuit breaker pattern
  - `status-monitor.js` - Real-time API performance and sync status monitoring
  - `search-clean.js` - Address/parcel search with geocoding integration
  - `config-clean.js`, `config-client.js` - Multi-environment API configuration management
  - `ui-handler.js`, `mobile-handler.js` - Responsive UI and mobile optimizations

### Backend Structure
- **Express.js server** (`server.js`) with:
  - Static file serving from `/public`
  - CORS enabled for API requests
  - **VWorld API proxy** at `/api/vworld` with 5-key rotation fallback system
  - Automatic port conflict resolution (3000 → 4000)
  - Comprehensive error logging and request monitoring

### API Integration & Racing System
- **Multi-API Racing Architecture**: APIRacingSystem class manages competitive API calls
  - **Cache Layer** (Priority -1): 30-second TTL with instant response
  - **VWorld Serverless** (Priority 1): Primary `/api/vworld` proxy with 5-key rotation
  - **VWorld Direct** (Priority 2): Direct API calls with CORS handling
  - **Backup Nominatim** (Priority 3): OSM-based fallback for parcel boundary approximation
- **Naver Maps API v3** - Map rendering, geocoding, panorama (Client ID in config)
- **Supabase Integration** - Real-time database with 2-second debounced sync, conflict resolution
- **Google Sheets API** - Batch export with exponential backoff retry logic

### Key Configuration Files
- `.env` / `.env.example` - API keys (Naver, VWorld, Google)
- `public/js/config.js` - Frontend configuration and API keys
- `playwright.config.js` - Test configuration with web security disabled
- `package.json` - Dependencies and scripts
- `db/schema-korean.sql` - Supabase database schema
- `db/migration-functions-final.sql` - Data migration RPC functions
- `db/setup-complete.sql` - Complete database setup script

### Testing Framework
- **Playwright tests** in `/tests` directory (30 test files) covering:
  - **Production Tests**: `final-production-test.spec.js`, `production-debug-test.spec.js`
  - **API Integration**: `api-response-check.spec.js`, `api-test.spec.js`, `vworld-test-api.spec.js`
  - **Color System**: `8-color-click-test.spec.js`, `quick-color-test.spec.js`, `simple-color-test.spec.js`
  - **Real Parcel Data**: `real-parcel-api-test.spec.js`, `polygon-rendering-test.spec.js`
  - **Initialization**: `initialization-debug-test.spec.js`, `config-load-test.spec.js`
  - **Live Environment**: `vercel-live-test.spec.js`, `nominatim-live-test.spec.js`
  - **Performance**: `quick-polygon-test.spec.js`, `simple-load-test.spec.js`
  - **UI Components**: `all-buttons.spec.js`, `search.spec.js`
- **Test Configuration**: Chromium with `--disable-web-security` and `--disable-features=VizDisplayCompositor`
- **Test Environment**: Runs against local server on port 3000

## Important Notes

### API Key Management
- **VWorld API**: 5 keys with intelligent rotation on failure (`5090194F...`, `CEB482F7...`, etc.)
- **Naver Maps**: Client ID `xzbnwd2h1z` embedded in frontend
- **Supabase**: Real-time database with row-level security
- Environment variables should be set in `.env` file

### Development Workflow
1. Copy `.env.example` to `.env` and configure API keys
2. Start server: `node server.js`
3. Access at `http://localhost:3000` (auto-fallback to :4000)
4. Monitor sync status via built-in UI indicators
5. Run tests: `npm test` for end-to-end validation

### Critical Architecture Patterns

#### Multi-API Racing System (`api-racing.js`)
- **Competitive API Architecture**: Multiple APIs race simultaneously, fastest response wins
- **Intelligent Fallback Chain**: Cache → VWorld Serverless → VWorld Direct → Backup Nominatim
- **Performance Monitoring**: Real-time success rates, response times, automatic API health tracking
- **Circuit Breaker Pattern**: Auto-disable failing APIs, gradual recovery with exponential backoff

#### Triple-Layer Data Management (`data-manager.js`)
- **Storage Hierarchy**: localStorage (instant) → Supabase (2-second debounced) → Google Sheets (backup)
- **Conflict Prevention**: Data versioning, checksums, distributed locking with 30-second timeout
- **Performance Optimization**: Memory caching (30s TTL), connection pooling, dynamic batch sizing
- **Resilience Patterns**: 5-attempt retry logic, exponential backoff, circuit breaker for cloud sync

#### Map Engine Integration (`map-engine.js`)
- **Overlay Tracking System**: Centralized polygon management with window.map.overlays registry
- **Event-Driven Architecture**: Map clicks trigger parcel data fetching via API racing system
- **State Management**: Global AppState coordination between map, data, and UI components

### Development Workflow Critical Points

#### Environment Setup
- **Required**: Copy `.env.example` to `.env` and configure all API keys before starting
- **VWorld API Keys**: Server supports 5-key rotation - add VWORLD_API_KEY_1 through VWORLD_API_KEY_4
- **Naver Client ID**: Must be registered for localhost domain in Naver Cloud Console
- **Supabase**: Database tables must exist - run SQL files in `/db` directory if needed

#### Server Features (`server.js`)
- **Intelligent Port Management**: Auto-fallback 3000 → 4000 with comprehensive error handling
- **Multi-API Proxy**: `/api/vworld` endpoint with intelligent key rotation and failure detection
- **CORS Handling**: Full CORS support for cross-origin API calls and development
- **Real-time Configuration**: `/api/config` endpoint provides client-safe environment variables

#### Testing Strategy
- **Production Validation**: Always run `final-production-test.spec.js` before deployment
- **Color System Testing**: Critical user feature - run color-related tests frequently
- **API Health Monitoring**: Use `api-response-check.spec.js` for API endpoint validation
- **Cross-browser**: Playwright configured for Chromium with security disabled for CORS testing