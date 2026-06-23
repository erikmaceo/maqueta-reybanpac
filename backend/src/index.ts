// ===========================================================================
// Central Access Manager — API (Express, datos en memoria RAM)
// ===========================================================================

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { randomBytes } from 'node:crypto';
import { db, newId, nowIso, logAudit, publicUser, resetDb } from './store.js';
import { fetchLdapPeople } from './ldap.js';
import type { Role, User, AccessRequest, Grant, Stats, Aplicacion, Modulo, Programa, Perfil } from './types.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 4000);
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 8 * 60 * 60 * 1000); // 8 h

/** Quita claves undefined para no pisar campos con vacío en updates parciales. */
const definedOnly = <T extends object>(o: T): Partial<T> =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

// --- Sesiones simples en memoria (token -> sesión) -------------------------
interface Session { userId: string; issuedAt: number; }
const sessions = new Map<string, Session>();
// Token opaco con entropía criptográfica: no embebe el userId ni es enumerable.
const makeToken = () => `cam.${randomBytes(32).toString('hex')}`;

function currentUser(req: Request): User | null {
  const auth = req.header('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.issuedAt > SESSION_TTL_MS) { sessions.delete(token); return null; }
  const user = db.users.find((u) => u.id === session.userId);
  // El usuario debe seguir existiendo y ACTIVO: inactivar/eliminar revoca la sesión.
  if (!user || user.status !== 'ACTIVE') return null;
  return user;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'No autenticado.' });
  (req as any).user = user;
  next();
}

/** Un usuario es administrador global si tiene asignado algún rol con isAdmin. */
function isGlobalAdmin(user: User): boolean {
  return user.roleIds.some((rid) => db.roles.find((r) => r.id === rid)?.isAdmin);
}

/** Exige rol administrador global para las operaciones de gestión de la consola. */
function requireGlobalAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isGlobalAdmin((req as any).user)) {
    return res.status(403).json({ error: 'Requiere rol administrador global.' });
  }
  next();
}

const actorName = (req: Request) => (req as any).user?.username || 'system';

/** Carga de autenticación expuesta al frontend: usuario público + flag de admin. */
function authPayload(user: User) {
  return { ...publicUser(user), isAdmin: isGlobalAdmin(user) };
}

// ===========================================================================
// AUTH
// ===========================================================================
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.users.find(
    (u) => u.username.toLowerCase() === String(username || '').toLowerCase(),
  );
  // Solo los usuarios LOCAL (administradores) inician sesión con contraseña en la consola.
  if (!user || user.source !== 'LOCAL' || user.password !== password) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }
  if (user.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Usuario inactivo.' });
  }
  const token = makeToken();
  sessions.set(token, { userId: user.id, issuedAt: Date.now() });
  user.lastLogin = nowIso();
  logAudit(user.username, 'LOGIN', 'auth', user.id, 'Inicio de sesión en la consola.');
  res.json({ token, user: authPayload(user) });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const auth = req.header('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  sessions.delete(token);
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json(authPayload((req as any).user));
});

// ===========================================================================
// STATS (dashboard)
// ===========================================================================
app.get('/api/stats', requireAuth, (_req, res) => {
  const pending = db.requests.filter((r) => r.status === 'PENDING');
  const payload: Stats = {
    systems: db.systems.length,
    roles: db.roles.length,
    users: db.users.length,
    localUsers: db.users.filter((u) => u.source === 'LOCAL').length,
    ldapUsers: db.users.filter((u) => u.source === 'LDAP').length,
    permissions: db.permissions.length,
    grants: db.grants.length,
    pendingRequests: pending.length,
    approvedRequests: db.requests.filter((r) => r.status === 'APPROVED').length,
    rejectedRequests: db.requests.filter((r) => r.status === 'REJECTED').length,
    usersByType: {
      ADMIN: db.users.filter((u) => u.type === 'ADMIN').length,
      CLIENTE_FINAL: db.users.filter((u) => u.type === 'CLIENTE_FINAL').length,
    },
    rolesPerSystem: db.systems.map((s) => ({
      systemId: s.id,
      code: s.code,
      name: s.name,
      color: s.color,
      roles: db.roles.filter((r) => r.systemId === s.id).length,
    })),
    recentAudit: db.audit.slice(0, 8),
  };
  res.json(payload);
});

// ===========================================================================
// SISTEMAS
// ===========================================================================
app.get('/api/systems', requireAuth, (_req, res) => res.json(db.systems));

app.post('/api/systems', requireAuth, requireGlobalAdmin, (req, res) => {
  const { code, name, description, environment, ownerName, color } = req.body || {};
  if (!code || !name) return res.status(400).json({ error: 'code y name son obligatorios.' });
  const sys = {
    id: newId('sys'),
    code,
    name,
    description: description || '',
    environment: environment || 'DEV',
    ownerName: ownerName || '',
    color: color || '#2563eb',
    createdAt: nowIso(),
  };
  db.systems.push(sys);
  logAudit(actorName(req), 'CREATE_SYSTEM', 'system', sys.id, `Sistema "${name}" creado.`);
  res.status(201).json(sys);
});

