import {
  type User,
  type InsertUser,
  type RequestType,
  type InsertRequestType,
  type OriginChannel,
  type InsertOriginChannel,
  type Request,
  type HistoryEntry,
  type BusinessRule,
  type InsertBusinessRule,
  type DashboardMetrics,
  users,
  requestTypes,
  originChannels,
  requests,
  historyEntries,
  businessRules,
  ROLES,
  REQUEST_STATUSES,
  PRIORITIES,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, like, sql, count, desc, asc, inArray } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  // Auth
  findUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Users
  listUsers(params: { page?: number; limit?: number; role?: string; active?: boolean }): Promise<{ data: User[]; total: number; page: number; limit: number }>;
  getUserById(id: number): Promise<User | undefined>;
  updateUser(id: number, data: Partial<Omit<User, "id">>): Promise<User | undefined>;

  // Request Types
  listRequestTypes(params: { active?: boolean }): Promise<RequestType[]>;
  createRequestType(data: { name: string; description?: string; active?: boolean }): Promise<RequestType>;
  getRequestTypeById(id: number): Promise<RequestType | undefined>;
  updateRequestType(id: number, data: Partial<Omit<RequestType, "id">>): Promise<RequestType | undefined>;

  // Origin Channels
  listOriginChannels(params: { active?: boolean }): Promise<OriginChannel[]>;
  createOriginChannel(data: { name: string; active?: boolean }): Promise<OriginChannel>;
  getOriginChannelById(id: number): Promise<OriginChannel | undefined>;
  updateOriginChannel(id: number, data: Partial<Omit<OriginChannel, "id">>): Promise<OriginChannel | undefined>;

  // Business Rules
  listBusinessRules(params: { active?: boolean; conditionType?: string }): Promise<BusinessRule[]>;
  createBusinessRule(data: InsertBusinessRule): Promise<BusinessRule>;
  getBusinessRuleById(id: number): Promise<BusinessRule | undefined>;
  updateBusinessRule(id: number, data: Partial<Omit<BusinessRule, "id">>): Promise<BusinessRule | undefined>;
  deactivateBusinessRule(id: number): Promise<boolean>;

  // Requests
  createRequest(data: { description: string; requestTypeId?: number; originChannelId?: number; deadline?: string; requesterId: number }): Promise<Request>;
  listRequests(params: { page?: number; limit?: number; status?: string; priority?: string; requestTypeId?: number; requesterId?: number; assignedToUserId?: number }): Promise<{ data: Request[]; total: number; page: number; limit: number }>;
  getRequestById(id: number): Promise<Request | undefined>;
  updateRequest(id: number, data: Partial<Omit<Request, "id">>): Promise<Request | undefined>;
  getPrioritySuggestion(requestId: number): Promise<{ priority: string; justification: string }>;

  // History
  getRequestHistory(requestId: number): Promise<HistoryEntry[]>;
  addHistoryEntry(data: { action: string; observations?: string; requestId: number; performedByUserId: number }): Promise<HistoryEntry>;

  // Reports
  getDashboardMetrics(): Promise<DashboardMetrics>;

  // Seed
  seed(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Create tables synchronously
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        identification TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'STUDENT',
        active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS request_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS origin_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        registration_date_time TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'REGISTERED',
        priority TEXT,
        priority_justification TEXT,
        closing_observation TEXT,
        cancellation_reason TEXT,
        rejection_reason TEXT,
        deadline TEXT,
        ai_suggested INTEGER NOT NULL DEFAULT 0,
        request_type_id INTEGER REFERENCES request_types(id),
        origin_channel_id INTEGER REFERENCES origin_channels(id),
        requester_id INTEGER NOT NULL REFERENCES users(id),
        assigned_to_user_id INTEGER REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS history_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        observations TEXT,
        timestamp TEXT NOT NULL,
        request_id INTEGER NOT NULL REFERENCES requests(id),
        performed_by_user_id INTEGER NOT NULL REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS business_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        condition_type TEXT NOT NULL,
        condition_value TEXT NOT NULL,
        resulting_priority TEXT NOT NULL,
        request_type_id INTEGER REFERENCES request_types(id),
        active INTEGER NOT NULL DEFAULT 1
      );
    `);
  }

  // ==================== AUTH ====================
  async findUserByUsername(username: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.username, username)).get();
  }

  async createUser(user: InsertUser): Promise<User> {
    return db.insert(users).values(user).returning().get();
  }

  // ==================== USERS ====================
  async listUsers(params: { page?: number; limit?: number; role?: string; active?: boolean }): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (params.role) conditions.push(eq(users.role, params.role as any));
    if (params.active !== undefined) conditions.push(eq(users.active, params.active));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = db
      .select({ count: count() })
      .from(users)
      .where(whereClause)
      .get();
    const total = totalResult?.count || 0;

    const data = db
      .select()
      .from(users)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .all();

    return { data, total, page, limit };
  }

  async getUserById(id: number): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  async updateUser(id: number, data: Partial<Omit<User, "id">>): Promise<User | undefined> {
    const result = db.update(users).set(data).where(eq(users.id, id)).returning().get();
    return result;
  }

  // ==================== REQUEST TYPES ====================
  async listRequestTypes(params: { active?: boolean }): Promise<RequestType[]> {
    if (params.active !== undefined) {
      return db.select().from(requestTypes).where(eq(requestTypes.active, params.active)).all();
    }
    return db.select().from(requestTypes).all();
  }

  async createRequestType(data: { name: string; description?: string; active?: boolean }): Promise<RequestType> {
    return db.insert(requestTypes).values({
      name: data.name,
      description: data.description || "",
      active: data.active !== undefined ? data.active : true,
    }).returning().get();
  }

  async getRequestTypeById(id: number): Promise<RequestType | undefined> {
    return db.select().from(requestTypes).where(eq(requestTypes.id, id)).get();
  }

  async updateRequestType(id: number, data: Partial<Omit<RequestType, "id">>): Promise<RequestType | undefined> {
    return db.update(requestTypes).set(data).where(eq(requestTypes.id, id)).returning().get();
  }

  // ==================== ORIGIN CHANNELS ====================
  async listOriginChannels(params: { active?: boolean }): Promise<OriginChannel[]> {
    if (params.active !== undefined) {
      return db.select().from(originChannels).where(eq(originChannels.active, params.active)).all();
    }
    return db.select().from(originChannels).all();
  }

  async createOriginChannel(data: { name: string; active?: boolean }): Promise<OriginChannel> {
    return db.insert(originChannels).values({
      name: data.name,
      active: data.active !== undefined ? data.active : true,
    }).returning().get();
  }

  async getOriginChannelById(id: number): Promise<OriginChannel | undefined> {
    return db.select().from(originChannels).where(eq(originChannels.id, id)).get();
  }

  async updateOriginChannel(id: number, data: Partial<Omit<OriginChannel, "id">>): Promise<OriginChannel | undefined> {
    return db.update(originChannels).set(data).where(eq(originChannels.id, id)).returning().get();
  }

  // ==================== BUSINESS RULES ====================
  async listBusinessRules(params: { active?: boolean; conditionType?: string }): Promise<BusinessRule[]> {
    const conditions: any[] = [];
    if (params.active !== undefined) conditions.push(eq(businessRules.active, params.active));
    if (params.conditionType) conditions.push(eq(businessRules.conditionType, params.conditionType as any));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return db.select().from(businessRules).where(whereClause).all();
  }

  async createBusinessRule(data: InsertBusinessRule): Promise<BusinessRule> {
    return db.insert(businessRules).values({
      name: data.name,
      description: data.description || "",
      conditionType: data.conditionType,
      conditionValue: data.conditionValue,
      resultingPriority: data.resultingPriority,
      requestTypeId: data.requestTypeId || null,
      active: data.active !== undefined ? data.active : true,
    }).returning().get();
  }

  async getBusinessRuleById(id: number): Promise<BusinessRule | undefined> {
    return db.select().from(businessRules).where(eq(businessRules.id, id)).get();
  }

  async updateBusinessRule(id: number, data: Partial<Omit<BusinessRule, "id">>): Promise<BusinessRule | undefined> {
    return db.update(businessRules).set(data).where(eq(businessRules.id, id)).returning().get();
  }

  async deactivateBusinessRule(id: number): Promise<boolean> {
    const result = db.update(businessRules).set({ active: false }).where(eq(businessRules.id, id)).returning().get();
    return !!result;
  }

  // ==================== REQUESTS ====================
  async createRequest(data: { description: string; requestTypeId?: number; originChannelId?: number; deadline?: string; requesterId: number }): Promise<Request> {
    const now = new Date().toISOString();
    return db.insert(requests).values({
      description: data.description,
      registrationDateTime: now,
      status: "REGISTERED",
      requestTypeId: data.requestTypeId || null,
      originChannelId: data.originChannelId || null,
      deadline: data.deadline || null,
      requesterId: data.requesterId,
      aiSuggested: false,
    }).returning().get();
  }

  async listRequests(params: { page?: number; limit?: number; status?: string; priority?: string; requestTypeId?: number; requesterId?: number; assignedToUserId?: number }): Promise<{ data: Request[]; total: number; page: number; limit: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (params.status) conditions.push(eq(requests.status, params.status as any));
    if (params.priority) conditions.push(eq(requests.priority, params.priority as any));
    if (params.requestTypeId) conditions.push(eq(requests.requestTypeId, params.requestTypeId));
    if (params.requesterId) conditions.push(eq(requests.requesterId, params.requesterId));
    if (params.assignedToUserId) conditions.push(eq(requests.assignedToUserId, params.assignedToUserId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = db
      .select({ count: count() })
      .from(requests)
      .where(whereClause)
      .get();
    const total = totalResult?.count || 0;

    const data = db
      .select()
      .from(requests)
      .where(whereClause)
      .orderBy(desc(requests.id))
      .limit(limit)
      .offset(offset)
      .all();

    return { data, total, page, limit };
  }

  async getRequestById(id: number): Promise<Request | undefined> {
    return db.select().from(requests).where(eq(requests.id, id)).get();
  }

  async updateRequest(id: number, data: Partial<Omit<Request, "id">>): Promise<Request | undefined> {
    return db.update(requests).set(data).where(eq(requests.id, id)).returning().get();
  }

  async getPrioritySuggestion(requestId: number): Promise<{ priority: string; justification: string }> {
    const request = await this.getRequestById(requestId);
    if (!request) throw new Error("Request not found");

    // Check business rules
    const rules = await this.listBusinessRules({ active: true });

    for (const rule of rules) {
      if (rule.conditionType === "REQUEST_TYPE" && request.requestTypeId) {
        // conditionValue holds the requestType id
        if (String(request.requestTypeId) === rule.conditionValue || (rule.requestTypeId && rule.requestTypeId === request.requestTypeId)) {
          return {
            priority: rule.resultingPriority,
            justification: `Regla de negocio "${rule.name}": tipo de solicitud coincide. ${rule.description}`,
          };
        }
      }
      if (rule.conditionType === "DEADLINE" && request.deadline) {
        const deadlineDate = new Date(request.deadline);
        const now = new Date();
        const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const thresholdDays = parseInt(rule.conditionValue, 10);
        if (!isNaN(thresholdDays) && daysUntilDeadline <= thresholdDays) {
          return {
            priority: rule.resultingPriority,
            justification: `Regla de negocio "${rule.name}": fecha límite dentro de ${daysUntilDeadline} días (umbral: ${thresholdDays} días). ${rule.description}`,
          };
        }
      }
      if (rule.conditionType === "REQUEST_TYPE_AND_DEADLINE" && request.requestTypeId && request.deadline) {
        const matchesType = (rule.requestTypeId && rule.requestTypeId === request.requestTypeId) || String(request.requestTypeId) === rule.conditionValue.split(",")[0];
        const deadlineDate = new Date(request.deadline);
        const now = new Date();
        const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const parts = rule.conditionValue.split(",");
        const thresholdDays = parseInt(parts[1] || parts[0], 10);
        if (matchesType && !isNaN(thresholdDays) && daysUntilDeadline <= thresholdDays) {
          return {
            priority: rule.resultingPriority,
            justification: `Regla de negocio "${rule.name}": tipo de solicitud y fecha límite coinciden. ${rule.description}`,
          };
        }
      }
    }

    // Default heuristic based on description keywords
    const desc = (request.description || "").toLowerCase();
    if (desc.includes("urgente") || desc.includes("inmediato") || desc.includes("plazo vencido")) {
      return { priority: "HIGH", justification: "La descripción contiene términos de urgencia." };
    }
    if (desc.includes("certificado") || desc.includes("homologación")) {
      return { priority: "MEDIUM", justification: "Tipo de trámite con prioridad media habitual." };
    }
    return { priority: "LOW", justification: "No se encontraron reglas de negocio aplicables. Prioridad baja por defecto." };
  }

  // ==================== HISTORY ====================
  async getRequestHistory(requestId: number): Promise<HistoryEntry[]> {
    return db.select().from(historyEntries).where(eq(historyEntries.requestId, requestId)).orderBy(asc(historyEntries.id)).all();
  }

  async addHistoryEntry(data: { action: string; observations?: string; requestId: number; performedByUserId: number }): Promise<HistoryEntry> {
    const now = new Date().toISOString();
    return db.insert(historyEntries).values({
      action: data.action,
      observations: data.observations || null,
      timestamp: now,
      requestId: data.requestId,
      performedByUserId: data.performedByUserId,
    }).returning().get();
  }

  // ==================== REPORTS ====================
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    // Total requests
    const totalResult = db.select({ count: count() }).from(requests).get();
    const totalRequests = totalResult?.count || 0;

    // Requests by status
    const statusRows = db
      .select({ status: requests.status, count: count() })
      .from(requests)
      .groupBy(requests.status)
      .all();
    const requestsByStatus: Record<string, number> = {};
    for (const s of REQUEST_STATUSES) {
      requestsByStatus[s] = 0;
    }
    for (const row of statusRows) {
      requestsByStatus[row.status] = row.count;
    }

    // Requests by type
    const typeRows = db
      .select({
        typeName: requestTypes.name,
        count: count(),
      })
      .from(requests)
      .leftJoin(requestTypes, eq(requests.requestTypeId, requestTypes.id))
      .groupBy(requests.requestTypeId)
      .all();
    const requestsByType = typeRows.map((row) => ({
      typeName: row.typeName || "Sin clasificar",
      count: row.count,
    }));

    // Requests by priority
    const priorityRows = db
      .select({ priority: requests.priority, count: count() })
      .from(requests)
      .groupBy(requests.priority)
      .all();
    const requestsByPriority: Record<string, number> = {};
    for (const p of PRIORITIES) {
      requestsByPriority[p] = 0;
    }
    requestsByPriority["UNSET"] = 0;
    for (const row of priorityRows) {
      requestsByPriority[row.priority || "UNSET"] = row.count;
    }

    // Average resolution time (from REGISTERED to CLOSED)
    const closedRequests = db
      .select()
      .from(requests)
      .where(eq(requests.status, "CLOSED"))
      .all();

    let totalHours = 0;
    let closedCount = 0;
    for (const req of closedRequests) {
      const start = new Date(req.registrationDateTime).getTime();
      // Find the closing history entry
      const closingEntry = db
        .select()
        .from(historyEntries)
        .where(and(
          eq(historyEntries.requestId, req.id),
          eq(historyEntries.action, "CLOSED")
        ))
        .get();
      if (closingEntry) {
        const end = new Date(closingEntry.timestamp).getTime();
        totalHours += (end - start) / (1000 * 60 * 60);
        closedCount++;
      }
    }
    const averageResolutionTimeHours = closedCount > 0 ? Math.round((totalHours / closedCount) * 100) / 100 : 0;

    // Top responsibles
    const responsibleRows = db
      .select({
        userId: requests.assignedToUserId,
        count: count(),
      })
      .from(requests)
      .where(sql`${requests.assignedToUserId} IS NOT NULL`)
      .groupBy(requests.assignedToUserId)
      .orderBy(desc(count()))
      .limit(5)
      .all();

    const topResponsibles: Array<{ userId: number; fullName: string; count: number }> = [];
    for (const row of responsibleRows) {
      if (row.userId) {
        const user = await this.getUserById(row.userId);
        topResponsibles.push({
          userId: row.userId,
          fullName: user ? `${user.firstName} ${user.lastName}` : "Desconocido",
          count: row.count,
        });
      }
    }

    return {
      totalRequests,
      requestsByStatus,
      requestsByType,
      requestsByPriority,
      averageResolutionTimeHours,
      topResponsibles,
    };
  }

  // ==================== SEED ====================
  async seed(): Promise<void> {
    // Check if already seeded
    const existingUsers = db.select().from(users).all();
    if (existingUsers.length > 0) return;

    // Users
    const adminUser = db.insert(users).values({
      username: "admin",
      email: "admin@universidad.edu",
      password: "admin123",
      firstName: "Carlos",
      lastName: "Administrador",
      identification: "ADM-001",
      role: "ADMIN",
      active: true,
    }).returning().get();

    const staff1 = db.insert(users).values({
      username: "staff1",
      email: "maria.gomez@universidad.edu",
      password: "staff123",
      firstName: "María",
      lastName: "Gómez",
      identification: "STF-001",
      role: "STAFF",
      active: true,
    }).returning().get();

    const staff2 = db.insert(users).values({
      username: "staff2",
      email: "juan.perez@universidad.edu",
      password: "staff123",
      firstName: "Juan",
      lastName: "Pérez",
      identification: "STF-002",
      role: "STAFF",
      active: true,
    }).returning().get();

    const student1 = db.insert(users).values({
      username: "student1",
      email: "ana.martinez@universidad.edu",
      password: "student123",
      firstName: "Ana",
      lastName: "Martínez",
      identification: "EST-001",
      role: "STUDENT",
      active: true,
    }).returning().get();

    const student2 = db.insert(users).values({
      username: "student2",
      email: "luis.rodriguez@universidad.edu",
      password: "student123",
      firstName: "Luis",
      lastName: "Rodríguez",
      identification: "EST-002",
      role: "STUDENT",
      active: true,
    }).returning().get();

    const student3 = db.insert(users).values({
      username: "student3",
      email: "sofia.hernandez@universidad.edu",
      password: "student123",
      firstName: "Sofía",
      lastName: "Hernández",
      identification: "EST-003",
      role: "STUDENT",
      active: true,
    }).returning().get();

    // Request Types
    const rt1 = db.insert(requestTypes).values({ name: "Revisión de Nota", description: "Solicitud de revisión de calificación en una asignatura", active: true }).returning().get();
    const rt2 = db.insert(requestTypes).values({ name: "Certificado de Estudio", description: "Solicitud de certificado de estudios académicos", active: true }).returning().get();
    const rt3 = db.insert(requestTypes).values({ name: "Solicitud de Cupo", description: "Solicitud de cupo adicional en una asignatura", active: true }).returning().get();
    const rt4 = db.insert(requestTypes).values({ name: "Homologación", description: "Solicitud de homologación de asignaturas cursadas en otra institución", active: true }).returning().get();
    const rt5 = db.insert(requestTypes).values({ name: "Cancelación de Asignatura", description: "Solicitud de cancelación de matrícula en una asignatura", active: true }).returning().get();

    // Origin Channels
    const ch1 = db.insert(originChannels).values({ name: "Presencial", active: true }).returning().get();
    const ch2 = db.insert(originChannels).values({ name: "Correo Electrónico", active: true }).returning().get();
    const ch3 = db.insert(originChannels).values({ name: "Sistema Académico", active: true }).returning().get();
    const ch4 = db.insert(originChannels).values({ name: "Teléfono", active: true }).returning().get();

    // Business Rules
    db.insert(businessRules).values({
      name: "Revisión de nota urgente",
      description: "Las revisiones de nota con plazo menor a 3 días son de alta prioridad",
      conditionType: "REQUEST_TYPE_AND_DEADLINE",
      conditionValue: `${rt1.id},3`,
      resultingPriority: "HIGH",
      requestTypeId: rt1.id,
      active: true,
    }).run();

    db.insert(businessRules).values({
      name: "Plazo cercano general",
      description: "Cualquier solicitud con plazo menor a 5 días es de prioridad media",
      conditionType: "DEADLINE",
      conditionValue: "5",
      resultingPriority: "MEDIUM",
      requestTypeId: null,
      active: true,
    }).run();

    db.insert(businessRules).values({
      name: "Cancelación de asignatura",
      description: "Las cancelaciones de asignatura siempre son de alta prioridad",
      conditionType: "REQUEST_TYPE",
      conditionValue: String(rt5.id),
      resultingPriority: "HIGH",
      requestTypeId: rt5.id,
      active: true,
    }).run();

    // Helper to create dates in the past
    const daysAgo = (d: number) => {
      const date = new Date();
      date.setDate(date.getDate() - d);
      return date.toISOString();
    };
    const daysFromNow = (d: number) => {
      const date = new Date();
      date.setDate(date.getDate() + d);
      return date.toISOString();
    };

    // 10 Sample Requests with various states and history
    // Request 1: CLOSED
    const req1 = db.insert(requests).values({
      description: "Solicito revisión de la nota final en Cálculo II. Considero que el parcial 2 no fue calificado correctamente.",
      registrationDateTime: daysAgo(15),
      status: "CLOSED",
      priority: "HIGH",
      priorityJustification: "Plazo de revisión próximo a vencer",
      closingObservation: "Se revisó la nota y se realizó el ajuste correspondiente. Nota corregida de 3.2 a 3.8.",
      requestTypeId: rt1.id,
      originChannelId: ch3.id,
      requesterId: student1.id,
      assignedToUserId: staff1.id,
      aiSuggested: true,
      deadline: daysAgo(5),
    }).returning().get();

    db.insert(historyEntries).values({ action: "REGISTERED", observations: "Solicitud registrada por el estudiante", timestamp: daysAgo(15), requestId: req1.id, performedByUserId: student1.id }).run();
    db.insert(historyEntries).values({ action: "CLASSIFIED", observations: "Clasificada como Revisión de Nota", timestamp: daysAgo(14), requestId: req1.id, performedByUserId: staff1.id }).run();
    db.insert(historyEntries).values({ action: "PRIORITIZED", observations: "Prioridad alta por plazo cercano", timestamp: daysAgo(14), requestId: req1.id, performedByUserId: staff1.id }).run();
    db.insert(historyEntries).values({ action: "ASSIGNED", observations: "Asignada a María Gómez", timestamp: daysAgo(13), requestId: req1.id, performedByUserId: adminUser.id }).run();
    db.insert(historyEntries).values({ action: "IN_PROGRESS", observations: "En revisión con el docente", timestamp: daysAgo(10), requestId: req1.id, performedByUserId: staff1.id }).run();
    db.insert(historyEntries).values({ action: "ATTENDED", observations: "Revisión completada, nota ajustada", timestamp: daysAgo(7), requestId: req1.id, performedByUserId: staff1.id }).run();
    db.insert(historyEntries).values({ action: "CLOSED", observations: "Se revisó la nota y se realizó el ajuste correspondiente", timestamp: daysAgo(6), requestId: req1.id, performedByUserId: staff1.id }).run();

    // Request 2: ATTENDED
    const req2 = db.insert(requests).values({
      description: "Necesito un certificado de estudios para presentar en mi trabajo.",
      registrationDateTime: daysAgo(10),
      status: "ATTENDED",
      priority: "MEDIUM",
      priorityJustification: "Trámite estándar con plazo de una semana",
      requestTypeId: rt2.id,
      originChannelId: ch1.id,
      requesterId: student2.id,
      assignedToUserId: staff2.id,
      deadline: daysFromNow(3),
    }).returning().get();

    db.insert(historyEntries).values({ action: "REGISTERED", observations: "Solicitud presencial", timestamp: daysAgo(10), requestId: req2.id, performedByUserId: student2.id }).run();
    db.insert(historyEntries).values({ action: "CLASSIFIED", observations: "Certificado de estudio", timestamp: daysAgo(9), requestId: req2.id, performedByUserId: staff2.id }).run();
    db.insert(historyEntries).values({ action: "ASSIGNED", observations: "Asignada a Juan Pérez", timestamp: daysAgo(8), requestId: req2.id, performedByUserId: adminUser.id }).run();
    db.insert(historyEntries).values({ action: "IN_PROGRESS", observations: "Generando certificado", timestamp: daysAgo(5), requestId: req2.id, performedByUserId: staff2.id }).run();
    db.insert(historyEntries).values({ action: "ATTENDED", observations: "Certificado generado y listo para entrega", timestamp: daysAgo(2), requestId: req2.id, performedByUserId: staff2.id }).run();

    // Request 3: IN_PROGRESS
    const req3 = db.insert(requests).values({
      description: "Solicito cupo en la asignatura Programación Avanzada, grupo 01. Ya no hay cupos disponibles en el sistema.",
      registrationDateTime: daysAgo(7),
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      priorityJustification: "Solicitud de cupo estándar",
      requestTypeId: rt3.id,
      originChannelId: ch3.id,
      requesterId: student3.id,
      assignedToUserId: staff1.id,
      deadline: daysFromNow(7),
    }).returning().get();

    db.insert(historyEntries).values({ action: "REGISTERED", observations: "Solicitud vía sistema", timestamp: daysAgo(7), requestId: req3.id, performedByUserId: student3.id }).run();
    db.insert(historyEntries).values({ action: "CLASSIFIED", observations: "Solicitud de cupo", timestamp: daysAgo(6), requestId: req3.id, performedByUserId: staff1.id }).run();
    db.insert(historyEntries).values({ action: "ASSIGNED", observations: "Asignada a María Gómez", timestamp: daysAgo(5), requestId: req3.id, performedByUserId: adminUser.id }).run();
    db.insert(historyEntries).values({ action: "IN_PROGRESS", observations: "Consultando disponibilidad con coordinación", timestamp: daysAgo(3), requestId: req3.id, performedByUserId: staff1.id }).run();

    // Request 4: CLASSIFIED
    const req4 = db.insert(requests).values({
      description: "Solicito homologación de las asignaturas Física I y Física II cursadas en la Universidad Nacional.",
      registrationDateTime: daysAgo(5),
      status: "CLASSIFIED",
      priority: "LOW",
      priorityJustification: "Sin plazo inmediato",
      requestTypeId: rt4.id,
      originChannelId: ch2.id,
      requesterId: student1.id,
      deadline: daysFromNow(30),
    }).returning().get();

    db.insert(historyEntries).values({ action: "REGISTERED", observations: "Solicitud por correo electrónico", timestamp: daysAgo(5), requestId: req4.id, performedByUserId: student1.id }).run();
    db.insert(historyEntries).values({ action: "CLASSIFIED", observations: "Homologación de asignaturas", timestamp: daysAgo(4), requestId: req4.id, performedByUserId: staff2.id }).run();

    // Request 5: REGISTERED (new)
    const req5 = db.insert(requests).values({
      description: "Necesito cancelar la asignatura Estadística I por motivos laborales. Es urgente.",
      registrationDateTime: daysAgo(2),
      status: "REGISTERED",
      originChannelId: ch4.id,
      requesterId: student2.id,
      deadline: daysFromNow(2),
    }).returning().get();

    db.insert(historyEntries).values({ action: "REGISTERED", observations: "Solicitud telefónica recibida", timestamp: daysAgo(2), requestId: req5.id, performedByUserId: student2.id }).run();

    // Request 6: CANCELLED
    const req6 = db.insert(requests).values({
      description: "Solicito revisión de nota en Álgebra Lineal.",
      registrationDateTime: daysAgo(20),
      status: "CANCELLED",
      priority: "LOW",
      cancellationReason: "El estudiante desistió de la solicitud tras verificar que la nota es correcta.",
      requestTypeId: rt1.id,
      originChannelId: ch3.id,
      requesterId: student3.id,
    }).returning().get();

    db.insert(historyEntries).values({ action: "REGISTERED", observations: null, timestamp: daysAgo(20), requestId: req6.id, performedByUserId: student3.id }).run();
    db.insert(historyEntries).values({ action: "CANCELLED", observations: "Estudiante desistió de la solicitud", timestamp: daysAgo(18), requestId: req6.id, performedByUserId: student3.id }).run();

    // Request 7: REJECTED
    const req7 = db.insert(requests).values({
      description: "Solicito homologación de la asignatura Inglés Básico. Cursada en instituto de idiomas externo.",
      registrationDateTime: daysAgo(12),
      status: "REJECTED",
      priority: "LOW",
      rejectionReason: "La institución de origen no cuenta con acreditación válida para homologación.",
      requestTypeId: rt4.id,
      originChannelId: ch1.id,
      requesterId: student2.id,
      assignedToUserId: staff2.id,
    }).returning().get();

    db.insert(historyEntries).values({ action: "REGISTERED", observations: "Solicitud presencial", timestamp: daysAgo(12), requestId: req7.id, performedByUserId: student2.id }).run();
    db.insert(historyEntries).values({ action: "CLASSIFIED", observations: "Homologación", timestamp: daysAgo(11), requestId: req7.id, performedByUserId: staff2.id }).run();
    db.insert(historyEntries).values({ action: "REJECTED", observations: "Institución sin acreditación válida", timestamp: daysAgo(9), requestId: req7.id, performedByUserId: staff2.id }).run();

    // Request 8: REGISTERED
    const req8 = db.insert(requests).values({
      description: "Solicito certificado de notas del semestre 2024-1 para beca.",
      registrationDateTime: daysAgo(1),
      status: "REGISTERED",
      requestTypeId: rt2.id,
      originChannelId: ch2.id,
      requesterId: student1.id,
      deadline: daysFromNow(10),
    }).returning().get();

    db.insert(historyEntries).values({ action: "REGISTERED", observations: "Solicitud recibida por correo", timestamp: daysAgo(1), requestId: req8.id, performedByUserId: student1.id }).run();

    // Request 9: CLOSED
    const req9 = db.insert(requests).values({
      description: "Solicito cancelación de la asignatura Química General por incompatibilidad horaria.",
      registrationDateTime: daysAgo(25),
      status: "CLOSED",
      priority: "HIGH",
      priorityJustification: "Cancelación de asignatura es prioridad alta por regla de negocio",
      closingObservation: "Cancelación procesada exitosamente. Matrícula actualizada.",
      requestTypeId: rt5.id,
      originChannelId: ch3.id,
      requesterId: student3.id,
      assignedToUserId: staff1.id,
      deadline: daysAgo(15),
    }).returning().get();

    db.insert(historyEntries).values({ action: "REGISTERED", observations: null, timestamp: daysAgo(25), requestId: req9.id, performedByUserId: student3.id }).run();
    db.insert(historyEntries).values({ action: "CLASSIFIED", observations: "Cancelación de asignatura", timestamp: daysAgo(24), requestId: req9.id, performedByUserId: staff1.id }).run();
    db.insert(historyEntries).values({ action: "PRIORITIZED", observations: "Alta prioridad por regla de negocio", timestamp: daysAgo(24), requestId: req9.id, performedByUserId: staff1.id }).run();
    db.insert(historyEntries).values({ action: "ASSIGNED", observations: "Asignada a María Gómez", timestamp: daysAgo(23), requestId: req9.id, performedByUserId: adminUser.id }).run();
    db.insert(historyEntries).values({ action: "IN_PROGRESS", observations: "Verificando requisitos", timestamp: daysAgo(22), requestId: req9.id, performedByUserId: staff1.id }).run();
    db.insert(historyEntries).values({ action: "ATTENDED", observations: "Cancelación procesada", timestamp: daysAgo(19), requestId: req9.id, performedByUserId: staff1.id }).run();
    db.insert(historyEntries).values({ action: "CLOSED", observations: "Cancelación procesada exitosamente", timestamp: daysAgo(18), requestId: req9.id, performedByUserId: staff1.id }).run();

    // Request 10: REGISTERED
    const req10 = db.insert(requests).values({
      description: "Solicito cupo adicional en Bases de Datos. Necesito esta asignatura para graduarme este semestre.",
      registrationDateTime: new Date().toISOString(),
      status: "REGISTERED",
      requestTypeId: rt3.id,
      originChannelId: ch3.id,
      requesterId: student2.id,
      deadline: daysFromNow(5),
    }).returning().get();

    db.insert(historyEntries).values({ action: "REGISTERED", observations: "Solicitud registrada vía sistema académico", timestamp: new Date().toISOString(), requestId: req10.id, performedByUserId: student2.id }).run();
  }
}

export const storage = new DatabaseStorage();
