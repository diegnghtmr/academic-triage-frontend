import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums as const
export const ROLES = ["ADMIN", "STAFF", "STUDENT"] as const;
export const REQUEST_STATUSES = ["REGISTERED", "CLASSIFIED", "IN_PROGRESS", "ATTENDED", "CLOSED", "CANCELLED", "REJECTED"] as const;
export const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export const CONDITION_TYPES = ["REQUEST_TYPE", "DEADLINE", "REQUEST_TYPE_AND_DEADLINE"] as const;

// ==================== USERS ====================
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  identification: text("identification").notNull(),
  role: text("role", { enum: ROLES }).notNull().default("STUDENT"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export const registerSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(4),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  identification: z.string().min(1),
  role: z.enum(ROLES).optional().default("STUDENT"),
});
export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  identification: z.string().min(1).optional(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ==================== REQUEST TYPES ====================
export const requestTypes = sqliteTable("request_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const insertRequestTypeSchema = createInsertSchema(requestTypes).omit({ id: true });
export const updateRequestTypeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

export type InsertRequestType = z.infer<typeof insertRequestTypeSchema>;
export type RequestType = typeof requestTypes.$inferSelect;

// ==================== ORIGIN CHANNELS ====================
export const originChannels = sqliteTable("origin_channels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const insertOriginChannelSchema = createInsertSchema(originChannels).omit({ id: true });
export const updateOriginChannelSchema = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

export type InsertOriginChannel = z.infer<typeof insertOriginChannelSchema>;
export type OriginChannel = typeof originChannels.$inferSelect;

// ==================== REQUESTS ====================
export const requests = sqliteTable("requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  description: text("description").notNull(),
  registrationDateTime: text("registration_date_time").notNull(),
  status: text("status", { enum: REQUEST_STATUSES }).notNull().default("REGISTERED"),
  priority: text("priority", { enum: PRIORITIES }),
  priorityJustification: text("priority_justification"),
  closingObservation: text("closing_observation"),
  cancellationReason: text("cancellation_reason"),
  rejectionReason: text("rejection_reason"),
  deadline: text("deadline"),
  aiSuggested: integer("ai_suggested", { mode: "boolean" }).notNull().default(false),
  requestTypeId: integer("request_type_id").references(() => requestTypes.id),
  originChannelId: integer("origin_channel_id").references(() => originChannels.id),
  requesterId: integer("requester_id").notNull().references(() => users.id),
  assignedToUserId: integer("assigned_to_user_id").references(() => users.id),
});

export const insertRequestSchema = z.object({
  description: z.string().min(1),
  requestTypeId: z.number().int().optional(),
  originChannelId: z.number().int().optional(),
  deadline: z.string().optional(),
});
export const classifyRequestSchema = z.object({
  requestTypeId: z.number().int(),
  observations: z.string().optional(),
});
export const prioritizeRequestSchema = z.object({
  priority: z.enum(PRIORITIES),
  priorityJustification: z.string().optional(),
});
export const assignRequestSchema = z.object({
  assignedToUserId: z.number().int(),
  observations: z.string().optional(),
});
export const attendRequestSchema = z.object({
  observations: z.string().optional(),
});
export const closeRequestSchema = z.object({
  closingObservation: z.string().min(1),
});
export const cancelRequestSchema = z.object({
  cancellationReason: z.string().min(1),
});
export const rejectRequestSchema = z.object({
  rejectionReason: z.string().min(1),
});

export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type Request = typeof requests.$inferSelect;

// ==================== HISTORY ENTRIES ====================
export const historyEntries = sqliteTable("history_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  action: text("action").notNull(),
  observations: text("observations"),
  timestamp: text("timestamp").notNull(),
  requestId: integer("request_id").notNull().references(() => requests.id),
  performedByUserId: integer("performed_by_user_id").notNull().references(() => users.id),
});

export const insertHistoryEntrySchema = z.object({
  observations: z.string().min(1),
});

export type InsertHistoryEntry = z.infer<typeof insertHistoryEntrySchema>;
export type HistoryEntry = typeof historyEntries.$inferSelect;

// ==================== BUSINESS RULES ====================
export const businessRules = sqliteTable("business_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  conditionType: text("condition_type", { enum: CONDITION_TYPES }).notNull(),
  conditionValue: text("condition_value").notNull(),
  resultingPriority: text("resulting_priority", { enum: PRIORITIES }).notNull(),
  requestTypeId: integer("request_type_id").references(() => requestTypes.id),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const insertBusinessRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  conditionType: z.enum(CONDITION_TYPES),
  conditionValue: z.string().min(1),
  resultingPriority: z.enum(PRIORITIES),
  requestTypeId: z.number().int().optional(),
  active: z.boolean().optional().default(true),
});
export const updateBusinessRuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  conditionType: z.enum(CONDITION_TYPES).optional(),
  conditionValue: z.string().min(1).optional(),
  resultingPriority: z.enum(PRIORITIES).optional(),
  requestTypeId: z.number().int().nullable().optional(),
  active: z.boolean().optional(),
});

export type InsertBusinessRule = z.infer<typeof insertBusinessRuleSchema>;
export type BusinessRule = typeof businessRules.$inferSelect;

// ==================== Dashboard types ====================
export type DashboardMetrics = {
  totalRequests: number;
  requestsByStatus: Record<string, number>;
  requestsByType: Array<{ typeName: string; count: number }>;
  requestsByPriority: Record<string, number>;
  averageResolutionTimeHours: number;
  topResponsibles: Array<{ userId: number; fullName: string; count: number }>;
};
