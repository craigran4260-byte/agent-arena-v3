# Agent Arena WebUI 全面重构计划

> 本文件为 13 阶段重构计划的完整记录，供后续 agent 二次开发参考。  
> 所有阶段已于 2026-04-14 全部完成并通过端到端测试。

---

## Context

Agent Arena 原始版本只有 5 个基础页面（全部 inline styles，无 UI 框架，无用户认证）。  
重构目标：完整的竞技平台 WebUI，包含：
- 邮箱密码登录
- Agent 管理
- 实时观战（带弹幕聊天）
- 战利品领取
- 比赛记录
- 锦标赛系统

**设计风格**：黑白金极简奢华风，全自定义组件和 SVG 图标，响应式适配移动端和 PC 端。

**技术选型**：Next.js 15 + React 19 + NextAuth.js v4 + SQLite + Redis + CSS Modules（无第三方 UI 库）

---

## 依赖安装（一次性）

```bash
npm install next-auth@latest bcrypt
npm install -D @types/bcrypt
```

---

## PHASE 0: 设计系统与基础组件 ✅

### 设计 Token — `src/styles/tokens.css`
CSS 变量定义：
- 背景：`--bg-primary: #0A0A0A`, `--bg-secondary: #111`, `--bg-card: #1A1A1A`, `--bg-elevated: #222`, `--bg-hover: #2A2A2A`
- 文字：`--text-primary: #FFF`, `--text-secondary: #A0A0A0`, `--text-muted: #666`
- 金色：`--gold-primary: #FFD700`, `--gold-secondary: #C9A84C`, `--gold-dark: #8B6914`, `--gold-glow: rgba(255,215,0,0.15)`
- 语义色：`--success: #22C55E`, `--danger: #EF4444`, `--warning: #F59E0B`, `--info: #3B82F6`
- 边框：`--border-subtle: #222`, `--border-default: #333`, `--border-strong: #444`, `--border-gold: #C9A84C`
- 圆角、间距（4px 基数）、字体（Inter）、阴影、过渡、z-index、布局常量

### SVG 图标组件 — `src/components/icons/`
14 个图标：`LogoIcon`, `AgentIcon`, `ChipIcon`, `CardsIcon`, `TrophyIcon`, `ShieldIcon`, `ChartIcon`, `ChatIcon`, `WalletIcon`, `TournamentIcon`, `SettingsIcon`, `UserIcon`, `HomeIcon`, `LogoutIcon`

### UI 组件库 — `src/components/ui/`
| 组件 | 关键 Props |
|------|-----------|
| Button | variant(primary/secondary/ghost/danger), size, loading, fullWidth |
| Card | variant(default/glass), padding, hover |
| Input | label, error, icon |
| Modal | isOpen, onClose, title, size(sm/md/lg) |
| DataTable | columns(key/label/sortable/render), data, loading |
| Badge | variant(default/success/warning/danger/gold), size |
| Avatar | name, src?, size(sm/md/lg)，无图片时显示首字母金色背景 |
| Skeleton | width, height, variant(text/circular/rect), count |
| Toast | ToastProvider + useToast() hook，右上角滑入 |
| Tabs | tabs[], activeTab, onChange，金色下划线 |
| Tooltip | content, position |
| Dropdown | trigger, items[], align |

---

## PHASE 1: 认证系统 ✅

**架构决策**：
- NextAuth.js (Credentials Provider) + JWT session
- 新的 `users` 表（SQLite）+ bcrypt 密码哈希
- 现有 `src/lib/auth.ts`（API Key 认证）**完全不动**
- 路由保护在 page 组件中用 `getServerSession()` 实现

**新建文件**：
- `src/lib/UserService.ts` — create/findByEmail/findById/verifyPassword/updateProfile
- `src/lib/auth-config.ts` — NextAuth authOptions，CredentialsProvider
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler
- `src/lib/get-session.ts` — getRequiredSession/getOptionalSession/getOptionalUserId
- `src/types/next-auth.d.ts` — Session/JWT 类型扩展
- `src/components/providers/SessionProvider.tsx` — 'use client' SessionProvider wrapper
- `src/app/api/users/route.ts` — POST 注册 / GET 当前用户
- `src/app/api/users/profile/route.ts` — PUT 更新个人信息

**users 表结构**：
```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 64),
  avatar_url TEXT,
  token_balance INTEGER DEFAULT 1000,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

**环境变量**（`.env.local`，不入库）：
```
NEXTAUTH_SECRET=<random-32-byte-base64>
NEXTAUTH_URL=http://localhost:3000
DATABASE_PATH=./agent-arena.db
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

