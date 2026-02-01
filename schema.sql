-- schema.sql
-- Synchronized with Drizzle Schema (src/lib/db/schema.ts)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name text,
    username text UNIQUE,
    email text UNIQUE,
    avatar_url text,
    status_text text,
    status_emoji text,
    badge text,
    public_key text,
    password_hash text,
    updated_at timestamp with time zone DEFAULT now()
);

-- Workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    owner_id uuid REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now()
);

-- Workspace Members table
CREATE TABLE IF NOT EXISTS public.workspace_members (
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    role text DEFAULT 'member',
    encrypted_key text,
    PRIMARY KEY (workspace_id, user_id)
);

-- Channels table
CREATE TABLE IF NOT EXISTS public.channels (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    is_private boolean DEFAULT false,
    encryption_enabled boolean DEFAULT false,
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now()
);

-- Channel Members table
CREATE TABLE IF NOT EXISTS public.channel_members (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    encrypted_key text,
    created_at timestamp with time zone DEFAULT now(),
    role text DEFAULT 'member',
    UNIQUE(channel_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE,
    recipient_id uuid REFERENCES public.profiles(id),
    sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    parent_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
    is_edited boolean DEFAULT false,
    is_encrypted boolean DEFAULT false,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Workspace Invitations table
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email text,
    invite_code text NOT NULL,
    role text DEFAULT 'member',
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone
);

-- Member Last Read table
CREATE TABLE IF NOT EXISTS public.member_last_read (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE,
    recipient_id uuid REFERENCES public.profiles(id),
    last_read_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS unq_last_read_channel ON public.member_last_read (user_id, workspace_id, channel_id) WHERE (channel_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS unq_last_read_dm ON public.member_last_read (user_id, workspace_id, recipient_id) WHERE (recipient_id IS NOT NULL);


-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE,
    message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'mention', 'reply', etc.
    content text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_workspace_id ON public.messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON public.channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Reactions table
CREATE TABLE IF NOT EXISTS public.reactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(message_id, user_id, emoji)
);

-- ==============================================
-- Extended Seed Data (25 Users, 5 Workspaces)
-- ==============================================

-- 1. Profiles (Users 1-25)
INSERT INTO public.profiles (id, username, full_name, email, password_hash, avatar_url, status_text, status_emoji, badge)
VALUES 
    -- Workspace 1 Users
    ('a0000000-0000-0000-0000-000000000001', 'user1', 'Alice Admin', 'user1@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', 'Admin', '⚡', 'Owner'),
    ('a0000000-0000-0000-0000-000000000002', 'user2', 'Bob Builder', 'user2@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', 'Building', '🔨', 'Member'),
    ('a0000000-0000-0000-0000-000000000003', 'user3', 'Charlie Code', 'user3@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie', 'Coding', '💻', 'Member'),
    ('a0000000-0000-0000-0000-000000000004', 'user4', 'Diana Data', 'user4@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana', 'Analyzing', '📊', 'Member'),
    ('a0000000-0000-0000-0000-000000000005', 'user5', 'Evan Event', 'user5@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Evan', 'Planning', '📅', 'Member'),

    -- Workspace 2 Users
    ('a0000000-0000-0000-0000-000000000006', 'user6', 'Frank Founder', 'user6@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Frank', 'Founding', '🚀', 'Owner'),
    ('a0000000-0000-0000-0000-000000000007', 'user7', 'Gina Growth', 'user7@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Gina', 'Growing', '📈', 'Member'),
    ('a0000000-0000-0000-0000-000000000008', 'user8', 'Hank Hr', 'user8@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hank', 'Recruiting', '👥', 'Member'),
    ('a0000000-0000-0000-0000-000000000009', 'user9', 'Ivy Innovation', 'user9@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ivy', 'Innovating', '💡', 'Member'),
    ('a0000000-0000-0000-0000-000000000010', 'user10', 'Jack Just', 'user10@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack', 'Reviewing', '📝', 'Member'),

    -- Workspace 3 Users
    ('a0000000-0000-0000-0000-000000000011', 'user11', 'Kara Creative', 'user11@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kara', 'Creating', '🎨', 'Owner'),
    ('a0000000-0000-0000-0000-000000000012', 'user12', 'Leo Lead', 'user12@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo', 'Leading', '🦁', 'Member'),
    ('a0000000-0000-0000-0000-000000000013', 'user13', 'Mona Manager', 'user13@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mona', 'Managing', '📁', 'Member'),
    ('a0000000-0000-0000-0000-000000000014', 'user14', 'Nick Network', 'user14@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nick', 'Connecting', '🔗', 'Member'),
    ('a0000000-0000-0000-0000-000000000015', 'user15', 'Olive Org', 'user15@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olive', 'Organizing', '️', 'Member'),

    -- Workspace 4 Users
    ('a0000000-0000-0000-0000-000000000016', 'user16', 'Paul Payer', 'user16@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Paul', 'Accounting', '💰', 'Owner'),
    ('a0000000-0000-0000-0000-000000000017', 'user17', 'Quinn Quality', 'user17@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Quinn', 'Testing', '✅', 'Member'),
    ('a0000000-0000-0000-0000-000000000018', 'user18', 'Rick Risk', 'user18@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rick', 'Assessing', '🛡️', 'Member'),
    ('a0000000-0000-0000-0000-000000000019', 'user19', 'Sara Sales', 'user19@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sara', 'Selling', '🤝', 'Member'),
    ('a0000000-0000-0000-0000-000000000020', 'user20', 'Tom Tech', 'user20@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tom', 'Infrastucture', '🏗️', 'Member'),

    -- Workspace 5 Users
    ('a0000000-0000-0000-0000-000000000021', 'user21', 'Uma UX', 'user21@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Uma', 'Designing', '🖌️', 'Owner'),
    ('a0000000-0000-0000-0000-000000000022', 'user22', 'Victor Video', 'user22@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Victor', 'Recording', '🎥', 'Member'),
    ('a0000000-0000-0000-0000-000000000023', 'user23', 'Wendy Writer', 'user23@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wendy', 'Writing', '✍️', 'Member'),
    ('a0000000-0000-0000-0000-000000000024', 'user24', 'Xander Xylophone', 'user24@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Xander', 'Musician', '🎵', 'Member'),
    ('a0000000-0000-0000-0000-000000000025', 'user25', 'Yara Youth', 'user25@oruchat.com', crypt('password', gen_salt('bf')), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yara', 'Intern', '🎓', 'Member')
ON CONFLICT (username) DO NOTHING;

-- 2. Workspaces
INSERT INTO public.workspaces (id, name, slug, owner_id)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'Oru Workspace', 'oru-workspace', 'a0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000002', 'Nexus Solutions', 'nexus-solutions', 'a0000000-0000-0000-0000-000000000006'),
    ('b0000000-0000-0000-0000-000000000003', 'Design Studio', 'design-studio', 'a0000000-0000-0000-0000-000000000011'),
    ('b0000000-0000-0000-0000-000000000004', 'Tech Frontier', 'tech-frontier', 'a0000000-0000-0000-0000-000000000016'),
    ('b0000000-0000-0000-0000-000000000005', 'Marketing Pulse', 'marketing-pulse', 'a0000000-0000-0000-0000-000000000021')
ON CONFLICT (slug) DO NOTHING;

-- 3. Workspace Members & Channels
-- Helper block for Workspace 1
INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'admin'),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'member'),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'member'),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'member'),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'member')
ON CONFLICT(workspace_id, user_id) DO NOTHING;

