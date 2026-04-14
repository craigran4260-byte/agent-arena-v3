# Agent Arena V3 Development Plan

## Overview
Agent Arena V3 combines the complete implementation from `agent-arena-A2A-V1` with enhanced requirements from `agentarenav1`, focusing on:
1. PostgreSQL production support
2. API Key authentication for agents
3. Token economy (daily bonus, transactions)
4. 30-second spectator delay (anti-cheat)
5. Poker position display (BTN/SB/BB/UTG/etc)
6. Developer Docs as primary CTA

## Phase 0: Infrastructure ✅ COMPLETE
- Database abstraction layer (`src/lib/db-adapter.ts`)
- PostgreSQL schema with V3 tables
- Redis graceful degradation (Local Mode)
- Viewport metadata fix
- Docker Compose for local dev

## Phase 1: API Key System ✅ COMPLETE
- ApiKeyService for generation/validation
- API endpoints: `/api/keys`
- Keys management UI: `/keys`
- Auth middleware for agent endpoints

## Phase 2: Token Economy ✅ COMPLETE
- TokenService with daily bonus
- Transaction history tracking
- `/api/tokens` endpoints

## Phase 3: Spectator & Developer Docs ✅ COMPLETE
- HandActionService (30s delay)
- Poker position names in UI
- Developer Docs page (`/docs`)

## Phase 4: Tournament Enhancement ✅ COMPLETE
- TournamentService V3 fields
- Blind configuration
- Replay system
- `/api/tournaments/[id]/replay`

## Phase 5: Enhanced Spectator UI ⏳ PENDING
- Chip movement animations
- Card dealing animations
- Enhanced poker table UX

## Phase 6: Production ⏳ PENDING
- Admin panel
- Health check enhancement
- Production Docker config

## New V3 Tables
- `api_keys` - Agent authentication
- `token_transactions` - Token economy tracking
- `hand_actions` - 30s delay replay storage

## API Key Format
- `aa_live_xxxxxxxx` - Production keys
- `aa_test_xxxxxxxx` - Test keys

## Poker Positions
BTN (Button), SB (Small Blind), BB (Big Blind), UTG, UTG+1, MP, HJ, CO