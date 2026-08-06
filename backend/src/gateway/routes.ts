// ===========================================================================
// API Gateway — Public routes for third-party applications
// ===========================================================================

import { Router } from 'express';
import { z } from 'zod';
import { db, logAudit, nowIso } from '../store.js';
import { requireGatewayAuth, requireGatewayScope, authenticateClient, gatewayTokenTtl, type GatewayRequest } from './auth.js';
import { createGatewayRateLimiter, createTokenRateLimiter } from './rate-limit.js';
import { validatePerfilForUser, validateProgramaForUser, validateRolForUser } from './validation.js';
import { gatewaySpec } from './swagger.js';

const router = Router();

const gatewayRateLimiter = createGatewayRateLimiter();
const tokenRateLimiter = createTokenRateLimiter();

// OAuth2 Client Credentials token endpoint
const tokenBodySchema = z.object({
  grant_type: z.literal('client_credentials'),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  scope: z.string().optional(),
});

router.post(
  '/oauth/token',
  tokenRateLimiter,
  async (req: GatewayRequest, res) => {
    const parsed = tokenBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'grant_type, client_id and client_secret are required.',
      });
    }
    const { client_id, client_secret, scope } = parsed.data;
    const requestedScopes = scope?.split(' ').filter(Boolean);

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    const result = await authenticateClient(client_id, client_secret, ip, requestedScopes);
    if (!result) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Client credentials invalid, IP not allowed or scopes insufficient.',
      });
    }

    const { token, client } = result;
    return res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: gatewayTokenTtl(),
      scope: client.scopes.join(' '),
    });
  },
);

// Health
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// OpenAPI spec (public)
router.get('/openapi.json', (_req, res) => {
  res.json(gatewaySpec);
});

// Apply auth + rate limiting to all other routes
router.use(requireGatewayAuth);
router.use(gatewayRateLimiter);

// ---------------------------------------------------------------------------
// Seguridades
// ---------------------------------------------------------------------------
router.get('/aplicaciones', requireGatewayScope('seguridades:read'), (req: GatewayRequest, res) => {
  const list = db.aplicaciones.filter((a) => a.estado === 'ACTIVO');
  res.json(list.map((a) => ({ id: a.id, codigo: a.codigo, nombre: a.nombre, descripcion: a.descripcion, nodoIds: a.nodoIds })));
});

// Obtiene una aplicación con toda su jerarquía: módulos, programas y controles.
// Debe ir antes de /aplicaciones/:codigo para que Express no lo trate como parámetro.
router.get('/aplicaciones/:codigo/completo', requireGatewayScope('seguridades:read'), (req: GatewayRequest, res) => {
  const app = db.aplicaciones.find((a) => a.codigo.toLowerCase() === req.params.codigo.toLowerCase());
  if (!app) return res.status(404).json({ error: 'Aplicación no encontrada.' });

  const modulos = db.modulos
    .filter((m) => m.appCodigo.toLowerCase() === app.codigo.toLowerCase() && m.estado === 'ACTIVO')
    .map((m) => {
      const programas = db.programas
        .filter((p) => p.modCodigo.toLowerCase() === m.codigo.toLowerCase() && p.estado === 'ACTIVO')
        .map((p) => {
          const controles = db.controles.filter(
            (c) => c.prgCodigo.toLowerCase() === p.codigo.toLowerCase() && c.estado === 'ACTIVO',
          );
          return { ...p, controles };
        });
      return { ...m, programas };
    });

  res.json({ ...app, modulos });
});

// Ordena items por el campo `orden`; si no tiene orden, usa createdAt.
function ordenarPorOrden<T extends { orden?: number; createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.orden !== undefined && b.orden !== undefined) return a.orden - b.orden;
    if (a.orden !== undefined) return -1;
    if (b.orden !== undefined) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

// Obtiene una aplicación con toda su jerarquía ordenada según el orden establecido
// en la funcionalidad "Ordenar Soluciones".
router.get('/aplicaciones/:codigo/orden', requireGatewayScope('seguridades:read'), (req: GatewayRequest, res) => {
  const app = db.aplicaciones.find((a) => a.codigo.toLowerCase() === req.params.codigo.toLowerCase());
  if (!app) return res.status(404).json({ error: 'Aplicación no encontrada.' });

  const modulos = ordenarPorOrden(
    db.modulos.filter((m) => m.appCodigo.toLowerCase() === app.codigo.toLowerCase() && m.estado === 'ACTIVO'),
  ).map((m) => {
    const programas = ordenarPorOrden(
      db.programas.filter((p) => p.modCodigo.toLowerCase() === m.codigo.toLowerCase() && p.estado === 'ACTIVO'),
    ).map((p) => {
      const controles = ordenarPorOrden(
        db.controles.filter((c) => c.prgCodigo.toLowerCase() === p.codigo.toLowerCase() && c.estado === 'ACTIVO'),
      );
      return { ...p, controles };
    });
    return { ...m, programas };
  });

  res.json({ ...app, modulos });
});

