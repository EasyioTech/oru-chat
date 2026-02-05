-- Migration 001: Add Performance Indexes
-- Purpose: Add critical indexes for message queries, reactions, and user lookups
-- Safe: Uses CONCURRENTLY to avoid blocking writes during index creation
-- Estimated time: 5-10 seconds per index (depending on table size)

-- Messages: Channel lookups (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_channel_lookup 
ON messages(workspace_id, channel_id, created_at DESC);

-- Messages: Direct message lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_dm_lookup 
ON messages(workspace_id, sender_id, recipient_id, created_at DESC)
WHERE recipient_id IS NOT NULL;

-- Messages: Thread/reply lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_parent 
ON messages(parent_id) 
WHERE parent_id IS NOT NULL;

-- Reactions: Message reaction queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reactions_message 
ON reactions(message_id);

-- Profiles: Username searches (case-insensitive)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_username 
ON profiles(LOWER(username));

-- Profiles: Email lookups (case-insensitive)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email 
ON profiles(LOWER(email));

-- Workspace members: Member lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_members_lookup 
ON workspace_members(workspace_id, user_id);

-- Channel members: Member lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_channel_members_lookup 
ON channel_members(channel_id, user_id);

-- Update table statistics for query planner
ANALYZE messages;
ANALYZE reactions;
ANALYZE profiles;
ANALYZE workspace_members;
ANALYZE channel_members;
