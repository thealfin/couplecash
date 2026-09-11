import {
  pgTable, pgEnum, uuid, varchar, text, numeric, boolean,
  timestamp, date, time, smallint, bigint, jsonb, uniqueIndex, index, check,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { uuidV7PrimaryKey } from './helpers';

export const roleTypeEnum = pgEnum('role_type', ['suami', 'istri', 'single']);
export const accountTypeEnum = pgEnum('account_type', ['bank', 'e_wallet', 'deposito', 'cash', 'debt', 'crypto']);
export const ownershipTypeEnum = pgEnum('ownership_type', ['suami', 'istri', 'bersama', 'sendiri']);
export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense', 'goals', 'debt', 'transfer']);
export const transactionSourceEnum = pgEnum('transaction_source', ['manual', 'ai_scan']);
export const budgetPeriodEnum = pgEnum('budget_period', ['mingguan', 'bulanan', 'berkala']);
export const billStatusEnum = pgEnum('bill_status', ['pending', 'lunas', 'terlambat']);
export const themePrefEnum = pgEnum('theme_pref', ['light', 'dark', 'system']);
export const vaultPlatformTypeEnum = pgEnum('vault_platform_type', ['bank', 'e_wallet', 'crypto_wallet', 'lainnya']);
export const storageProviderEnum = pgEnum('storage_provider', ['cloudflare_r2']);
export const paymentMethodEnum = pgEnum('payment_method', ['QRIS', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'VIRTUAL_ACCOUNT']);

export const households = pgTable('households', {
  id: uuidV7PrimaryKey(),
  name: varchar('name', { length: 120 }).notNull().default('Keluarga Kami'),
  inviteCode: varchar('invite_code', { length: 20 }).notNull().unique(),
  currency: varchar('currency', { length: 6 }).notNull().default('IDR'),
  periodStartDay: smallint('period_start_day').notNull().default(1),
  motto: varchar('motto', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: uuidV7PrimaryKey(),
  authUserId: uuid('auth_user_id').notNull().unique(),
  householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }),
  role: roleTypeEnum('role'),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  avatarObjectKey: text('avatar_object_key'),
  appPinHash: varchar('app_pin_hash', { length: 255 }),
  biometricEnabled: boolean('biometric_enabled').notNull().default(false),
  theme: themePrefEnum('theme').notNull().default('system'),
  language: varchar('language', { length: 10 }).notNull().default('id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdRoleUnique: uniqueIndex('users_household_role_unique').on(table.householdId, table.role),
  householdIdx: index('idx_users_household').on(table.householdId),
}));

export const financialAccounts = pgTable('financial_accounts', {
  id: uuidV7PrimaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  ownerType: ownershipTypeEnum('owner_type').default('bersama'),
  accountType: accountTypeEnum('account_type').notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  accountNumberMasked: varchar('account_number_masked', { length: 50 }),
  accountNumberEncrypted: text('account_number_encrypted'),
  initialBalance: numeric('initial_balance', { precision: 18, scale: 2 }).notNull().default('0'),
  currentBalance: numeric('current_balance', { precision: 18, scale: 2 }).notNull().default('0'),
  icon: varchar('icon', { length: 50 }),
  debtStatus: varchar('debt_status', { length: 30 }).default('active'),
  isActive: boolean('is_active').notNull().default(true),
  isDeleted: boolean('is_deleted').notNull().default(false),
  isVisible: boolean('is_visible').notNull().default(true),
  goalId: uuid('goal_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdIdx: index('idx_accounts_household').on(table.householdId),
}));

export const categories = pgTable('categories', {
  id: uuidV7PrimaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  type: transactionTypeEnum('type').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 50 }),
  colorToken: varchar('color_token', { length: 30 }),
  appliesTo: ownershipTypeEnum('applies_to').notNull().default('bersama'),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdTypeNameUnique: uniqueIndex('categories_household_type_name_unique')
    .on(table.householdId, table.type, table.name),
}));