---

## PHASE 2: 布局系统与导航 ✅

**新建文件**：
- `src/components/layout/Navigation.tsx` — 左侧边栏：Logo + 7 个导航项 + 用户区
- `src/components/layout/Header.tsx` — 顶部栏：页面标题 + 用户头像下拉
- `src/components/layout/MobileNav.tsx` — 底部导航（仅移动端 <1024px）
- `src/app/(authenticated)/layout.tsx` — 带 sidebar + header + main 的布局
- `src/app/(public)/layout.tsx` — 居中无 sidebar 的公开页面布局

**路由结构**：
```
src/app/
├── layout.tsx                          # 根布局 + providers
├── (public)/
│   ├── layout.tsx                      # 居中布局
│   ├── page.tsx                        # Landing Page
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── leaderboard/page.tsx            # 公开排行榜
└── (authenticated)/
    ├── layout.tsx                      # sidebar + header
    ├── dashboard/page.tsx
    ├── agents/page.tsx
    ├── agents/[id]/page.tsx
    ├── lobby/page.tsx
    ├── table/[id]/page.tsx             # 观战页
    ├── leaderboard/page.tsx
    ├── profile/page.tsx
    ├── profile/history/page.tsx
    ├── rewards/page.tsx
    ├── tournament/page.tsx
    └── tournament/[id]/page.tsx
```

---

## PHASE 3: 登录/注册/Landing ✅

| 页面 | 路径 | 说明 |
|------|------|------|
| Landing | `(public)/page.tsx` | Hero + Feature Cards + 实时 Stats |
| Login | `(public)/login/page.tsx` | Email/Password + 金色 Sign In |
| Register | `(public)/register/page.tsx` | Name/Email/Password/Confirm + 密码强度 |
| Stats API | `/api/stats/route.ts` | 无需认证，返回 agents/tables/games 总数 |

---

## PHASE 4: Dashboard ✅

- `src/components/dashboard/StatCard.tsx` — 数值卡片 + 图标 + 趋势箭头
- `src/components/dashboard/RecentMatches.tsx` — 最近 5 场对局列表
- `src/components/dashboard/QuickActions.tsx` — 4 个快捷操作卡片
- `src/app/(authenticated)/dashboard/page.tsx`
- `src/app/api/dashboard/route.ts` — 当前用户聚合数据

---

## PHASE 5: Agent 管理 ✅

- `src/components/agents/SubmitAgentModal.tsx` — Modal 包裹表单
- `src/app/(authenticated)/agents/page.tsx` — Agent 列表 + 提交按钮
- `src/app/(authenticated)/agents/[id]/page.tsx` — 详情 + 统计 + 历史 + 编辑/删除
- `src/app/api/agents/[id]/route.ts` — GET/PUT/DELETE
- `src/app/api/agents/[id]/history/route.ts` — 分页对局历史

---

## PHASE 6: 大厅 & 观战 ✅

- `src/components/lobby/CreateTableDialog.tsx` — 建桌弹窗
- `src/components/lobby/JoinTableDialog.tsx` — 入座弹窗（选 Agent + 座位）
- `src/components/table/PokerTable.tsx` — CSS 椭圆牌桌 + 9 个玩家位
- `src/components/table/PlayerPosition.tsx` — 玩家头像 + 筹码 + 动作标签
- `src/components/table/PlayingCard.tsx` — CSS-only 扑克牌 + 3D 翻转动画
- `src/components/table/HandHistory.tsx` — 历史动作列表
- `src/components/table/BettingPanel.tsx` — 旁观下注面板
- `src/app/api/tables/[tableId]/events/route.ts`
- `src/app/api/tables/[tableId]/join/route.ts`
- `src/app/api/tables/[tableId]/bets/route.ts`

---

## PHASE 7: 排行榜 ✅

- `src/app/(authenticated)/leaderboard/page.tsx` — DataTable + 搜索 + 排序
- `src/app/(public)/leaderboard/page.tsx` — 公开版（无 sidebar）
- `src/components/leaderboard/ComparePanel.tsx` — 双 Agent 对比面板
- `src/app/api/leaderboard/route.ts`

---

## PHASE 8: 个人中心 & 对局记录 ✅

- `src/app/(authenticated)/profile/page.tsx` — 头像 + 信息 + 编辑
- `src/app/(authenticated)/profile/history/page.tsx` — 分页对局记录
- `src/components/profile/ProfileEditForm.tsx`
- `src/components/profile/PerformanceStats.tsx`
- `src/app/api/users/history/route.ts`
- `src/app/api/users/stats/route.ts`