INSERT INTO public.channels (id, workspace_id, name, description, is_private, created_by) VALUES
    (uuid_generate_v4(), 'b0000000-0000-0000-0000-000000000001', 'general', 'General discussion', false, 'a0000000-0000-0000-0000-000000000001'),
    (uuid_generate_v4(), 'b0000000-0000-0000-0000-000000000001', 'random', 'Random chatter', false, 'a0000000-0000-0000-0000-000000000001');

-- Helper block for Workspace 2
INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES 
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000006', 'admin'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007', 'member'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000008', 'member'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000009', 'member'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000010', 'member')
ON CONFLICT(workspace_id, user_id) DO NOTHING;

INSERT INTO public.channels (id, workspace_id, name, description, is_private, created_by) VALUES
    (uuid_generate_v4(), 'b0000000-0000-0000-0000-000000000002', 'general', 'General discussion', false, 'a0000000-0000-0000-0000-000000000006');

-- Helper block for Workspace 3
INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES 
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011', 'admin'),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000012', 'member'),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000013', 'member'),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000014', 'member'),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000015', 'member')
ON CONFLICT(workspace_id, user_id) DO NOTHING;

INSERT INTO public.channels (id, workspace_id, name, description, is_private, created_by) VALUES
    (uuid_generate_v4(), 'b0000000-0000-0000-0000-000000000003', 'general', 'General discussion', false, 'a0000000-0000-0000-0000-000000000011');

-- Helper block for Workspace 4
INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES 
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000016', 'admin'),
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000017', 'member'),
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000018', 'member'),
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000019', 'member'),
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000020', 'member')
ON CONFLICT(workspace_id, user_id) DO NOTHING;

INSERT INTO public.channels (id, workspace_id, name, description, is_private, created_by) VALUES
    (uuid_generate_v4(), 'b0000000-0000-0000-0000-000000000004', 'general', 'General discussion', false, 'a0000000-0000-0000-0000-000000000016');

-- Helper block for Workspace 5
INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES 
    ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000021', 'admin'),
    ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000022', 'member'),
    ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000023', 'member'),
    ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000024', 'member'),
    ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000025', 'member')
ON CONFLICT(workspace_id, user_id) DO NOTHING;

INSERT INTO public.channels (id, workspace_id, name, description, is_private, created_by) VALUES
    (uuid_generate_v4(), 'b0000000-0000-0000-0000-000000000005', 'general', 'General discussion', false, 'a0000000-0000-0000-0000-000000000021');

-- Auto-join all public channels
INSERT INTO public.channel_members (channel_id, user_id)
SELECT c.id, wm.user_id 
FROM public.channels c
JOIN public.workspace_members wm ON c.workspace_id = wm.workspace_id
WHERE c.is_private = false
ON CONFLICT DO NOTHING;