export const transactions = pgTable('transactions', {
  id: uuidV7PrimaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').notNull().references(() => financialAccounts.id),
  destinationAccountId: uuid('destination_account_id').references(() => financialAccounts.id, { onDelete: 'set null' }),
  categoryId: uuid('category_id').references(() => categories.id),
  recordedByUserId: uuid('recorded_by_user_id').notNull().references(() => users.id),
  ownerType: ownershipTypeEnum('owner_type').notNull().default('bersama'),
  type: transactionTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  taxAmount: numeric('tax_amount', { precision: 18, scale: 2 }).notNull().default('0'),
  paymentMethod: paymentMethodEnum('payment_method'),
  transactionDate: date('transaction_date').notNull(),
  transactionTime: time('transaction_time').notNull().default(sql`current_time`),
  merchantName: varchar('merchant_name', { length: 200 }),
  note: text('note'),
  previousRole: varchar('previous_role', { length: 30 }),
  source: transactionSourceEnum('source').notNull().default('manual'),
  receiptObjectKey: text('receipt_object_key'),
  receiptStorage: storageProviderEnum('receipt_storage').default('cloudflare_r2'),
  aiConfidence: numeric('ai_confidence', { precision: 4, scale: 3 }),
  eventLabel: varchar('event_label', { length: 150 }),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  amountPositive: check('amount_positive', sql`${table.amount} > 0`),
  taxAmountValid: check('chk_tax_amount', sql`${table.taxAmount} >= 0 AND ${table.taxAmount} <= ${table.amount}`),
  householdDateIdx: index('idx_tx_household_date').on(table.householdId, table.transactionDate),
  accountIdx: index('idx_tx_account').on(table.accountId),
  categoryIdx: index('idx_tx_category').on(table.categoryId),
  ownerIdx: index('idx_tx_owner').on(table.householdId, table.ownerType),
}));

export const budgets = pgTable('budgets', {
  id: uuidV7PrimaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 150 }),
  categoryId: uuid('category_id').references(() => categories.id),
  generatedCategoryId: uuid('generated_category_id').references(() => categories.id, { onDelete: 'set null' }),
  ownerType: ownershipTypeEnum('owner_type').notNull().default('bersama'),
  periodType: budgetPeriodEnum('period_type').notNull(),
  limitAmount: numeric('limit_amount', { precision: 18, scale: 2 }).notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdPeriodIdx: index('idx_budgets_household_period').on(table.householdId, table.periodStart, table.periodEnd),
}));

export const goals = pgTable('goals', {
  id: uuidV7PrimaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id),
  name: varchar('name', { length: 150 }).notNull(),
  targetDate: date('target_date').notNull(),
  targetAmount: numeric('target_amount', { precision: 18, scale: 2 }).notNull(),
  partner1Contribution: numeric('partner1_contribution', { precision: 18, scale: 2 }).notNull().default('0'),
  partner2Contribution: numeric('partner2_contribution', { precision: 18, scale: 2 }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  passiveAccountId: uuid('passive_account_id').references(() => financialAccounts.id, { onDelete: 'set null' }),
  generatedCategoryId: uuid('generated_category_id').references(() => categories.id, { onDelete: 'set null' }),
  icon: varchar('icon', { length: 50 }).default('🎯'),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdIdx: index('idx_goals_household').on(table.householdId),
  categoryIdx: index('idx_goals_category').on(table.categoryId),
}));

export const bills = pgTable('bills', {
  id: uuidV7PrimaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  ownerType: ownershipTypeEnum('owner_type').notNull().default('bersama'),
  name: varchar('name', { length: 150 }).notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  dueDate: date('due_date').notNull(),
  icon: varchar('icon', { length: 50 }),
  isRecurring: boolean('is_recurring').notNull().default(true),
  recurrenceRule: varchar('recurrence_rule', { length: 50 }),
  status: billStatusEnum('status').notNull().default('pending'),
  linkedTransactionId: uuid('linked_transaction_id').references(() => transactions.id),
  reminderDaysBefore: smallint('reminder_days_before').notNull().default(3),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdDueIdx: index('idx_bills_household_due').on(table.householdId, table.dueDate),
}));

export const vaultCredentials = pgTable('vault_credentials', {
  id: uuidV7PrimaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  ownerUserId: uuid('owner_user_id').notNull().references(() => users.id),
  platformType: vaultPlatformTypeEnum('platform_type').notNull().default('bank'),
  platformName: varchar('platform_name', { length: 150 }).notNull(),
  usernameMasked: varchar('username_masked', { length: 150 }),
  secretEncrypted: text('secret_encrypted').notNull(),
  secretEncryptionIv: varchar('secret_encryption_iv', { length: 64 }),
  encryptionVersion: smallint('encryption_version').notNull().default(1),
  encryptionAlgorithm: varchar('encryption_algorithm', { length: 30 }).notNull().default('AES-GCM-256'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdIdx: index('idx_vault_household').on(table.householdId),
  householdDeletedIdx: index('idx_vault_household_deleted').on(table.householdId, table.isDeleted),
}));

