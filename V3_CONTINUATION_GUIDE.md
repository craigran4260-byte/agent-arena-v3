# Agent Arena V3 - Continuation Guide

## Project Location
```
/Users/craig/Desktop/TestingField/Pine/agent-arena-v3-clean/
```
**Note**: Original `agent-arena-A2A-V1` has filesystem corruption. Use the clean copy.

## GitHub Repository
```
https://github.com/craigran4260-byte/agent-arena-v3
```

## Completed Phases (0-4)

### Phase 0: Infrastructure ✅
| File | Description |
|------|-------------|
| `src/lib/db-adapter.ts` | Unified PostgreSQL/SQLite interface with async API |
| `src/lib/db.ts` | V3 schema: `api_keys`, `token_transactions`, `hand_actions` tables |
| `src/lib/ChatService.ts` | Redis graceful degradation, "Local Mode" fallback |
| `src/app/layout.tsx` | Viewport metadata fix for Next.js 16 |
| `docker-compose.yml` | PostgreSQL + Redis for local development |
| `.env.example` | Updated with `DATABASE_URL` |

### Phase 1: API Key System ✅
| File | Description |
|------|-------------|
| `src/lib/ApiKeyService.ts` | Key generation/validation (`aa_live_xxx` format) |
| `src/app/api/keys/route.ts` | List/Create keys endpoint |
| `src/app/api/keys/[id]/route.ts` | Get/Delete/Update key |
| `src/app/api/keys/[id]/revoke/route.ts` | Revoke key endpoint |
| `src/app/(authenticated)/keys/page.tsx` | Keys management UI |
| `src/lib/api-key-auth.ts` | Auth middleware for agent endpoints |
| `src/components/icons/KeyIcon.tsx` | Key icon |
| `src/components/icons/CopyIcon.tsx` | Copy icon |
| `src/components/icons/TrashIcon.tsx` | Trash icon |

### Phase 2: Token Economy ✅
| File | Description |
|------|-------------|
| `src/lib/TokenService.ts` | Balance, daily bonus (100 tokens), transactions |
| `src/app/api/tokens/route.ts` | Balance/claim/purchase endpoints |
| `src/app/api/tokens/history/route.ts` | Transaction history endpoint |

**Transaction Types**: `purchase`, `daily_bonus`, `reward`, `redemption`, `bet_placed`, `bet_won`, `bet_lost`, `refund`

### Phase 3: Spectator & Developer Docs ✅
| File | Description |
|------|-------------|
| `src/lib/HandActionService.ts` | 30-second delay replay system (anti-cheat) |
| `src/components/table/PokerTable.tsx` | Position names (BTN/SB/BB/UTG/MP/HJ/CO) |
| `src/components/table/PlayerPosition.tsx` | Enhanced player display with current bet |
| `src/components/table/PlayerPosition.module.css` | Position badge styles |
| `src/components/table/PokerTable.module.css` | Delay indicator styles |
| `src/app/(public)/docs/page.tsx` | Developer Docs page (prominent agent CTA) |
| `src/components/layout/Navigation.tsx` | Added docs link with highlight |
| `src/components/layout/Navigation.module.css` | Highlight styles for docs link |
| `src/components/icons/PlayIcon.tsx` | Play icon for replays |

### Phase 4: Tournament Enhancement ✅
| File | Description |
|------|-------------|
| `src/lib/TournamentService.ts` | V3 fields: `small_blind`, `big_blind`, `replay_available`, `replay_data` |
| `src/app/api/tournaments/route.ts` | V3 create with blind config |
| `src/app/api/tournaments/[id]/route.ts` | PATCH for blind/prize settings |
| `src/app/api/tournaments/[id]/replay/route.ts` | Replay list endpoint |
| `src/app/api/tournaments/[id]/replay/[matchId]/route.ts` | Match replay endpoint |
| `src/components/tournament/TournamentCard.tsx` | Blind display |
| `src/app/(authenticated)/tournament/[id]/page.tsx` | Replay UI section |
| `src/app/(authenticated)/tournament/[id]/page.module.css` | Replay card styles |

---

## Pending Phases (5-6)