app.put('/api/systems/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const sys = db.systems.find((s) => s.id === req.params.id);
  if (!sys) return res.status(404).json({ error: 'Sistema no encontrado.' });
  const { code, name, description, environment, ownerName, color } = req.body || {};
  Object.assign(sys, definedOnly({ code, name, description, environment, ownerName, color }));
  logAudit(actorName(req), 'UPDATE_SYSTEM', 'system', sys.id, `Sistema "${sys.name}" actualizado.`);
  res.json(sys);
});

app.delete('/api/systems/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const idx = db.systems.findIndex((s) => s.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Sistema no encontrado.' });
  const [removed] = db.systems.splice(idx, 1);
  // Roles que dependían del sistema se eliminan en cascada…
  const removedRoleIds = db.roles.filter((r) => r.systemId === removed.id).map((r) => r.id);
  db.permissions = db.permissions.filter((p) => p.systemId !== removed.id);
  db.roles = db.roles.filter((r) => r.systemId !== removed.id);
  // …y se reconcilian todas las referencias colgantes (solicitudes, grants, roles de usuarios).
  db.requests = db.requests.filter((r) => !removedRoleIds.includes(r.roleId));
  db.grants = db.grants.filter((g) => !removedRoleIds.includes(g.roleId));
  db.users.forEach((u) => { u.roleIds = u.roleIds.filter((id) => !removedRoleIds.includes(id)); });
  logAudit(actorName(req), 'DELETE_SYSTEM', 'system', removed.id, `Sistema "${removed.name}" eliminado.`);
  res.json({ ok: true });
});

// ===========================================================================
// PERMISOS / ACCESOS
// ===========================================================================
app.get('/api/permissions', requireAuth, (req, res) => {
  const { systemId } = req.query;
  let list = db.permissions;
  if (systemId) list = list.filter((p) => p.systemId === systemId);
  res.json(list);
});

app.post('/api/permissions', requireAuth, requireGlobalAdmin, (req, res) => {
  const { systemId, code, name, description, level, category } = req.body || {};
  if (!systemId || !name) return res.status(400).json({ error: 'systemId y name son obligatorios.' });
  if (!db.systems.some((s) => s.id === systemId)) return res.status(404).json({ error: 'Sistema no encontrado.' });
  const p = {
    id: newId('p'),
    systemId,
    code: code || name.toLowerCase().replace(/\s+/g, '.'),
    name,
    description: description || '',
    level: level || 'VIEW',
    category: category || 'General',
  };
  db.permissions.push(p);
  logAudit(actorName(req), 'CREATE_PERMISSION', 'permission', p.id, `Acceso "${name}" creado.`);
  res.status(201).json(p);
});

// ===========================================================================
// ROLES  (crear roles y seleccionar accesos; rol admin con acceso completo)
// ===========================================================================
app.get('/api/roles', requireAuth, (_req, res) => res.json(db.roles));

app.post('/api/roles', requireAuth, requireGlobalAdmin, (req, res) => {
  const { name, description, systemId, permissionIds, isAdmin, authorizerUserId, color } =
    req.body || {};
  if (!name) return res.status(400).json({ error: 'name es obligatorio.' });
  if (systemId && !db.systems.some((s) => s.id === systemId))
    return res.status(404).json({ error: 'Sistema no encontrado.' });
  if (authorizerUserId && !db.users.some((u) => u.id === authorizerUserId))
    return res.status(404).json({ error: 'Autorizador no encontrado.' });
  // "Acceso completo": si isAdmin, el rol recibe todos los permisos disponibles.
  const perms: string[] = isAdmin
    ? db.permissions.map((p) => p.id)
    : Array.isArray(permissionIds)
    ? permissionIds
    : [];
  const role: Role = {
    id: newId('r'),
    name,
    description: description || '',
    systemId: systemId || null,
    permissionIds: perms,
    isAdmin: !!isAdmin,
    authorizerUserId: authorizerUserId || null,
    color: color || '#2563eb',
    createdAt: nowIso(),
  };
  db.roles.push(role);
  logAudit(actorName(req), 'CREATE_ROLE', 'role', role.id,
    `Rol "${name}" creado con ${role.permissionIds.length} accesos${role.isAdmin ? ' (acceso completo)' : ''}.`);
  res.status(201).json(role);
});