---

## PHASE 9: 奖励系统 ✅

**新增 DB 表**：`rewards`
```sql
CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  reason TEXT,
  claimed INTEGER DEFAULT 0,
  claimed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

- `src/lib/RewardService.ts` — create/list/claim/claimAll/getUnclaimedStats
- `src/app/api/rewards/route.ts` — GET/POST
- `src/app/api/rewards/stats/route.ts` — 未领取统计
- `src/app/(authenticated)/rewards/page.tsx`
- `src/components/rewards/RewardCard.tsx`

---

## PHASE 10: 锦标赛系统 ✅

**新增 DB 表**：`tournaments`, `tournament_entries`, `tournament_matches`

- `src/lib/TournamentService.ts` — CRUD + 报名 + 单淘汰赛程生成 + 结果记录
- `src/app/api/tournaments/route.ts`
- `src/app/api/tournaments/[id]/route.ts`
- `src/app/api/tournaments/[id]/register/route.ts`
- `src/app/(authenticated)/tournament/page.tsx` — Upcoming/Active/Completed tabs
- `src/app/(authenticated)/tournament/[id]/page.tsx`
- `src/components/tournament/Bracket.tsx` — CSS Grid 对阵图
- `src/components/tournament/TournamentCard.tsx`
- `src/components/tournament/RegisterDialog.tsx`

---

## PHASE 11: 实时聊天/弹幕 ✅

- `src/lib/ChatService.ts` — Redis sorted set 存储 + pub/sub + ban 系统
- `src/app/api/tables/[tableId]/chat/route.ts` — SSE 流 + POST 发消息
- `src/hooks/useChat.ts` — SSE 连接 + 消息累积 + sendMessage
- `src/components/chat/ChatOverlay.tsx` — 弹幕模式：右→左飘过，CSS 动画
- `src/components/chat/ChatPanel.tsx` — 传统面板：消息列表 + 输入框

---

## PHASE 12: 收尾集成 ✅

1. 所有页面加 `page-enter` class（fadeIn 动画）
2. Loading 骨架屏 / error 重试 / empty 引导
3. 响应式：`@media (max-width: 768px)` + `@media (max-width: 480px)`
4. `next/font/google` Inter 字体优化
5. `src/components/ErrorBoundary.tsx` — 全局错误边界（React class component）
6. `src/app/layout.tsx` — metadata + favicon

---

## PHASE 13: 端到端测试 & 修复 ✅

**修复项**：
1. **Next.js 15 async params** — `params` 是 Promise，所有动态路由 page 和 API route 均需 `React.use(params)` 或 `await params`
2. **Null crash** — `(table.name ?? '').toLowerCase()` 防止 DB 空值崩溃
3. **SQLite 迁移** — 对已有 DB 使用 `ALTER TABLE` 添加缺失列而非重建
4. **NEXTAUTH_SECRET** — 必须在 `.env.local` 中设置，否则登录抛 TypeError

**所有页面验证通过**：Dashboard, Agents, Lobby, Table(spectate), Leaderboard, Profile, Profile/History, Tournament, Rewards

---

## 执行顺序约束

**必须按 Phase 0 → 13 顺序执行**，依赖链：
- Phase 0 (设计系统) → 所有后续 Phase
- Phase 1 (认证) → Phase 2 (布局)
- Phase 2 (布局) → Phase 3-12 (所有页面)
- Phase 6 (观战) → Phase 11 (聊天)
- Phase 5 (Agent) + Phase 6 (桌台) → Phase 10 (锦标赛)

## 关键约束

1. `src/lib/auth.ts` 完全不动（API Key 认证照旧）
2. `src/proxy.ts` 保持不动（CORS 中间件）
3. 所有 `/api/` 路由保持向后兼容
4. 路由保护在 page 组件中实现，不用 Next.js middleware（避免与 proxy.ts 冲突）
5. 现有 Redis 键模式（`table:{id}`, `spectator:{id}`）保持不变
6. 现有 WebSocket server singleton 不动

## 统计

| 指标 | 数量 |
|------|------|
| 新建文件 | ~130 个 |
| 修改文件 | ~11 个 |
| 删除文件 | 5 个旧页面 |
| UI 组件 | 100+ |
| 页面 | 16 |
| API Endpoints | 25 |
| TypeScript 错误 | 0 |
| 代码行数 | 13000+ |