### Phase 5: Enhanced Spectator UI
**Goals**:
- Chip movement animations (CSS keyframes)
- Card dealing animations
- Enhanced poker table UX
- Real-time updates with WebSocket

**Key Files to Modify**:
- `src/components/table/PokerTable.tsx`
- `src/components/table/PlayerPosition.tsx`
- `src/components/table/PokerTable.module.css`
- `src/lib/a2a/websocket-server.ts`

**Animation Approach**:
```css
.chipMove {
  animation: chipMove 0.5s ease-out;
}
@keyframes chipMove {
  from { transform: translateY(-50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.cardDeal {
  animation: cardDeal 0.3s ease-out;
}
@keyframes cardDeal {
  from { transform: scale(0) rotate(-180deg); opacity: 0; }
  to { transform: scale(1) rotate(0deg); opacity: 1; }
}
```

### Phase 6: Production
**Goals**:
- Admin panel (`/admin`)
- Enhanced health check with detailed metrics
- Production Docker Compose
- Rate limiting
- CORS configuration

**New Files to Create**:
- `src/app/(authenticated)/admin/page.tsx`
- `src/app/api/admin/route.ts`
- `docker-compose.prod.yml`
- `Dockerfile`

---

## How to Continue

### 1. Navigate to Project
```bash
cd /Users/craig/Desktop/TestingField/Pine/agent-arena-v3-clean
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment
Copy `.env.example` to `.env.local` and configure:
```
ENCRYPTION_KEY=<generate with openssl rand -hex 32>
NEXTAUTH_SECRET=<generate with openssl rand -hex 32>
NEXTAUTH_URL=http://localhost:3000
```

### 4. Start Development
```bash
npm run dev
```

### 5. Run TypeScript Check
```bash
npx tsc --noEmit
```

### 6. Git Workflow
```bash
git status
git add <files>
git commit -m "message"
git push
```

---

## API Key Module Usage

### Purpose
API Keys allow AI Agents to authenticate with the platform for:
- Joining poker tables
- Submitting game actions
- Accessing tournament data

### Flow
1. User creates key at `/keys` page
2. System generates `aa_live_xxxxxxxxx` or `aa_test_xxxxxxxxx`
3. User configures Agent SDK with key
4. Agent sends `Authorization: Bearer aa_live_xxx` header
5. Platform validates via `ApiKeyService.validate()`

### Permissions
| Permission | Access |
|------------|--------|
| `read` | View tables, agents, leaderboard |
| `write` | Create/update data |
| `agent_play` | Join games, submit actions |
| `admin` | Full access |

---

## Database Schema (V3)

### New Tables
```sql
-- api_keys
CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  agent_id INTEGER,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT,
  permissions TEXT DEFAULT 'read',
  last_used_at DATETIME,
  expires_at DATETIME,
  revoked BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- token_transactions
CREATE TABLE token_transactions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  type TEXT CHECK (type IN ('purchase', 'daily_bonus', 'reward', 'redemption', 'bet_placed', 'bet_won', 'bet_lost', 'refund')),
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_id INTEGER,
  reference_type TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- hand_actions
CREATE TABLE hand_actions (
  id INTEGER PRIMARY KEY,
  hand_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL,
  action_type TEXT CHECK (action_type IN ('fold', 'check', 'call', 'raise', 'all_in', 'small_blind', 'big_blind')),
  amount INTEGER DEFAULT 0,
  round TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Memory Files
Located in: `/Users/craig/.claude/projects/-Users-craig-Desktop-TestingField-Pine/memory/`

- `MEMORY.md` - Index file
- `v3-progress.md` - V3 progress tracking

---

## Contact Points for Questions

- `/docs` page shows Developer integration guide
- `/keys` page for API Key management
- `/lobby` for table selection
- `/tournament/[id]` for tournament details and replays

---

## Build Status
All TypeScript compiles without errors.
```bash
npx tsc --noEmit  # Should show no output (success)
```

## File Count
- 158 files committed
- 18197 lines of code
- Services: 8 (ApiKey, Token, HandAction, Tournament, Agent, User, Reward, Chat)
- API Routes: 30+
- UI Components: 50+
- Pages: 16