app.put('/api/roles/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const role = db.roles.find((r) => r.id === req.params.id);
  if (!role) return res.status(404).json({ error: 'Rol no encontrado.' });
  const { name, description, systemId, permissionIds, isAdmin, authorizerUserId, color } = req.body || {};
  const patch = definedOnly({ name, description, systemId, permissionIds, isAdmin, authorizerUserId, color });
  // "Acceso completo": un rol admin recibe automáticamente todos los accesos.
  if (patch.isAdmin === true) patch.permissionIds = db.permissions.map((p) => p.id);
  Object.assign(role, patch);
  logAudit(actorName(req), 'UPDATE_ROLE', 'role', role.id, `Rol "${role.name}" actualizado.`);
  res.json(role);
});

app.delete('/api/roles/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const role = db.roles.find((r) => r.id === req.params.id);
  if (!role) return res.status(404).json({ error: 'Rol no encontrado.' });
  if (role.isAdmin) return res.status(400).json({ error: 'No se puede eliminar el rol administrador.' });
  db.roles = db.roles.filter((r) => r.id !== req.params.id);
  db.users.forEach((u) => { u.roleIds = u.roleIds.filter((id) => id !== req.params.id); });
  db.grants = db.grants.filter((g) => g.roleId !== req.params.id);
  db.requests = db.requests.filter((r) => r.roleId !== req.params.id);
  logAudit(actorName(req), 'DELETE_ROLE', 'role', role.id, `Rol "${role.name}" eliminado.`);
  res.json({ ok: true });
});

// ===========================================================================
// USUARIOS  (admin locales + clientes finales desde LDAP; asignar roles)
// ===========================================================================
app.get('/api/users', requireAuth, (req, res) => {
  const { type, source } = req.query;
  let list = db.users;
  if (type) list = list.filter((u) => u.type === type);
  if (source) list = list.filter((u) => u.source === source);
  res.json(list.map(publicUser));
});

app.post('/api/users', requireAuth, requireGlobalAdmin, (req, res) => {
  const body = req.body || {};
  const type: User['type'] = body.type === 'CLIENTE_FINAL' ? 'CLIENTE_FINAL' : 'ADMIN';

  // Regla de negocio (hermética): los administradores se crean localmente en la
  // consola; los clientes finales SOLO se integran desde LDAP (/api/ldap/import),
  // nunca por esta vía, independientemente del 'source' enviado.
  if (type === 'CLIENTE_FINAL') {
    return res.status(400).json({
      error: 'Los usuarios "cliente final" solo pueden integrarse desde LDAP. Use /api/ldap/import.',
    });
  }
  if (!body.username || !body.firstName) {
    return res.status(400).json({ error: 'username y firstName son obligatorios.' });
  }
  if (db.users.some((u) => u.username.toLowerCase() === body.username.toLowerCase())) {
    return res.status(409).json({ error: 'El usuario ya existe.' });
  }

  const user: User = {
    id: newId('u'),
    username: body.username,
    firstName: body.firstName,
    lastName: body.lastName || '',
    email: body.email || `${body.username}@reybanpac.com`,
    cargo: body.cargo || '',
    department: body.department || '',
    company: body.company || 'Reybanpac',
    type,
    source: 'LOCAL',
    status: body.status || 'ACTIVE',
    roleIds: Array.isArray(body.roleIds) ? body.roleIds : [],
    createdAt: nowIso(),
    lastLogin: null,
    password: body.password || 'changeme',
  };
  db.users.push(user);
  logAudit(actorName(req), 'CREATE_USER', 'user', user.id,
    `Usuario administrador local "${user.username}" creado.`);
  res.status(201).json(publicUser(user));
});

app.put('/api/users/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const body = { ...req.body };
  // Campos inmutables por esta vía: id, origen y tipo (preservan la invariante
  // LOCAL<->ADMIN / LDAP<->CLIENTE_FINAL). Los roles solo cambian por /roles o el autorizador.
  delete body.id;
  delete body.source;
  delete body.type;
  delete body.roleIds;
  if (body.password === '' || body.password == null) delete body.password;
  // Renombrar exige unicidad de username (igual que en el alta).
  if (body.username && db.users.some((u) => u.id !== user.id && u.username.toLowerCase() === String(body.username).toLowerCase())) {
    return res.status(409).json({ error: 'El usuario ya existe.' });
  }
  // Desactivar exige las mismas guardas que eliminar (no auto-bloqueo ni último admin).
  if (body.status === 'INACTIVE' && user.status === 'ACTIVE') {
    const me = (req as any).user as User;
    if (user.id === me.id) return res.status(400).json({ error: 'No puede desactivar su propia cuenta.' });
    if (isGlobalAdmin(user)) {
      const otros = db.users.filter((u) => u.id !== user.id && u.source === 'LOCAL' && u.status === 'ACTIVE' && isGlobalAdmin(u));
      if (otros.length === 0) return res.status(400).json({ error: 'No se puede desactivar al último administrador global activo.' });
    }
  }
  Object.assign(user, body);
  logAudit(actorName(req), 'UPDATE_USER', 'user', user.id, `Usuario "${user.username}" actualizado.`);
  res.json(publicUser(user));
});

