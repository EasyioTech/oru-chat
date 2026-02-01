import { pgTable, uuid, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { profiles, messages } from './schema';

export const reactions = pgTable('reactions', {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }),
    emoji: text('emoji').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
    unqReaction: uniqueIndex('unq_reaction').on(t.messageId, t.userId, t.emoji),
}));
