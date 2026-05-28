import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const files = pgTable('files', {
  id: serial('id').primaryKey(),
  name: varchar('name').notNull(),
  path: varchar('path').notNull().unique(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name').notNull(),
  email: varchar('email').notNull().unique(),
  password_hash: varchar('password_hash').notNull(),
  provider: boolean('provider').default(false).notNull(),
  avatar_id: integer('avatar_id').references(() => files.id, {
    onDelete: 'set null',
    onUpdate: 'cascade',
  }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  date: timestamp('date').notNull(),
  user_id: integer('user_id').references(() => users.id, {
    onDelete: 'set null',
    onUpdate: 'cascade',
  }),
  provider_id: integer('provider_id').references(() => users.id, {
    onDelete: 'set null',
    onUpdate: 'cascade',
  }),
  canceled_at: timestamp('canceled_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one }) => ({
  avatar: one(files, {
    fields: [users.avatar_id],
    references: [files.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  user: one(users, {
    fields: [appointments.user_id],
    references: [users.id],
    relationName: 'user',
  }),
  provider: one(users, {
    fields: [appointments.provider_id],
    references: [users.id],
    relationName: 'provider',
  }),
}));