app.delete('/api/users/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const me = (req as any).user as User;
  if (user.id === me.id) return res.status(400).json({ error: 'No puede eliminarse a sí mismo.' });
  // No dejar la consola sin ningún administrador global local activo.
  if (isGlobalAdmin(user)) {
    const otros = db.users.filter(
      (u) => u.id !== user.id && u.source === 'LOCAL' && u.status === 'ACTIVE' && isGlobalAdmin(u),
    );
    if (otros.length === 0) return res.status(400).json({ error: 'No se puede eliminar al último administrador global activo.' });
  }
  db.users = db.users.filter((u) => u.id !== req.params.id);
  db.grants = db.grants.filter((g) => g.userId !== req.params.id);
  db.requests = db.requests.filter((r) => r.userId !== req.params.id);
  // Roles que tenían a este usuario como Dueño Técnico quedan sin autorizador asignado.
  db.roles.forEach((r) => { if (r.authorizerUserId === user.id) r.authorizerUserId = null; });
  for (const [token, s] of sessions) if (s.userId === user.id) sessions.delete(token); // cierra sus sesiones
  logAudit(actorName(req), 'DELETE_USER', 'user', user.id, `Usuario "${user.username}" eliminado.`);
  res.json({ ok: true });
});

// Asignar / actualizar roles de un usuario
app.put('/api/users/:id/roles', requireAuth, requireGlobalAdmin, (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const roleIds: string[] = Array.isArray(req.body?.roleIds) ? req.body.roleIds : [];
  // El rol administrador (acceso completo a la consola) solo es asignable a usuarios locales.
  const asignaAdmin = roleIds.some((rid) => db.roles.find((r) => r.id === rid)?.isAdmin);
  if (asignaAdmin && user.source !== 'LOCAL') {
    return res.status(400).json({ error: 'El rol administrador solo puede asignarse a usuarios locales.' });
  }
  user.roleIds = roleIds;
  logAudit(actorName(req), 'ASSIGN_ROLES', 'user', user.id,
    `Roles asignados a "${user.username}": ${user.roleIds.length}.`);
  res.json(publicUser(user));
});

// ===========================================================================
// LDAP  (directorio de clientes finales + importación)
// ===========================================================================
app.get('/api/ldap/users', requireAuth, async (_req, res) => {
  const result = await fetchLdapPeople();
  const importedUsernames = new Set(
    db.users.filter((u) => u.source === 'LDAP').map((u) => u.username.toLowerCase()),
  );
  res.json({
    source: result.source,
    message: result.message,
    people: result.people.map((p) => ({
      ...p,
      imported: importedUsernames.has(p.username.toLowerCase()),
    })),
  });
});

app.post('/api/ldap/import', requireAuth, requireGlobalAdmin, async (req, res) => {
  const { username, roleIds } = req.body || {};
  if (!username) return res.status(400).json({ error: 'username es obligatorio.' });
  const result = await fetchLdapPeople();
  const person = result.people.find(
    (p) => p.username.toLowerCase() === String(username).toLowerCase(),
  );
  if (!person) return res.status(404).json({ error: 'Usuario LDAP no encontrado.' });
  if (db.users.some((u) => u.username.toLowerCase() === person.username.toLowerCase())) {
    return res.status(409).json({ error: 'El usuario LDAP ya fue importado.' });
  }
  const user: User = {
    id: newId('u'),
    username: person.username,
    firstName: person.firstName,
    lastName: person.lastName,
    email: person.email,
    cargo: person.cargo,
    department: person.department,
    company: 'Reybanpac',
    type: 'CLIENTE_FINAL',
    source: 'LDAP',
    status: 'ACTIVE',
    roleIds: Array.isArray(roleIds) ? roleIds : [],
    createdAt: nowIso(),
    lastLogin: null,
  };
  db.users.push(user);
  logAudit(actorName(req), 'IMPORT_LDAP_USER', 'user', user.id,
    `Cliente final "${user.username}" integrado desde LDAP (${result.source}).`);
  res.status(201).json(publicUser(user));
});

