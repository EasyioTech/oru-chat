import { pgTable, uuid, text, boolean, timestamp, jsonb, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';
import { eq, and, sql } from 'drizzle-orm';

export const profiles = pgTable('profiles', {
    id: uuid('id').primaryKey().defaultRandom(),
    fullName: text('full_name'),
    username: text('username').unique(),
    email: text('email').unique(),
    avatarUrl: text('avatar_url'),
    statusText: text('status_text'),
    statusEmoji: text('status_emoji'),
    badge: text('badge'),
    publicKey: text('public_key'),
    passwordHash: text('password_hash'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const workspaces = pgTable('workspaces', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').unique().notNull(),
    ownerId: uuid('owner_id').references(() => profiles.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const channels = pgTable('channels', {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    isPrivate: boolean('is_private').default(false),
    encryptionEnabled: boolean('encryption_enabled').default(false),
    createdBy: uuid('created_by').references(() => profiles.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const messages = pgTable('messages', {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id').references(() => channels.id, { onDelete: 'cascade' }),
    recipientId: uuid('recipient_id').references(() => profiles.id),
    senderId: uuid('sender_id').references(() => profiles.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    parentId: uuid('parent_id'),
    isEdited: boolean('is_edited').default(false),
    isEncrypted: boolean('is_encrypted').default(false),
    payload: jsonb('payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const workspaceMembers = pgTable('workspace_members', {
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }),
    role: text('role').default('member'),
    encryptedKey: text('encrypted_key'),
}, (t) => ({
    pk: primaryKey({ columns: [t.workspaceId, t.userId] }),
}));

export const channelMembers = pgTable('channel_members', {
    id: uuid('id').primaryKey().defaultRandom(),
    channelId: uuid('channel_id').references(() => channels.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }),
    role: text('role').default('member'),
    encryptedKey: text('encrypted_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const workspaceInvitations = pgTable('workspace_invitations', {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    email: text('email'),
    inviteCode: text('invite_code').notNull(),
    role: text('role').default('member'),
    createdBy: uuid('created_by').references(() => profiles.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }), // Optional: add expiration
});

export const memberLastRead = pgTable('member_last_read', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id').references(() => channels.id, { onDelete: 'cascade' }),
    recipientId: uuid('recipient_id').references(() => profiles.id),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
    unqChannel: uniqueIndex('unq_last_read_channel').on(t.userId, t.workspaceId, t.channelId).where(sql`channel_id IS NOT NULL`),
    unqDm: uniqueIndex('unq_last_read_dm').on(t.userId, t.workspaceId, t.recipientId).where(sql`recipient_id IS NOT NULL`),
}));

export const notifications = pgTable('notifications', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => profiles.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id').references(() => channels.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    content: text('content'),
    isRead: boolean('is_read').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const reactions = pgTable('reactions', {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }),
    emoji: text('emoji').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
    unqReaction: uniqueIndex('unq_reaction').on(t.messageId, t.userId, t.emoji),
}));
