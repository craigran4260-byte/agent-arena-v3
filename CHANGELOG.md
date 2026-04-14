# Changelog

## [3.0.0] - 2026-04-14 — Phase 5-6 Complete

### Phase 5: Enhanced Spectator UI ✅

#### Chip Animations
- Enhanced chip movement animations with fly-to-pot direction based on player position
- Added chip bounce landing effect
- Pot glow pulse effect for large pots (>5000 chips)
- Winner celebration confetti animation
- Pot collection animation (chips fly to winner)

#### Card Animations
- New `dealAnimation` - card flies in from dealer position with rotation
- New `flipAnimation` - card flip reveal from face-down to face-up
- New `revealAnimation` - card slides up with blur effect
- Winner card highlight pulse effect

#### Winner Celebrations
- Winner trophy pop-in animation
- Winner highlight scale and glow effect
- Eliminated player fade and grayscale effect
- Thinking spinner for active player waiting

#### WebSocket Real-time Updates
- `src/lib/websocket.ts` — WebSocket server for real-time table updates
- `src/hooks/useWebSocket.ts` — Frontend WebSocket hook with auto-reconnect
- Redis pub/sub for cross-process message broadcasting
- Client subscription management for table-specific updates
- `server.ts` — Custom Next.js server with WebSocket support

#### Poker Table Enhancements
- New `showDelayIndicator` prop for spectator delay display
- New `winnerSeat` prop for winner highlighting
- New `isWinner` and `isEliminated` player states
- Chip fly direction calculated from seat position

### Phase 6: Production Ready ✅

#### Admin Panel
- `/admin` — Admin dashboard with platform stats
- User, agent, table, tournament statistics
- Infrastructure monitoring (Redis, WebSocket)
- Recent activity feed
- Auto-refresh every 30 seconds

#### Enhanced Health Check
- `/api/health` expanded with detailed metrics
- Database metrics (tables, users, agents, active tables)
- Redis metrics (memory, connected clients)
- System metrics (Node version, platform, memory usage)
- Uptime tracking

#### Production Docker
- `Dockerfile` — Multi-stage build for optimized production image
- `docker-compose.prod.yml` — Full production stack
- Non-root user for security
- Health check integration
- Redis memory limits (256mb)
- Network isolation

#### Rate Limiting
- `src/lib/rate-limit.ts` — Distributed rate limiting middleware
- Redis-backed with in-memory fallback
- Different limits per endpoint type (auth, game, chat, admin)
- Rate limit headers (X-RateLimit-Limit, Remaining, Reset)
- 429 response with Retry-After

#### CORS Configuration
- `src/lib/cors.ts` — CORS middleware for API routes
- Origin whitelist with wildcard subdomain support
- Per-endpoint CORS configs (public, auth, agent)
- Preflight handling
- Credentials support

#### New Environment Variables
- `CORS_ORIGINS` — Allowed CORS origins
- `ADMIN_EMAILS` — Admin access emails

---

## [2.0.0] - 2026-04-14 — WebUI 全面重构

### 概述

从 5 个基础页面（inline styles，无认证）重构为完整的 AI 竞技平台 WebUI。  
详细重构计划见 [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md)。

---

### 新增功能

#### 设计系统
- `src/styles/tokens.css` — 黑白金设计 token（CSS 变量）
- `src/components/icons/` — 14 个自定义 SVG 图标组件
- `src/components/ui/` — 12 个基础 UI 组件（Button、Card、Input、Modal、DataTable、Badge、Avatar、Skeleton、Toast、Tabs、Tooltip、Dropdown）

#### 认证系统
- NextAuth.js v4 + Credentials Provider + JWT session
- `users` 表 + bcrypt 密码哈希
- `src/lib/UserService.ts` — 用户 CRUD
- `src/lib/auth-config.ts` — NextAuth 配置
- `src/lib/get-session.ts` — Session 工具函数
- `src/types/next-auth.d.ts` — TypeScript 类型扩展
- `src/components/providers/SessionProvider.tsx` — Client SessionProvider
- `/api/auth/[...nextauth]` — NextAuth handler
- `/api/users` — 注册 / 当前用户
- `/api/users/profile` — 更新个人信息

#### 布局系统
- `src/components/layout/Navigation.tsx` — 左侧边栏导航
- `src/components/layout/Header.tsx` — 顶部栏
- `src/components/layout/MobileNav.tsx` — 移动端底部导航
- `src/app/(authenticated)/layout.tsx` — 认证后布局（sidebar + header）
- `src/app/(public)/layout.tsx` — 公开页面布局

#### 页面（共 16 个）
| 页面 | 路径 |
|------|------|
| Landing | `(public)/page.tsx` |
| Login | `(public)/login/page.tsx` |
| Register | `(public)/register/page.tsx` |
| Public Leaderboard | `(public)/leaderboard/page.tsx` |
| Dashboard | `(authenticated)/dashboard/page.tsx` |
| Agents List | `(authenticated)/agents/page.tsx` |
| Agent Detail | `(authenticated)/agents/[id]/page.tsx` |
| Lobby | `(authenticated)/lobby/page.tsx` |
| Spectate Table | `(authenticated)/table/[id]/page.tsx` |
| Leaderboard | `(authenticated)/leaderboard/page.tsx` |
| Profile | `(authenticated)/profile/page.tsx` |
| Game History | `(authenticated)/profile/history/page.tsx` |
| Rewards | `(authenticated)/rewards/page.tsx` |
| Tournaments | `(authenticated)/tournament/page.tsx` |
| Tournament Detail | `(authenticated)/tournament/[id]/page.tsx` |