// ===========================================================================
// AUTORIZADOR  (solicitudes de acceso: crear, aprobar, rechazar)
// ===========================================================================
app.get('/api/requests', requireAuth, (req, res) => {
  const { status } = req.query;
  let list = db.requests;
  if (status) list = list.filter((r) => r.status === status);
  res.json([...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

// Asignar un rol (de un sistema) a un usuario => genera solicitud de autorización
app.post('/api/requests', requireAuth, (req, res) => {
  const { userId, roleId, justification } = req.body || {};
  const user = db.users.find((u) => u.id === userId);
  const role = db.roles.find((r) => r.id === roleId);
  if (!user || !role) return res.status(400).json({ error: 'userId y roleId válidos son obligatorios.' });
  // Evita solicitudes/accesos duplicados para el mismo usuario+rol.
  if (db.requests.some((r) => r.userId === userId && r.roleId === roleId && r.status === 'PENDING'))
    return res.status(409).json({ error: 'Ya existe una solicitud pendiente para este usuario y rol.' });
  if (db.grants.some((g) => g.userId === userId && g.roleId === roleId))
    return res.status(409).json({ error: 'El usuario ya cuenta con este acceso.' });
  const request: AccessRequest = {
    id: newId('req'),
    userId,
    roleId,
    systemId: role.systemId,
    justification: justification || '',
    status: 'PENDING',
    requestedByUserId: (req as any).user.id,
    createdAt: nowIso(),
    decidedByUserId: null,
    decidedAt: null,
    decisionComment: null,
  };
  db.requests.unshift(request);
  logAudit(actorName(req), 'CREATE_REQUEST', 'request', request.id,
    `Solicitud de acceso "${role.name}" para ${user.firstName} ${user.lastName}.`);
  res.status(201).json(request);
});

app.post('/api/requests/:id/approve', requireAuth, (req, res) => {
  const request = db.requests.find((r) => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'Solicitud no encontrada.' });
  if (request.status !== 'PENDING') return res.status(400).json({ error: 'La solicitud ya fue resuelta.' });

  const role = db.roles.find((r) => r.id === request.roleId);
  const me = (req as any).user as User;
  // Segregación de funciones: nadie resuelve una solicitud cuyo beneficiario es él mismo.
  if (request.userId === me.id) {
    return res.status(403).json({ error: 'No puede resolver una solicitud cuyo beneficiario es usted mismo (segregación de funciones).' });
  }
  // Solo el Dueño Técnico autorizador del rol, o un administrador global, decide.
  if (!isGlobalAdmin(me) && role?.authorizerUserId !== me.id) {
    return res.status(403).json({ error: 'Solo el Dueño Técnico autorizador o un administrador global puede resolver esta solicitud.' });
  }

  request.status = 'APPROVED';
  request.decidedByUserId = me.id;
  request.decidedAt = nowIso();
  request.decisionComment = req.body?.comment || 'Aprobado.';

  // Otorga el acceso efectivo (reutiliza el grant si ya existe) + asocia el rol al usuario.
  let grant = db.grants.find((g) => g.userId === request.userId && g.roleId === request.roleId) || null;
  if (!grant) {
    grant = {
      id: newId('g'),
      userId: request.userId,
      roleId: request.roleId,
      systemId: request.systemId,
      grantedAt: nowIso(),
      requestId: request.id,
      authorizedByUserId: me.id,
    };
    db.grants.push(grant);
  }
  const user = db.users.find((u) => u.id === request.userId);
  if (user && !user.roleIds.includes(request.roleId)) user.roleIds.push(request.roleId);

  logAudit(actorName(req), 'APPROVE_REQUEST', 'request', request.id,
    `Aprobó "${role?.name}" para ${user?.firstName} ${user?.lastName}.`);
  res.json({ request, grant });
});

app.post('/api/requests/:id/reject', requireAuth, (req, res) => {
  const request = db.requests.find((r) => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'Solicitud no encontrada.' });
  if (request.status !== 'PENDING') return res.status(400).json({ error: 'La solicitud ya fue resuelta.' });

  const role = db.roles.find((r) => r.id === request.roleId);
  const me = (req as any).user as User;
  if (request.userId === me.id) {
    return res.status(403).json({ error: 'No puede resolver una solicitud cuyo beneficiario es usted mismo (segregación de funciones).' });
  }
  if (!isGlobalAdmin(me) && role?.authorizerUserId !== me.id) {
    return res.status(403).json({ error: 'Solo el Dueño Técnico autorizador o un administrador global puede resolver esta solicitud.' });
  }

  request.status = 'REJECTED';
  request.decidedByUserId = me.id;
  request.decidedAt = nowIso();
  request.decisionComment = req.body?.comment || 'Rechazado.';
  const user = db.users.find((u) => u.id === request.userId);
  logAudit(actorName(req), 'REJECT_REQUEST', 'request', request.id,
    `Rechazó "${role?.name}" para ${user?.firstName} ${user?.lastName}.`);
  res.json(request);
});

// ===========================================================================
// GRANTS (accesos efectivos) + AUDITORÍA
// ===========================================================================
app.get('/api/grants', requireAuth, (_req, res) => res.json(db.grants));

app.delete('/api/grants/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const grant = db.grants.find((g) => g.id === req.params.id);
  if (!grant) return res.status(404).json({ error: 'Acceso no encontrado.' });
  db.grants = db.grants.filter((g) => g.id !== req.params.id);
  const user = db.users.find((u) => u.id === grant.userId);
  // Solo quita el rol del usuario si no le queda otro grant vigente del mismo rol.
  if (user && !db.grants.some((g) => g.userId === grant.userId && g.roleId === grant.roleId)) {
    user.roleIds = user.roleIds.filter((id) => id !== grant.roleId);
  }
  logAudit(actorName(req), 'REVOKE_GRANT', 'grant', grant.id, 'Acceso revocado.');
  res.json({ ok: true });
});

app.get('/api/audit', requireAuth, (_req, res) => res.json(db.audit));

// Utilidad de maqueta: reiniciar datos
app.post('/api/admin/reset', requireAuth, requireGlobalAdmin, (req, res) => {
  resetDb();
  logAudit(actorName(req), 'RESET', 'system', null, 'Datos de la maqueta reiniciados.');
  res.json({ ok: true });
});

// Health check (sin auth)
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: nowIso() }));