router.get('/aplicaciones/:codigo', requireGatewayScope('seguridades:read'), (req: GatewayRequest, res) => {
  const app = db.aplicaciones.find((a) => a.codigo.toLowerCase() === req.params.codigo.toLowerCase());
  if (!app) return res.status(404).json({ error: 'Aplicación no encontrada.' });
  res.json(app);
});

router.get('/modulos', requireGatewayScope('seguridades:read'), (req: GatewayRequest, res) => {
  const { appCodigo } = req.query;
  let list = db.modulos;
  if (appCodigo) list = list.filter((m) => m.appCodigo.toLowerCase() === String(appCodigo).toLowerCase());
  res.json(list.filter((m) => m.estado === 'ACTIVO'));
});

router.get('/programas', requireGatewayScope('seguridades:read'), (req: GatewayRequest, res) => {
  const { modCodigo, appCodigo } = req.query;
  let list = db.programas;
  if (modCodigo) list = list.filter((p) => p.modCodigo.toLowerCase() === String(modCodigo).toLowerCase());
  if (appCodigo) {
    const modCodes = new Set(db.modulos.filter((m) => m.appCodigo.toLowerCase() === String(appCodigo).toLowerCase()).map((m) => m.codigo));
    list = list.filter((p) => modCodes.has(p.modCodigo));
  }
  res.json(list.filter((p) => p.estado === 'ACTIVO'));
});

router.get('/perfiles', requireGatewayScope('seguridades:read'), (req: GatewayRequest, res) => {
  const { appCodigo } = req.query;
  let list = db.perfiles.filter((p) => p.estado === 'ACTIVO');
  if (appCodigo) {
    const appCode = String(appCodigo).toLowerCase();
    const modCodes = new Set(db.modulos.filter((m) => m.appCodigo.toLowerCase() === appCode).map((m) => m.codigo));
    const prgCodes = new Set(db.programas.filter((p) => modCodes.has(p.modCodigo)).map((p) => p.codigo));
    list = list.filter((p) => p.programas.some((pp) => prgCodes.has(pp.prgCodigo)));
  }
  res.json(list);
});

router.get('/perfiles/:codigo', requireGatewayScope('seguridades:read'), (req: GatewayRequest, res) => {
  const perfil = db.perfiles.find((p) => p.codigo.toLowerCase() === req.params.codigo.toLowerCase());
  if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado.' });
  res.json(perfil);
});

router.get('/controles', requireGatewayScope('seguridades:read'), (req: GatewayRequest, res) => {
  const { prgCodigo } = req.query;
  let list = db.controles;
  if (prgCodigo) list = list.filter((c) => c.prgCodigo.toLowerCase() === String(prgCodigo).toLowerCase());
  res.json(list.filter((c) => c.estado === 'ACTIVO'));
});

// ---------------------------------------------------------------------------
// Segregación
// ---------------------------------------------------------------------------
router.get('/niveles-segregacion', requireGatewayScope('segregacion:read'), (req: GatewayRequest, res) => {
  res.json(db.nivelesSegregacion.filter((n) => n.estado === 'ACTIVO').sort((a, b) => a.orden - b.orden));
});

router.get('/nodos-segregacion', requireGatewayScope('segregacion:read'), (req: GatewayRequest, res) => {
  const { nivelId } = req.query;
  let list = db.nodosSegregacion;
  if (nivelId) list = list.filter((n) => n.nivelId === String(nivelId));
  res.json(list.filter((n) => n.estado === 'ACTIVO'));
});