export const userBiometricCredentials = pgTable('user_biometric_credentials', {
  id: uuidV7PrimaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  credentialId: text('credential_id').notNull().unique(),
  publicKey: text('public_key').notNull(),
  counter: bigint('counter', { mode: 'number' }).notNull().default(0),
  transports: jsonb('transports'),
  deviceType: text('device_type'),
  backedUp: boolean('backed_up').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (table) => ({
  userIdx: index('idx_biometric_user').on(table.userId),
  credentialIdx: index('idx_biometric_credential').on(table.credentialId),
}));

// ── Relations ──

export const householdsRelations = relations(households, ({ many }) => ({
  users: many(users),
  financialAccounts: many(financialAccounts),
  transactions: many(transactions),
  budgets: many(budgets),
  goals: many(goals),
  bills: many(bills),
  categories: many(categories),
  vaultCredentials: many(vaultCredentials),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  household: one(households, { fields: [users.householdId], references: [households.id] }),
  transactions: many(transactions),
  goals: many(goals),
  vaultCredentials: many(vaultCredentials),
  biometricCredentials: many(userBiometricCredentials),
}));

export const financialAccountsRelations = relations(financialAccounts, ({ one, many }) => ({
  household: one(households, { fields: [financialAccounts.householdId], references: [households.id] }),
  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  household: one(households, { fields: [categories.householdId], references: [households.id] }),
  transactions: many(transactions),
  budgets: many(budgets),
  goals: many(goals),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  household: one(households, { fields: [goals.householdId], references: [households.id] }),
  category: one(categories, { fields: [goals.categoryId], references: [categories.id] }),
  createdByUser: one(users, { fields: [goals.createdByUserId], references: [users.id] }),
}));

export const billsRelations = relations(bills, ({ one }) => ({
  household: one(households, { fields: [bills.householdId], references: [households.id] }),
  linkedTransaction: one(transactions, { fields: [bills.linkedTransactionId], references: [transactions.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  household: one(households, { fields: [transactions.householdId], references: [households.id] }),
  account: one(financialAccounts, { fields: [transactions.accountId], references: [financialAccounts.id] }),
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] }),
  recordedBy: one(users, { fields: [transactions.recordedByUserId], references: [users.id] }),
  bills: many(bills),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  household: one(households, { fields: [budgets.householdId], references: [households.id] }),
  category: one(categories, { fields: [budgets.categoryId], references: [categories.id] }),
}));

export const vaultCredentialsRelations = relations(vaultCredentials, ({ one }) => ({
  household: one(households, { fields: [vaultCredentials.householdId], references: [households.id] }),
  ownerUser: one(users, { fields: [vaultCredentials.ownerUserId], references: [users.id] }),
}));

// ── AI: USER SETTINGS (non-sensitive preferences only — no API key) ──
export const aiUserSettings = pgTable('ai_user_settings', {
  id: uuidV7PrimaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  aiEnabled: boolean('ai_enabled').notNull().default(false),
  preferredModel: varchar('preferred_model', { length: 50 }).default('gemini-1.5-flash'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── AI: CHAT SESSIONS & MESSAGES ──
export const aiChatSessions = pgTable('ai_chat_sessions', {
  id: uuidV7PrimaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  title: varchar('title', { length: 150 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const aiChatMessages = pgTable('ai_chat_messages', {
  id: uuidV7PrimaryKey(),
  sessionId: uuid('session_id').notNull().references(() => aiChatSessions.id, { onDelete: 'cascade' }),
  sender: varchar('sender', { length: 10 }).notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── AUDIT LOGS ──
export const auditLogs = pgTable('audit_logs', {
  id: uuidV7PrimaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  action: varchar('action', { length: 60 }).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userBiometricCredentialsRelations = relations(userBiometricCredentials, ({ one }) => ({
  user: one(users, { fields: [userBiometricCredentials.userId], references: [users.id] }),
}));

// ── Extended Relations ──

export const aiUserSettingsRelations = relations(aiUserSettings, ({ one }) => ({
  user: one(users, { fields: [aiUserSettings.userId], references: [users.id] }),
}));

export const aiChatSessionsRelations = relations(aiChatSessions, ({ one, many }) => ({
  household: one(households, { fields: [aiChatSessions.householdId], references: [households.id] }),
  user: one(users, { fields: [aiChatSessions.userId], references: [users.id] }),
  messages: many(aiChatMessages),
}));

export const aiChatMessagesRelations = relations(aiChatMessages, ({ one }) => ({
  session: one(aiChatSessions, { fields: [aiChatMessages.sessionId], references: [aiChatSessions.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  household: one(households, { fields: [auditLogs.householdId], references: [households.id] }),
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));