// ===========================================================================
// SEGURIDADES — CRUD jerárquico: Aplicaciones → Modulos → Programas → Perfiles
// ===========================================================================

// --- Aplicaciones ---
app.get('/api/seg-aplicaciones', requireAuth, (_req, res) => res.json(db.aplicaciones));

app.post('/api/seg-aplicaciones', requireAuth, requireGlobalAdmin, (req, res) => {
  const { codigo, nombre, descripcion, estado } = req.body || {};
  if (!codigo || !nombre) return res.status(400).json({ error: 'codigo y nombre son obligatorios.' });
  if (db.aplicaciones.some((a) => a.codigo === codigo)) return res.status(409).json({ error: 'El código ya existe.' });
  const app: Aplicacion = { id: newId('seg_app'), codigo, nombre, descripcion: descripcion || '', estado: estado || 'ACTIVO', createdAt: nowIso() };
  db.aplicaciones.push(app);
  logAudit(actorName(req), 'CREATE_APLICACION', 'aplicacion', app.id, `Aplicación "${nombre}" creada.`);
  res.status(201).json(app);
});

app.put('/api/seg-aplicaciones/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const app = db.aplicaciones.find((a) => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: 'Aplicación no encontrada.' });
  const { codigo, nombre, descripcion, estado } = req.body || {};
  if (codigo && db.aplicaciones.some((a) => a.id !== app.id && a.codigo === codigo))
    return res.status(409).json({ error: 'El código ya existe.' });
  Object.assign(app, definedOnly({ codigo, nombre, descripcion, estado }));
  logAudit(actorName(req), 'UPDATE_APLICACION', 'aplicacion', app.id, `Aplicación "${app.nombre}" actualizada.`);
  res.json(app);
});

app.delete('/api/seg-aplicaciones/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const idx = db.aplicaciones.findIndex((a) => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Aplicación no encontrada.' });
  const [removed] = db.aplicaciones.splice(idx, 1);
  // Cascada: eliminar hijos
  const modCodigos = db.modulos.filter((m) => m.appCodigo === removed.codigo).map((m) => m.codigo);
  db.modulos = db.modulos.filter((m) => m.appCodigo !== removed.codigo);
  const prgCodigos = db.programas.filter((p) => modCodigos.includes(p.modCodigo)).map((p) => p.codigo);
  db.programas = db.programas.filter((p) => !modCodigos.includes(p.modCodigo));
  db.perfiles = db.perfiles.filter((p) => !prgCodigos.includes(p.prgCodigo));
  logAudit(actorName(req), 'DELETE_APLICACION', 'aplicacion', removed.id, `Aplicación "${removed.nombre}" eliminada.`);
  res.json({ ok: true });
});

// --- Modulos ---
app.get('/api/seg-modulos', requireAuth, (_req, res) => res.json(db.modulos));

app.post('/api/seg-modulos', requireAuth, requireGlobalAdmin, (req, res) => {
  const { codigo, nombre, descripcion, appCodigo, estado } = req.body || {};
  if (!codigo || !nombre || !appCodigo) return res.status(400).json({ error: 'codigo, nombre y appCodigo son obligatorios.' });
  if (!db.aplicaciones.some((a) => a.codigo === appCodigo)) return res.status(404).json({ error: 'Aplicación no encontrada.' });
  if (db.modulos.some((m) => m.codigo === codigo)) return res.status(409).json({ error: 'El código ya existe.' });
  const mod: Modulo = { id: newId('seg_mod'), codigo, nombre, descripcion: descripcion || '', appCodigo, estado: estado || 'ACTIVO', createdAt: nowIso() };
  db.modulos.push(mod);
  logAudit(actorName(req), 'CREATE_MODULO', 'modulo', mod.id, `Módulo "${nombre}" creado.`);
  res.status(201).json(mod);
});

app.put('/api/seg-modulos/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const mod = db.modulos.find((m) => m.id === req.params.id);
  if (!mod) return res.status(404).json({ error: 'Módulo no encontrado.' });
  const { codigo, nombre, descripcion, appCodigo, estado } = req.body || {};
  if (codigo && db.modulos.some((m) => m.id !== mod.id && m.codigo === codigo)) return res.status(409).json({ error: 'El código ya existe.' });
  Object.assign(mod, definedOnly({ codigo, nombre, descripcion, appCodigo, estado }));
  logAudit(actorName(req), 'UPDATE_MODULO', 'modulo', mod.id, `Módulo "${mod.nombre}" actualizado.`);
  res.json(mod);
});