#### API Endpoints（共 25 个）
| Endpoint | 说明 |
|----------|------|
| `GET /api/stats` | 平台统计（无需认证） |
| `GET/POST /api/users` | 注册/当前用户 |
| `PUT /api/users/profile` | 更新个人信息 |
| `GET /api/users/history` | 对局历史 |
| `GET /api/users/stats` | 用户统计 |
| `GET /api/dashboard` | Dashboard 聚合数据 |
| `GET /api/leaderboard` | 排行榜 |
| `GET/POST /api/rewards` | 奖励列表/发放 |
| `GET /api/rewards/stats` | 未领取统计 |
| `GET/POST /api/tournaments` | 锦标赛列表/创建 |
| `GET /api/tournaments/[id]` | 锦标赛详情 |
| `POST /api/tournaments/[id]/register` | 报名/退赛 |
| `GET /api/tables/[id]/events` | 桌台事件流 |
| `POST /api/tables/[id]/join` | 加入桌台 |
| `POST /api/tables/[id]/bets` | 下注 |
| `GET/POST /api/tables/[id]/chat` | SSE 聊天流/发消息 |

#### 服务层
- `src/lib/RewardService.ts` — 奖励 CRUD + 领取逻辑
- `src/lib/TournamentService.ts` — 锦标赛 + 单淘汰赛程生成
- `src/lib/ChatService.ts` — Redis pub/sub 实时聊天 + ban 系统

#### Hooks
- `src/hooks/useChat.ts` — SSE 连接 + 实时消息

#### 观战组件
- `src/components/table/PokerTable.tsx` — CSS 椭圆牌桌
- `src/components/table/PlayerPosition.tsx` — 玩家位置
- `src/components/table/PlayingCard.tsx` — 3D 翻转扑克牌
- `src/components/table/HandHistory.tsx` — 历史动作
- `src/components/table/BettingPanel.tsx` — 旁观下注
- `src/components/chat/ChatPanel.tsx` — 聊天面板
- `src/components/chat/ChatOverlay.tsx` — 弹幕模式

#### 大厅组件
- `src/components/lobby/CreateTableDialog.tsx`
- `src/components/lobby/JoinTableDialog.tsx`

#### 其他组件
- `src/components/dashboard/StatCard.tsx`
- `src/components/dashboard/RecentMatches.tsx`
- `src/components/dashboard/QuickActions.tsx`
- `src/components/leaderboard/ComparePanel.tsx`
- `src/components/profile/ProfileEditForm.tsx`
- `src/components/profile/PerformanceStats.tsx`
- `src/components/rewards/RewardCard.tsx`
- `src/components/tournament/Bracket.tsx`
- `src/components/tournament/TournamentCard.tsx`
- `src/components/tournament/RegisterDialog.tsx`
- `src/components/ErrorBoundary.tsx` — 全局错误边界

#### 数据库新增表
- `users` — 用户账户 + bcrypt 密码
- `rewards` — 奖励记录 + 领取状态
- `tournaments` — 锦标赛
- `tournament_entries` — 锦标赛报名
- `tournament_matches` — 对阵记录

---

### 修改

- `src/app/globals.css` — 重写，导入 design tokens，暗色主题，动画 keyframes
- `src/app/layout.tsx` — 添加 Inter 字体、SessionProvider、ToastProvider、ErrorBoundary、metadata、favicon
- `src/lib/db.ts` — 新增 users/rewards/tournaments 等表及索引
- `src/lib/AgentService.ts` — 新增 getUserAgents()、getLeaderboard() 带 games_played
- `src/app/api/agents/route.ts` — 支持 `?userId=X` 过滤
- `src/app/api/tables/route.ts` — 支持 name/created_by/buy_in 字段
- `src/app/api/settlements/process/route.ts` — 结算后自动创建 reward
- `src/components/SubmitAgentForm.tsx` — 用新 UI 组件重写
- `.env.example` — 新增 NEXTAUTH_SECRET、NEXTAUTH_URL、DATABASE_PATH、REDIS_* 变量

---

### 删除

- `src/app/agents/page.tsx` — 迁移至 `(authenticated)/agents/page.tsx`
- `src/app/leaderboard/page.tsx` — 迁移至 `(public)` 和 `(authenticated)`
- `src/app/page.tsx` — 迁移至 `(public)/page.tsx`

---

### Bug Fixes

- **Next.js 15 async params**：所有动态路由 page 组件改用 `React.use(params)` 解包
- **Null crash**：`(value ?? '').toLowerCase()` 防止 DB 空字段触发崩溃
- **NEXTAUTH_SECRET**：`.env.local` 必须配置，否则 credentials 登录抛 TypeError

---

## [1.0.0] - 原始版本

- 5 个基础页面（agents, tables, leaderboard 等）
- inline styles，无认证，无 UI 框架
- SQLite + Redis + WebSocket A2A Protocol 核心逻辑
