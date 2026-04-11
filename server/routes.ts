import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  loginSchema,
  registerSchema,
  updateUserSchema,
  insertRequestSchema,
  classifyRequestSchema,
  prioritizeRequestSchema,
  assignRequestSchema,
  attendRequestSchema,
  closeRequestSchema,
  cancelRequestSchema,
  rejectRequestSchema,
  insertHistoryEntrySchema,
  insertBusinessRuleSchema,
  updateBusinessRuleSchema,
  updateRequestTypeSchema,
  updateOriginChannelSchema,
} from "@shared/schema";
import { ZodError } from "zod";

// ==================== Simple token auth ====================
function encodeToken(payload: { userId: number; role: string; username: string }): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function decodeToken(token: string): { userId: number; role: string; username: string } | null {
  try {
    const json = Buffer.from(token, "base64").toString("utf-8");
    const parsed = JSON.parse(json);
    if (parsed.userId && parsed.role && parsed.username) return parsed;
    return null;
  } catch {
    return null;
  }
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: { userId: number; role: string; username: string };
    }
  }
}

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token de autenticación requerido" });
    return;
  }
  const token = authHeader.substring(7);
  const decoded = decodeToken(token);
  if (!decoded) {
    res.status(401).json({ message: "Token inválido" });
    return;
  }
  req.user = decoded;
  next();
}

function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: "No tiene permisos para esta acción" });
      return;
    }
    next();
  };
}