app.delete('/api/seg-modulos/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const idx = db.modulos.findIndex((m) => m.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Módulo no encontrado.' });
  const [removed] = db.modulos.splice(idx, 1);
  const prgCodigos = db.programas.filter((p) => p.modCodigo === removed.codigo).map((p) => p.codigo);
  db.programas = db.programas.filter((p) => p.modCodigo !== removed.codigo);
  db.perfiles = db.perfiles.filter((p) => !prgCodigos.includes(p.prgCodigo));
  logAudit(actorName(req), 'DELETE_MODULO', 'modulo', removed.id, `Módulo "${removed.nombre}" eliminado.`);
  res.json({ ok: true });
});

// --- Programas ---
app.get('/api/seg-programas', requireAuth, (_req, res) => res.json(db.programas));

app.post('/api/seg-programas', requireAuth, requireGlobalAdmin, (req, res) => {
  const { codigo, nombre, descripcion, modCodigo, estado } = req.body || {};
  if (!codigo || !nombre || !modCodigo) return res.status(400).json({ error: 'codigo, nombre y modCodigo son obligatorios.' });
  if (!db.modulos.some((m) => m.codigo === modCodigo)) return res.status(404).json({ error: 'Módulo no encontrado.' });
  if (db.programas.some((p) => p.codigo === codigo)) return res.status(409).json({ error: 'El código ya existe.' });
  const prg: Programa = { id: newId('seg_prg'), codigo, nombre, descripcion: descripcion || '', modCodigo, estado: estado || 'ACTIVO', createdAt: nowIso() };
  db.programas.push(prg);
  logAudit(actorName(req), 'CREATE_PROGRAMA', 'programa', prg.id, `Programa "${nombre}" creado.`);
  res.status(201).json(prg);
});

app.put('/api/seg-programas/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const prg = db.programas.find((p) => p.id === req.params.id);
  if (!prg) return res.status(404).json({ error: 'Programa no encontrado.' });
  const { codigo, nombre, descripcion, modCodigo, estado } = req.body || {};
  if (codigo && db.programas.some((p) => p.id !== prg.id && p.codigo === codigo)) return res.status(409).json({ error: 'El código ya existe.' });
  Object.assign(prg, definedOnly({ codigo, nombre, descripcion, modCodigo, estado }));
  logAudit(actorName(req), 'UPDATE_PROGRAMA', 'programa', prg.id, `Programa "${prg.nombre}" actualizado.`);
  res.json(prg);
});

app.delete('/api/seg-programas/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const idx = db.programas.findIndex((p) => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Programa no encontrado.' });
  const [removed] = db.programas.splice(idx, 1);
  db.perfiles = db.perfiles.filter((p) => p.prgCodigo !== removed.codigo);
  logAudit(actorName(req), 'DELETE_PROGRAMA', 'programa', removed.id, `Programa "${removed.nombre}" eliminado.`);
  res.json({ ok: true });
});

// --- Perfiles ---
app.get('/api/seg-perfiles', requireAuth, (_req, res) => res.json(db.perfiles));

app.post('/api/seg-perfiles', requireAuth, requireGlobalAdmin, (req, res) => {
  const { codigo, nombre, descripcion, prgCodigo, estado } = req.body || {};
  if (!codigo || !nombre || !prgCodigo) return res.status(400).json({ error: 'codigo, nombre y prgCodigo son obligatorios.' });
  if (!db.programas.some((p) => p.codigo === prgCodigo)) return res.status(404).json({ error: 'Programa no encontrado.' });
  if (db.perfiles.some((p) => p.codigo === codigo)) return res.status(409).json({ error: 'El código ya existe.' });
  const perf: Perfil = { id: newId('seg_perf'), codigo, nombre, descripcion: descripcion || '', prgCodigo, estado: estado || 'ACTIVO', createdAt: nowIso() };
  db.perfiles.push(perf);
  logAudit(actorName(req), 'CREATE_PERFIL', 'perfil', perf.id, `Perfil "${nombre}" creado.`);
  res.status(201).json(perf);
});

app.put('/api/seg-perfiles/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const perf = db.perfiles.find((p) => p.id === req.params.id);
  if (!perf) return res.status(404).json({ error: 'Perfil no encontrado.' });
  const { codigo, nombre, descripcion, prgCodigo, estado } = req.body || {};
  if (codigo && db.perfiles.some((p) => p.id !== perf.id && p.codigo === codigo)) return res.status(409).json({ error: 'El código ya existe.' });
  Object.assign(perf, definedOnly({ codigo, nombre, descripcion, prgCodigo, estado }));
  logAudit(actorName(req), 'UPDATE_PERFIL', 'perfil', perf.id, `Perfil "${perf.nombre}" actualizado.`);
  res.json(perf);
});

