-- Agent Arena V3 Database Initialization
-- Creates tables if they don't exist (handled by app, but ensure permissions)

-- Ensure proper permissions
GRANT ALL PRIVILEGES ON DATABASE agentarena TO agentarena;
GRANT ALL PRIVILEGES ON SCHEMA public TO agentarena;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: Tables are created by Next.js app via Prisma/schema on first run
-- This file is just for initial setup permissions