function handleZodError(error: unknown, res: Response): void {
  if (error instanceof ZodError) {
    res.status(400).json({ message: "Datos inválidos", errors: error.errors });
  } else if (error instanceof Error) {
    res.status(400).json({ message: error.message });
  } else {
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed the database
  await storage.seed();

  // ==================== AUTH (public) ====================

  // POST /api/auth/login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.findUserByUsername(username);
      if (!user || user.password !== password) {
        res.status(401).json({ message: "Credenciales inválidas" });
        return;
      }
      if (!user.active) {
        res.status(403).json({ message: "Usuario desactivado" });
        return;
      }
      const token = encodeToken({ userId: user.id, role: user.role, username: user.username });
      const { password: _, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // POST /api/auth/register
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const data = registerSchema.parse(req.body);
      const existing = await storage.findUserByUsername(data.username);
      if (existing) {
        res.status(409).json({ message: "El nombre de usuario ya existe" });
        return;
      }
      const user = await storage.createUser({
        username: data.username,
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        identification: data.identification,
        role: data.role || "STUDENT",
        active: true,
      });
      const token = encodeToken({ userId: user.id, role: user.role, username: user.username });
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ token, user: userWithoutPassword });
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // ==================== REQUESTS ====================

  // POST /api/requests
  app.post("/api/requests", authMiddleware, async (req: Request, res: Response) => {
    try {
      const data = insertRequestSchema.parse(req.body);
      const request = await storage.createRequest({
        ...data,
        requesterId: req.user!.userId,
      });
      // Add history entry
      await storage.addHistoryEntry({
        action: "REGISTERED",
        observations: "Solicitud registrada",
        requestId: request.id,
        performedByUserId: req.user!.userId,
      });
      res.status(201).json(request);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // GET /api/requests
  app.get("/api/requests", authMiddleware, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;
      const priority = req.query.priority as string | undefined;
      const requestTypeId = req.query.requestTypeId ? parseInt(req.query.requestTypeId as string) : undefined;
      const requesterId = req.query.requesterId ? parseInt(req.query.requesterId as string) : undefined;
      const assignedToUserId = req.query.assignedToUserId ? parseInt(req.query.assignedToUserId as string) : undefined;

      const result = await storage.listRequests({ page, limit, status, priority, requestTypeId, requesterId, assignedToUserId });

      // Enrich each request with related entity data
      const enrichedData = await Promise.all(
        result.data.map(async (r) => {
          const requestType = r.requestTypeId ? await storage.getRequestTypeById(r.requestTypeId) : null;
          const originChannel = r.originChannelId ? await storage.getOriginChannelById(r.originChannelId) : null;
          const requester = await storage.getUserById(r.requesterId);
          const assignedTo = r.assignedToUserId ? await storage.getUserById(r.assignedToUserId) : null;
          return {
            ...r,
            requestType: requestType || null,
            originChannel: originChannel || null,
            requester: requester ? { id: requester.id, firstName: requester.firstName, lastName: requester.lastName, email: requester.email, identification: requester.identification, role: requester.role } : null,
            assignedTo: assignedTo ? { id: assignedTo.id, firstName: assignedTo.firstName, lastName: assignedTo.lastName, email: assignedTo.email, role: assignedTo.role } : null,
          };
        })
      );

      res.json({ ...result, data: enrichedData });
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // GET /api/requests/:requestId
  app.get("/api/requests/:requestId", authMiddleware, async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const request = await storage.getRequestById(requestId);
      if (!request) {
        res.status(404).json({ message: "Solicitud no encontrada" });
        return;
      }
      const history = await storage.getRequestHistory(requestId);
      const requestType = request.requestTypeId ? await storage.getRequestTypeById(request.requestTypeId) : null;
      const originChannel = request.originChannelId ? await storage.getOriginChannelById(request.originChannelId) : null;
      const requester = await storage.getUserById(request.requesterId);
      const assignedTo = request.assignedToUserId ? await storage.getUserById(request.assignedToUserId) : null;
      res.json({
        ...request,
        history,
        requestType: requestType || null,
        originChannel: originChannel || null,
        requester: requester ? { id: requester.id, firstName: requester.firstName, lastName: requester.lastName, email: requester.email, identification: requester.identification, role: requester.role } : null,
        assignedTo: assignedTo ? { id: assignedTo.id, firstName: assignedTo.firstName, lastName: assignedTo.lastName, email: assignedTo.email, role: assignedTo.role } : null,
      });
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // GET /api/requests/:requestId/priority-suggestion
  app.get("/api/requests/:requestId/priority-suggestion", authMiddleware, async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const request = await storage.getRequestById(requestId);
      if (!request) {
        res.status(404).json({ message: "Solicitud no encontrada" });
        return;
      }
      const suggestion = await storage.getPrioritySuggestion(requestId);
      res.json(suggestion);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // PATCH /api/requests/:requestId/classify
  app.patch("/api/requests/:requestId/classify", authMiddleware, requireRole("ADMIN", "STAFF"), async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const data = classifyRequestSchema.parse(req.body);
      const request = await storage.getRequestById(requestId);
      if (!request) {
        res.status(404).json({ message: "Solicitud no encontrada" });
        return;
      }
      if (request.status !== "REGISTERED") {
        res.status(400).json({ message: "Solo se pueden clasificar solicitudes en estado REGISTERED" });
        return;
      }
      const updated = await storage.updateRequest(requestId, {
        requestTypeId: data.requestTypeId,
        status: "CLASSIFIED",
      });
      await storage.addHistoryEntry({
        action: "CLASSIFIED",
        observations: data.observations || `Clasificada con tipo de solicitud ID ${data.requestTypeId}`,
        requestId,
        performedByUserId: req.user!.userId,
      });
      res.json(updated);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // PATCH /api/requests/:requestId/prioritize
  app.patch("/api/requests/:requestId/prioritize", authMiddleware, requireRole("ADMIN", "STAFF"), async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const data = prioritizeRequestSchema.parse(req.body);
      const request = await storage.getRequestById(requestId);
      if (!request) {
        res.status(404).json({ message: "Solicitud no encontrada" });
        return;
      }
      const updated = await storage.updateRequest(requestId, {
        priority: data.priority,
        priorityJustification: data.priorityJustification || null,
      });
      await storage.addHistoryEntry({
        action: "PRIORITIZED",
        observations: data.priorityJustification || `Prioridad establecida: ${data.priority}`,
        requestId,
        performedByUserId: req.user!.userId,
      });
      res.json(updated);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // PATCH /api/requests/:requestId/assign
  app.patch("/api/requests/:requestId/assign", authMiddleware, requireRole("ADMIN", "STAFF"), async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const data = assignRequestSchema.parse(req.body);
      const request = await storage.getRequestById(requestId);
      if (!request) {
        res.status(404).json({ message: "Solicitud no encontrada" });
        return;
      }
      const assignee = await storage.getUserById(data.assignedToUserId);
      if (!assignee) {
        res.status(404).json({ message: "Usuario asignado no encontrado" });
        return;
      }
      const updated = await storage.updateRequest(requestId, {
        assignedToUserId: data.assignedToUserId,
      });
      await storage.addHistoryEntry({
        action: "ASSIGNED",
        observations: data.observations || `Asignada a ${assignee.firstName} ${assignee.lastName}`,
        requestId,
        performedByUserId: req.user!.userId,
      });
      res.json(updated);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // PATCH /api/requests/:requestId/attend
  app.patch("/api/requests/:requestId/attend", authMiddleware, requireRole("ADMIN", "STAFF"), async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const data = attendRequestSchema.parse(req.body);
      const request = await storage.getRequestById(requestId);
      if (!request) {
        res.status(404).json({ message: "Solicitud no encontrada" });
        return;
      }
      if (!["CLASSIFIED", "IN_PROGRESS"].includes(request.status)) {
        res.status(400).json({ message: "Solo se pueden atender solicitudes en estado CLASSIFIED o IN_PROGRESS" });
        return;
      }
      const updated = await storage.updateRequest(requestId, {
        status: "ATTENDED",
      });
      await storage.addHistoryEntry({
        action: "ATTENDED",
        observations: data.observations || "Solicitud atendida",
        requestId,
        performedByUserId: req.user!.userId,
      });
      res.json(updated);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // PATCH /api/requests/:requestId/close
  app.patch("/api/requests/:requestId/close", authMiddleware, requireRole("ADMIN", "STAFF"), async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const data = closeRequestSchema.parse(req.body);
      const request = await storage.getRequestById(requestId);
      if (!request) {
        res.status(404).json({ message: "Solicitud no encontrada" });
        return;
      }
      if (request.status !== "ATTENDED") {
        res.status(400).json({ message: "Solo se pueden cerrar solicitudes en estado ATTENDED" });
        return;
      }
      const updated = await storage.updateRequest(requestId, {
        status: "CLOSED",
        closingObservation: data.closingObservation,
      });
      await storage.addHistoryEntry({
        action: "CLOSED",
        observations: data.closingObservation,
        requestId,
        performedByUserId: req.user!.userId,
      });
      res.json(updated);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // PATCH /api/requests/:requestId/cancel
  app.patch("/api/requests/:requestId/cancel", authMiddleware, async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const data = cancelRequestSchema.parse(req.body);
      const request = await storage.getRequestById(requestId);
      if (!request) {
        res.status(404).json({ message: "Solicitud no encontrada" });
        return;
      }
      if (["CLOSED", "CANCELLED", "REJECTED"].includes(request.status)) {
        res.status(400).json({ message: "No se puede cancelar una solicitud en estado terminal" });
        return;
      }
      const updated = await storage.updateRequest(requestId, {
        status: "CANCELLED",
        cancellationReason: data.cancellationReason,
      });
      await storage.addHistoryEntry({
        action: "CANCELLED",
        observations: data.cancellationReason,
        requestId,
        performedByUserId: req.user!.userId,
      });
      res.json(updated);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // PATCH /api/requests/:requestId/reject
  app.patch("/api/requests/:requestId/reject", authMiddleware, requireRole("ADMIN", "STAFF"), async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const data = rejectRequestSchema.parse(req.body);
      const request = await storage.getRequestById(requestId);
      if (!request) {
        res.status(404).json({ message: "Solicitud no encontrada" });
        return;
      }
      if (["CLOSED", "CANCELLED", "REJECTED"].includes(request.status)) {
        res.status(400).json({ message: "No se puede rechazar una solicitud en estado terminal" });
        return;
      }
      const updated = await storage.updateRequest(requestId, {
        status: "REJECTED",
        rejectionReason: data.rejectionReason,
      });
      await storage.addHistoryEntry({
        action: "REJECTED",
        observations: data.rejectionReason,
        requestId,
        performedByUserId: req.user!.userId,
      });
      res.json(updated);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // ==================== HISTORY ====================

  // GET /api/requests/:requestId/history
  app.get("/api/requests/:requestId/history", authMiddleware, async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const request = await storage.getRequestById(requestId);
      if (!request) {
        res.status(404).json({ message: "Solicitud no encontrada" });
        return;
      }
      const history = await storage.getRequestHistory(requestId);
      res.json(history);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // POST /api/requests/:requestId/history
  app.post("/api/requests/:requestId/history", authMiddleware, async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const data = insertHistoryEntrySchema.parse(req.body);
      const request = await storage.getRequestById(requestId);
      if (!request) {
        res.status(404).json({ message: "Solicitud no encontrada" });
        return;
      }
      const entry = await storage.addHistoryEntry({
        action: "NOTE",
        observations: data.observations,
        requestId,
        performedByUserId: req.user!.userId,
      });
      res.status(201).json(entry);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // ==================== USERS ====================

  // GET /api/users
  app.get("/api/users", authMiddleware, requireRole("ADMIN", "STAFF"), async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const role = req.query.role as string | undefined;
      const activeParam = req.query.active;
      const active = activeParam !== undefined ? activeParam === "true" : undefined;

      const result = await storage.listUsers({ page, limit, role, active });
      // Strip passwords
      const data = result.data.map(({ password, ...u }) => u);
      res.json({ ...result, data });
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // GET /api/users/:userId
  app.get("/api/users/:userId", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUserById(userId);
      if (!user) {
        res.status(404).json({ message: "Usuario no encontrado" });
        return;
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // PUT /api/users/:userId
  app.put("/api/users/:userId", authMiddleware, requireRole("ADMIN"), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const data = updateUserSchema.parse(req.body);
      const existing = await storage.getUserById(userId);
      if (!existing) {
        res.status(404).json({ message: "Usuario no encontrado" });
        return;
      }
      const updated = await storage.updateUser(userId, data);
      if (updated) {
        const { password, ...userWithoutPassword } = updated;
        res.json(userWithoutPassword);
      } else {
        res.status(500).json({ message: "Error al actualizar usuario" });
      }
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // ==================== CATALOGS: REQUEST TYPES ====================

  // GET /api/catalogs/request-types
  app.get("/api/catalogs/request-types", authMiddleware, async (req: Request, res: Response) => {
    try {
      const activeParam = req.query.active;
      const active = activeParam !== undefined ? activeParam === "true" : undefined;
      const result = await storage.listRequestTypes({ active });
      res.json(result);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // POST /api/catalogs/request-types
  app.post("/api/catalogs/request-types", authMiddleware, requireRole("ADMIN"), async (req: Request, res: Response) => {
    try {
      const { name, description, active } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        res.status(400).json({ message: "El nombre es requerido" });
        return;
      }
      const result = await storage.createRequestType({ name, description, active });
      res.status(201).json(result);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // GET /api/catalogs/request-types/:typeId
  app.get("/api/catalogs/request-types/:typeId", authMiddleware, async (req: Request, res: Response) => {
    try {
      const typeId = parseInt(req.params.typeId);
      const result = await storage.getRequestTypeById(typeId);
      if (!result) {
        res.status(404).json({ message: "Tipo de solicitud no encontrado" });
        return;
      }
      res.json(result);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // PUT /api/catalogs/request-types/:typeId
  app.put("/api/catalogs/request-types/:typeId", authMiddleware, requireRole("ADMIN"), async (req: Request, res: Response) => {
    try {
      const typeId = parseInt(req.params.typeId);
      const data = updateRequestTypeSchema.parse(req.body);
      const existing = await storage.getRequestTypeById(typeId);
      if (!existing) {
        res.status(404).json({ message: "Tipo de solicitud no encontrado" });
        return;
      }
      const updated = await storage.updateRequestType(typeId, data);
      res.json(updated);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // ==================== CATALOGS: ORIGIN CHANNELS ====================

  // GET /api/catalogs/origin-channels
  app.get("/api/catalogs/origin-channels", authMiddleware, async (req: Request, res: Response) => {
    try {
      const activeParam = req.query.active;
      const active = activeParam !== undefined ? activeParam === "true" : undefined;
      const result = await storage.listOriginChannels({ active });
      res.json(result);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // POST /api/catalogs/origin-channels
  app.post("/api/catalogs/origin-channels", authMiddleware, requireRole("ADMIN"), async (req: Request, res: Response) => {
    try {
      const { name, active } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        res.status(400).json({ message: "El nombre es requerido" });
        return;
      }
      const result = await storage.createOriginChannel({ name, active });
      res.status(201).json(result);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // GET /api/catalogs/origin-channels/:channelId
  app.get("/api/catalogs/origin-channels/:channelId", authMiddleware, async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.channelId);
      const result = await storage.getOriginChannelById(channelId);
      if (!result) {
        res.status(404).json({ message: "Canal de origen no encontrado" });
        return;
      }
      res.json(result);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // PUT /api/catalogs/origin-channels/:channelId
  app.put("/api/catalogs/origin-channels/:channelId", authMiddleware, requireRole("ADMIN"), async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.channelId);
      const data = updateOriginChannelSchema.parse(req.body);
      const existing = await storage.getOriginChannelById(channelId);
      if (!existing) {
        res.status(404).json({ message: "Canal de origen no encontrado" });
        return;
      }
      const updated = await storage.updateOriginChannel(channelId, data);
      res.json(updated);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // ==================== BUSINESS RULES ====================

  // GET /api/business-rules
  app.get("/api/business-rules", authMiddleware, requireRole("ADMIN", "STAFF"), async (req: Request, res: Response) => {
    try {
      const activeParam = req.query.active;
      const active = activeParam !== undefined ? activeParam === "true" : undefined;
      const conditionType = req.query.conditionType as string | undefined;
      const result = await storage.listBusinessRules({ active, conditionType });
      res.json(result);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // POST /api/business-rules
  app.post("/api/business-rules", authMiddleware, requireRole("ADMIN"), async (req: Request, res: Response) => {
    try {
      const data = insertBusinessRuleSchema.parse(req.body);
      const result = await storage.createBusinessRule(data);
      res.status(201).json(result);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // GET /api/business-rules/:ruleId
  app.get("/api/business-rules/:ruleId", authMiddleware, requireRole("ADMIN", "STAFF"), async (req: Request, res: Response) => {
    try {
      const ruleId = parseInt(req.params.ruleId);
      const result = await storage.getBusinessRuleById(ruleId);
      if (!result) {
        res.status(404).json({ message: "Regla de negocio no encontrada" });
        return;
      }
      res.json(result);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // PUT /api/business-rules/:ruleId
  app.put("/api/business-rules/:ruleId", authMiddleware, requireRole("ADMIN"), async (req: Request, res: Response) => {
    try {
      const ruleId = parseInt(req.params.ruleId);
      const data = updateBusinessRuleSchema.parse(req.body);
      const existing = await storage.getBusinessRuleById(ruleId);
      if (!existing) {
        res.status(404).json({ message: "Regla de negocio no encontrada" });
        return;
      }
      const updated = await storage.updateBusinessRule(ruleId, data);
      res.json(updated);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // DELETE /api/business-rules/:ruleId
  app.delete("/api/business-rules/:ruleId", authMiddleware, requireRole("ADMIN"), async (req: Request, res: Response) => {
    try {
      const ruleId = parseInt(req.params.ruleId);
      const existing = await storage.getBusinessRuleById(ruleId);
      if (!existing) {
        res.status(404).json({ message: "Regla de negocio no encontrada" });
        return;
      }
      const deactivated = await storage.deactivateBusinessRule(ruleId);
      if (deactivated) {
        res.json({ message: "Regla de negocio desactivada exitosamente" });
      } else {
        res.status(500).json({ message: "Error al desactivar la regla" });
      }
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // ==================== AI ====================

  // POST /api/ai/suggest-classification
  app.post("/api/ai/suggest-classification", authMiddleware, requireRole("ADMIN", "STAFF"), async (req: Request, res: Response) => {
    try {
      const { description } = req.body;
      if (!description || typeof description !== "string") {
        res.status(400).json({ message: "Se requiere una descripción" });
        return;
      }
      const desc = description.toLowerCase();

      // Simple keyword-based classification
      const allTypes = await storage.listRequestTypes({ active: true });

      let suggestedType = allTypes[0]; // default
      let confidence = 0.3;

      if (desc.includes("revisión") || desc.includes("revision") || desc.includes("nota") || desc.includes("calificación") || desc.includes("calificacion")) {
        suggestedType = allTypes.find((t) => t.name.toLowerCase().includes("revisión de nota")) || allTypes[0];
        confidence = 0.85;
      } else if (desc.includes("certificado") || desc.includes("constancia")) {
        suggestedType = allTypes.find((t) => t.name.toLowerCase().includes("certificado")) || allTypes[0];
        confidence = 0.9;
      } else if (desc.includes("cupo") || desc.includes("inscripción") || desc.includes("inscripcion") || desc.includes("matrícula") || desc.includes("matricula")) {
        suggestedType = allTypes.find((t) => t.name.toLowerCase().includes("cupo")) || allTypes[0];
        confidence = 0.8;
      } else if (desc.includes("homologación") || desc.includes("homologacion") || desc.includes("convalidación") || desc.includes("convalidacion") || desc.includes("transferencia")) {
        suggestedType = allTypes.find((t) => t.name.toLowerCase().includes("homologación")) || allTypes[0];
        confidence = 0.85;
      } else if (desc.includes("cancelación") || desc.includes("cancelacion") || desc.includes("cancelar") || desc.includes("retiro")) {
        suggestedType = allTypes.find((t) => t.name.toLowerCase().includes("cancelación")) || allTypes[0];
        confidence = 0.88;
      }

      res.json({
        suggestedRequestTypeId: suggestedType?.id || null,
        suggestedRequestTypeName: suggestedType?.name || "No clasificable",
        confidence,
        reasoning: `Análisis basado en palabras clave de la descripción. Tipo sugerido: "${suggestedType?.name || "N/A"}" con confianza ${Math.round(confidence * 100)}%.`,
      });
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // GET /api/ai/summarize/:requestId
  app.get("/api/ai/summarize/:requestId", authMiddleware, async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const request = await storage.getRequestById(requestId);
      if (!request) {
        res.status(404).json({ message: "Solicitud no encontrada" });
        return;
      }
      const history = await storage.getRequestHistory(requestId);

      // Get related names
      const requester = await storage.getUserById(request.requesterId);
      const assignee = request.assignedToUserId ? await storage.getUserById(request.assignedToUserId) : null;
      const requestType = request.requestTypeId ? await storage.getRequestTypeById(request.requestTypeId) : null;

      const historyText = history.map((h) => `- ${h.action}: ${h.observations || "Sin observaciones"} (${new Date(h.timestamp).toLocaleDateString("es")})`).join("\n");

      const summary = `Solicitud #${request.id} - ${requestType?.name || "Sin clasificar"}
Estado actual: ${request.status}${request.priority ? ` | Prioridad: ${request.priority}` : ""}
Solicitante: ${requester ? `${requester.firstName} ${requester.lastName}` : "Desconocido"}${assignee ? `\nAsignado a: ${assignee.firstName} ${assignee.lastName}` : ""}
Fecha de registro: ${new Date(request.registrationDateTime).toLocaleDateString("es")}${request.deadline ? `\nFecha límite: ${new Date(request.deadline).toLocaleDateString("es")}` : ""}

Descripción: ${request.description}

Historial de acciones (${history.length} entradas):
${historyText}${request.closingObservation ? `\n\nObservación de cierre: ${request.closingObservation}` : ""}${request.cancellationReason ? `\n\nRazón de cancelación: ${request.cancellationReason}` : ""}${request.rejectionReason ? `\n\nRazón de rechazo: ${request.rejectionReason}` : ""}`;

      res.json({
        requestId: request.id,
        summary,
        status: request.status,
        totalHistoryEntries: history.length,
      });
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // ==================== REPORTS ====================

  // GET /api/reports/dashboard
  app.get("/api/reports/dashboard", authMiddleware, requireRole("ADMIN", "STAFF"), async (_req: Request, res: Response) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  return httpServer;
}