app.delete('/api/seg-perfiles/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const idx = db.perfiles.findIndex((p) => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Perfil no encontrado.' });
  const [removed] = db.perfiles.splice(idx, 1);
  logAudit(actorName(req), 'DELETE_PERFIL', 'perfil', removed.id, `Perfil "${removed.nombre}" eliminado.`);
  res.json({ ok: true });
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/seg-matriz/upload', requireAuth, requireGlobalAdmin, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return res.status(400).json({ error: 'El archivo no tiene hojas.' });

    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (rows.length === 0) return res.status(400).json({ error: 'La hoja no tiene datos.' });

    const normalize = (v: any) => String(v ?? '').trim();
    const normLower = (v: any) => normalize(v).toLowerCase();

    let created = { apps: 0, mods: 0, prgs: 0, perfs: 0 };
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 2;

      const appCodigo = normalize(r['app_codigo']);
      const appNombre = normalize(r['app_nombre']);
      const modCodigo = normalize(r['mod_codigo']);
      const modNombre = normalize(r['mod_nombre']);
      const prgCodigo = normalize(r['prg_codigo']);
      const prgNombre = normalize(r['prg_nombre']);
      const perfCodigo = normalize(r['perf_codigo']);
      const perfNombre = normalize(r['perf_nombre']);
      const estadoRaw = normalize(r['estado']) || 'ACTIVO';
      const estado = estadoRaw.toUpperCase() === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO';

      if (!appCodigo || !appNombre || !modCodigo || !modNombre || !prgCodigo || !prgNombre || !perfCodigo || !perfNombre) {
        errors.push(`Fila ${rowNum}: faltan campos obligatorios.`);
        skipped++;
        continue;
      }

      // --- Aplicación (upsert por codigo) ---
      let app = db.aplicaciones.find(a => a.codigo === appCodigo);
      if (!app) {
        app = {
          id: newId('seg_app'),
          codigo: appCodigo,
          nombre: appNombre,
          descripcion: normalize(r['app_descripcion']),
          estado: 'ACTIVO',
          createdAt: nowIso(),
        };
        db.aplicaciones.push(app);
        created.apps++;
      }

      // --- Módulo (upsert por codigo) ---
      let mod = db.modulos.find(m => m.codigo === modCodigo);
      if (!mod) {
        mod = {
          id: newId('seg_mod'),
          codigo: modCodigo,
          nombre: modNombre,
          descripcion: normalize(r['mod_descripcion']),
          appCodigo,
          estado: 'ACTIVO',
          createdAt: nowIso(),
        };
        db.modulos.push(mod);
        created.mods++;
      } else if (mod.appCodigo !== appCodigo) {
        mod.appCodigo = appCodigo;
      }

      // --- Programa (upsert por codigo) ---
      let prg = db.programas.find(p => p.codigo === prgCodigo);
      if (!prg) {
        prg = {
          id: newId('seg_prg'),
          codigo: prgCodigo,
          nombre: prgNombre,
          descripcion: normalize(r['prg_descripcion']),
          modCodigo,
          estado: 'ACTIVO',
          createdAt: nowIso(),
        };
        db.programas.push(prg);
        created.prgs++;
      } else if (prg.modCodigo !== modCodigo) {
        prg.modCodigo = modCodigo;
      }

      // --- Perfil (upsert por codigo) ---
      let perf = db.perfiles.find(p => p.codigo === perfCodigo);
      if (!perf) {
        perf = {
          id: newId('seg_perf'),
          codigo: perfCodigo,
          nombre: perfNombre,
          descripcion: normalize(r['perf_descripcion']),
          prgCodigo,
          estado,
          createdAt: nowIso(),
        };
        db.perfiles.push(perf);
        created.perfs++;
      } else {
        if (perf.prgCodigo !== prgCodigo) perf.prgCodigo = prgCodigo;
        if (perf.estado !== estado) perf.estado = estado;
      }
    }

    logAudit(
      actorName(req),
      'UPLOAD_MATRIZ',
      'matriz',
      'excel',
      `Carga masiva: ${created.apps} apps, ${created.mods} mods, ${created.prgs} prgs, ${created.perfs} perfs. Errores: ${skipped}.`,
    );

    const summary = `Creados: ${created.apps} aplicaciones, ${created.mods} módulos, ${created.prgs} programas, ${created.perfs} perfiles.${skipped ? ` Filas omitidas: ${skipped}.` : ''}${errors.length ? ` Errores: ${errors.slice(0, 5).join('; ')}` : ''}`;
    res.json({ ok: true, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al procesar el archivo.' });
  }
});

app.listen(PORT, () => {
  console.log(`[CAM] Backend escuchando en http://localhost:${PORT}`);
  console.log(`[CAM] LDAP URL: ${process.env.LDAP_URL || 'ldap://ldap:389'}`);
});