router.get('/nodos-segregacion/arbol', requireGatewayScope('segregacion:read'), (req: GatewayRequest, res) => {
  const map = new Map<string, any>();
  const roots: any[] = [];
  const nivelMap = new Map(db.nivelesSegregacion.map((n) => [n.id, n]));
  const sorted = db.nodosSegregacion.filter((n) => n.estado === 'ACTIVO').sort((a, b) => a.codigo.localeCompare(b.codigo));
  for (const n of sorted) {
    const node = { ...n, children: [] };
    map.set(n.id, node);
    if (n.padreId && map.has(n.padreId)) {
      map.get(n.padreId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  res.json({ niveles: db.nivelesSegregacion.filter((n) => n.estado === 'ACTIVO').sort((a, b) => a.orden - b.orden), arbol: roots });
});

router.get('/nodos-segregacion/:id', requireGatewayScope('segregacion:read'), (req: GatewayRequest, res) => {
  const nodo = db.nodosSegregacion.find((n) => n.id === req.params.id);
  if (!nodo) return res.status(404).json({ error: 'Nodo no encontrado.' });
  res.json(nodo);
});

// ---------------------------------------------------------------------------
// Usuarios y accesos
// ---------------------------------------------------------------------------
router.get('/usuarios', requireGatewayScope('usuarios:read'), (req: GatewayRequest, res) => {
  const { type, source } = req.query;
  let list = db.users.filter((u) => u.status === 'ACTIVE');
  if (type) list = list.filter((u) => u.type === String(type));
  if (source) list = list.filter((u) => u.source === String(source));
  res.json(list.map((u) => ({ id: u.id, username: u.username, firstName: u.firstName, lastName: u.lastName, email: u.email, type: u.type, source: u.source, nodoIds: u.nodoIds, perfilCodigos: u.perfilCodigos, roleIds: u.roleIds })));
});

router.get('/usuarios/:username', requireGatewayScope('usuarios:read'), (req: GatewayRequest, res) => {
  const user = db.users.find((u) => u.username.toLowerCase() === req.params.username.toLowerCase());
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json({
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    type: user.type,
    source: user.source,
    status: user.status,
    nodoIds: user.nodoIds,
    perfilCodigos: user.perfilCodigos,
    roleIds: user.roleIds,
  });
});

router.get('/usuarios/:username/nodos', requireGatewayScope('accesos:read'), (req: GatewayRequest, res) => {
  const user = db.users.find((u) => u.username.toLowerCase() === req.params.username.toLowerCase());
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const nodos = db.nodosSegregacion.filter((n) => user.nodoIds.includes(n.id));
  res.json(nodos);
});

router.get('/usuarios/:username/perfiles', requireGatewayScope('accesos:read'), (req: GatewayRequest, res) => {
  const user = db.users.find((u) => u.username.toLowerCase() === req.params.username.toLowerCase());
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const perfiles = db.perfiles.filter((p) => user.perfilCodigos.includes(p.codigo));
  res.json(perfiles);
});

router.get('/usuarios/:username/roles', requireGatewayScope('accesos:read'), (req: GatewayRequest, res) => {
  const user = db.users.find((u) => u.username.toLowerCase() === req.params.username.toLowerCase());
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const roleIds = new Set(user.roleIds);
  db.grants.filter((g) => g.userId === user.id).forEach((g) => roleIds.add(g.roleId));
  const roles = db.roles.filter((r) => roleIds.has(r.id));
  res.json(roles);
});

// ---------------------------------------------------------------------------
// Validaciones en runtime
// ---------------------------------------------------------------------------
const validatePerfilSchema = z.object({
  username: z.string().min(1),
  perfilCodigo: z.string().min(1),
  nodoCodigo: z.string().optional(),
});

router.post('/validate/perfil', requireGatewayScope('accesos:validate'), (req: GatewayRequest, res) => {
  const parsed = validatePerfilSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos.', details: parsed.error.flatten() });
  const { username, perfilCodigo, nodoCodigo } = parsed.data;
  res.json(validatePerfilForUser(username, perfilCodigo, nodoCodigo));
});

const validateProgramaSchema = z.object({
  username: z.string().min(1),
  programaCodigo: z.string().min(1),
  nodoCodigo: z.string().optional(),
});

router.post('/validate/programa', requireGatewayScope('accesos:validate'), (req: GatewayRequest, res) => {
  const parsed = validateProgramaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos.', details: parsed.error.flatten() });
  const { username, programaCodigo, nodoCodigo } = parsed.data;
  res.json(validateProgramaForUser(username, programaCodigo, nodoCodigo));
});

const validateRolSchema = z.object({
  username: z.string().min(1),
  rolId: z.string().min(1),
});

router.post('/validate/rol', requireGatewayScope('accesos:validate'), (req: GatewayRequest, res) => {
  const parsed = validateRolSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos.', details: parsed.error.flatten() });
  const { username, rolId } = parsed.data;
  res.json(validateRolForUser(username, rolId));
});

// ---------------------------------------------------------------------------
// Auditoría (logs enviados por aplicaciones terceras)
// ---------------------------------------------------------------------------
const auditLogSchema = z.object({
  actor: z.string().min(1).max(200),
  action: z.string().min(1).max(100),
  entityType: z.string().min(1).max(100),
  entityId: z.string().max(100).optional(),
  detail: z.string().min(1).max(2000),
  timestamp: z.string().datetime().optional(),
});

const auditLogsBodySchema = z.union([
  auditLogSchema,
  z.array(auditLogSchema).min(1).max(100),
]);

router.post('/audit/logs', requireGatewayScope('auditoria:write'), (req: GatewayRequest, res) => {
  const parsed = auditLogsBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos.', details: parsed.error.flatten() });

  const logs = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
  const clientId = req.gatewayClientId || 'gateway-client';

  for (const log of logs) {
    logAudit(
      log.actor,
      log.action,
      `external:${log.entityType}`,
      log.entityId || null,
      `[${clientId}] ${log.detail}`,
    );
  }

  res.status(201).json({ ok: true, count: logs.length });
});

export default router;
