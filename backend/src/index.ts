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
import type { Role, User, AccessRequest, Grant, Stats, Aplicacion, Modulo, Programa, Perfil, PerfilPrograma, Control, Empresa, Sucursal, PuntoVenta, Pais, Provincia, Ciudad } from './types.js';

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
    empresaCodigo: body.empresaCodigo || '',
    perfilCodigos: [],
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
// Acceso por usuario: Empresa + Perfiles
// ===========================================================================
app.get('/api/user-access', requireAuth, requireGlobalAdmin, (_req, res) => {
  res.json(db.users.map(u => publicUser(u)));
});

app.put('/api/user-access/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const b = definedOnly(req.body);
  if (b.empresaCodigo !== undefined) user.empresaCodigo = b.empresaCodigo;
  if (b.perfilCodigos !== undefined) user.perfilCodigos = b.perfilCodigos;
  logAudit(actorName(req), 'UPDATE_USER_ACCESS', 'user', user.id,
    `Acceso actualizado para "${user.username}": empresa=${user.empresaCodigo}, perfiles=${user.perfilCodigos.length}.`);
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
    empresaCodigo: '',
    perfilCodigos: [],
    type: 'CLIENTE_FINAL',
    source: 'LDAP',
    status: 'ACTIVE',
    roleIds: Array.isArray(roleIds) ? roleIds : [],
    createdAt: nowIso(),
    lastLogin: null,
    password: 'changeme',
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
  db.perfiles = db.perfiles.filter((p) => !prgCodigos.some((pc) => p.programas.some((pp) => pp.prgCodigo === pc)));
  logAudit(actorName(req), 'DELETE_APLICACION', 'aplicacion', removed.id, `Aplicación "${removed.nombre}" eliminada.`);
  res.json({ ok: true });
});

// --- Modulos ---
function ordenarModulos(items: Modulo[]): Modulo[] {
  return [...items].sort((a, b) => {
    if (a.orden !== undefined && b.orden !== undefined) return a.orden - b.orden;
    if (a.orden !== undefined) return -1;
    if (b.orden !== undefined) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

function siguienteOrdenModulo(appCodigo: string): number {
  const existentes = db.modulos.filter((m) => m.appCodigo === appCodigo);
  if (existentes.length === 0) return 0;
  return Math.max(...existentes.map((m) => m.orden ?? 0)) + 1;
}

app.get('/api/seg-modulos', requireAuth, (_req, res) => res.json(ordenarModulos(db.modulos)));

app.post('/api/seg-modulos', requireAuth, requireGlobalAdmin, (req, res) => {
  const { codigo, nombre, descripcion, appCodigo, estado } = req.body || {};
  if (!codigo || !nombre || !appCodigo) return res.status(400).json({ error: 'codigo, nombre y appCodigo son obligatorios.' });
  if (!db.aplicaciones.some((a) => a.codigo === appCodigo)) return res.status(404).json({ error: 'Aplicación no encontrada.' });
  if (db.modulos.some((m) => m.codigo === codigo)) return res.status(409).json({ error: 'El código ya existe.' });
  const mod: Modulo = { id: newId('seg_mod'), codigo, nombre, descripcion: descripcion || '', appCodigo, estado: estado || 'ACTIVO', orden: siguienteOrdenModulo(appCodigo), createdAt: nowIso() };
  db.modulos.push(mod);
  logAudit(actorName(req), 'CREATE_MODULO', 'modulo', mod.id, `Módulo "${nombre}" creado.`);
  res.status(201).json(mod);
});

app.put('/api/seg-modulos/reordenar', requireAuth, requireGlobalAdmin, (req, res) => {
  const { orden } = req.body || {};
  if (!Array.isArray(orden)) return res.status(400).json({ error: 'El campo "orden" debe ser un array de { id, orden }.' });
  for (const item of orden) {
    const mod = db.modulos.find((m) => m.id === item.id);
    if (mod) mod.orden = Number(item.orden);
  }
  logAudit(actorName(req), 'REORDER_MODULOS', 'modulo', null, `Reordenados ${orden.length} módulos.`);
  res.json({ ok: true });
});

app.put('/api/seg-modulos/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const mod = db.modulos.find((m) => m.id === req.params.id);
  if (!mod) return res.status(404).json({ error: 'Módulo no encontrado.' });
  const { codigo, nombre, descripcion, appCodigo, estado, orden } = req.body || {};
  if (codigo && db.modulos.some((m) => m.id !== mod.id && m.codigo === codigo)) return res.status(409).json({ error: 'El código ya existe.' });
  Object.assign(mod, definedOnly({ codigo, nombre, descripcion, appCodigo, estado, orden }));
  logAudit(actorName(req), 'UPDATE_MODULO', 'modulo', mod.id, `Módulo "${mod.nombre}" actualizado.`);
  res.json(mod);
});

app.delete('/api/seg-modulos/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const idx = db.modulos.findIndex((m) => m.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Módulo no encontrado.' });
  const [removed] = db.modulos.splice(idx, 1);
  const prgCodigos = db.programas.filter((p) => p.modCodigo === removed.codigo).map((p) => p.codigo);
  db.programas = db.programas.filter((p) => p.modCodigo !== removed.codigo);
  db.perfiles = db.perfiles.filter((p) => !prgCodigos.some((pc) => p.programas.some((pp) => pp.prgCodigo === pc)));
  logAudit(actorName(req), 'DELETE_MODULO', 'modulo', removed.id, `Módulo "${removed.nombre}" eliminado.`);
  res.json({ ok: true });
});

// --- Programas ---
function ordenarProgramas(items: Programa[]): Programa[] {
  return [...items].sort((a, b) => {
    if (a.orden !== undefined && b.orden !== undefined) return a.orden - b.orden;
    if (a.orden !== undefined) return -1;
    if (b.orden !== undefined) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

function siguienteOrdenPrograma(modCodigo: string): number {
  const existentes = db.programas.filter((p) => p.modCodigo === modCodigo);
  if (existentes.length === 0) return 0;
  return Math.max(...existentes.map((p) => p.orden ?? 0)) + 1;
}

app.get('/api/seg-programas', requireAuth, (_req, res) => res.json(ordenarProgramas(db.programas)));

app.post('/api/seg-programas', requireAuth, requireGlobalAdmin, (req, res) => {
  const { codigo, nombre, descripcion, modCodigo, tipo, estado, controles } = req.body || {};
  if (!codigo || !nombre || !modCodigo) return res.status(400).json({ error: 'codigo, nombre y modCodigo son obligatorios.' });
  if (!db.modulos.some((m) => m.codigo === modCodigo)) return res.status(404).json({ error: 'Módulo no encontrado.' });
  if (db.programas.some((p) => p.codigo === codigo)) return res.status(409).json({ error: 'El código ya existe.' });
  const prg: Programa = { id: newId('seg_prg'), codigo, nombre, descripcion: descripcion || '', modCodigo, tipo: tipo || 'Transacción', estado: estado || 'ACTIVO', orden: siguienteOrdenPrograma(modCodigo), createdAt: nowIso() };
  db.programas.push(prg);
  if (Array.isArray(controles) && controles.length) {
    for (const c of controles) {
      const ctrl: Control = {
        id: newId('seg_ctrl'),
        prgCodigo: codigo,
        tipoControl: c.tipoControl || 'Otros',
        descripcion: c.descripcion || '',
        estado: c.estado || 'ACTIVO',
        log: c.log || 'ACTIVO',
        createdAt: nowIso(),
      };
      db.controles.push(ctrl);
    }
  }
  logAudit(actorName(req), 'CREATE_PROGRAMA', 'programa', prg.id, `Programa "${nombre}" creado${Array.isArray(controles) && controles.length ? ` con ${controles.length} control(es)` : ''}.`);
  res.status(201).json(prg);
});

app.put('/api/seg-programas/reordenar', requireAuth, requireGlobalAdmin, (req, res) => {
  const { orden } = req.body || {};
  if (!Array.isArray(orden)) return res.status(400).json({ error: 'El campo "orden" debe ser un array de { id, orden }.' });
  for (const item of orden) {
    const prg = db.programas.find((p) => p.id === item.id);
    if (prg) prg.orden = Number(item.orden);
  }
  logAudit(actorName(req), 'REORDER_PROGRAMAS', 'programa', null, `Reordenados ${orden.length} programas.`);
  res.json({ ok: true });
});

app.put('/api/seg-programas/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const prg = db.programas.find((p) => p.id === req.params.id);
  if (!prg) return res.status(404).json({ error: 'Programa no encontrado.' });
  const { codigo, nombre, descripcion, modCodigo, tipo, estado, controles, orden } = req.body || {};
  if (codigo && db.programas.some((p) => p.id !== prg.id && p.codigo === codigo)) return res.status(409).json({ error: 'El código ya existe.' });
  const oldCodigo = prg.codigo;
  Object.assign(prg, definedOnly({ codigo, nombre, descripcion, modCodigo, tipo, estado, orden }));
  if (Array.isArray(controles)) {
    db.controles = db.controles.filter((c) => c.prgCodigo !== oldCodigo);
    for (const c of controles) {
      const ctrl: Control = {
        id: newId('seg_ctrl'),
        prgCodigo: prg.codigo,
        tipoControl: c.tipoControl || 'Otros',
        descripcion: c.descripcion || '',
        estado: c.estado || 'ACTIVO',
        log: c.log || 'ACTIVO',
        createdAt: nowIso(),
      };
      db.controles.push(ctrl);
    }
  }
  logAudit(actorName(req), 'UPDATE_PROGRAMA', 'programa', prg.id, `Programa "${prg.nombre}" actualizado.`);
  res.json(prg);
});

app.delete('/api/seg-programas/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const idx = db.programas.findIndex((p) => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Programa no encontrado.' });
  const [removed] = db.programas.splice(idx, 1);
  db.perfiles = db.perfiles.filter((p) => !p.programas.some((pp) => pp.prgCodigo === removed.codigo));
  db.controles = db.controles.filter((c) => c.prgCodigo !== removed.codigo);
  logAudit(actorName(req), 'DELETE_PROGRAMA', 'programa', removed.id, `Programa "${removed.nombre}" eliminado.`);
  res.json({ ok: true });
});

// --- Perfiles ---
app.get('/api/seg-perfiles', requireAuth, (_req, res) => res.json(db.perfiles));

app.post('/api/seg-perfiles', requireAuth, requireGlobalAdmin, (req, res) => {
  const { codigo, nombre, descripcion, programas, estado } = req.body || {};
  if (!codigo || !nombre || !programas || !programas.length) return res.status(400).json({ error: 'codigo, nombre y al menos un programa son obligatorios.' });
  for (const pp of programas) {
    if (!db.programas.some((p) => p.codigo === pp.prgCodigo)) return res.status(404).json({ error: `Programa "${pp.prgCodigo}" no encontrado.` });
  }
  if (db.perfiles.some((p) => p.codigo === codigo)) return res.status(409).json({ error: 'El código ya existe.' });
  const perf: Perfil = { id: newId('seg_perf'), codigo, nombre, descripcion: descripcion || '', programas, estado: estado || 'ACTIVO', createdAt: nowIso() };
  db.perfiles.push(perf);
  logAudit(actorName(req), 'CREATE_PERFIL', 'perfil', perf.id, `Perfil "${nombre}" creado con ${programas.length} programa(s).`);
  res.status(201).json(perf);
});

app.put('/api/seg-perfiles/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const perf = db.perfiles.find((p) => p.id === req.params.id);
  if (!perf) return res.status(404).json({ error: 'Perfil no encontrado.' });
  const { codigo, nombre, descripcion, programas, estado } = req.body || {};
  if (codigo && db.perfiles.some((p) => p.id !== perf.id && p.codigo === codigo)) return res.status(409).json({ error: 'El código ya existe.' });
  if (programas) {
    for (const pp of programas) {
      if (!db.programas.some((p) => p.codigo === pp.prgCodigo)) return res.status(404).json({ error: `Programa "${pp.prgCodigo}" no encontrado.` });
    }
  }
  // Si programas viene, validamos que no esté vacío
  if (programas !== undefined && !programas.length) return res.status(400).json({ error: 'Debe incluir al menos un programa.' });
  Object.assign(perf, definedOnly({ codigo, nombre, descripcion, programas, estado }));
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

// --- Controles ---
app.get('/api/seg-controles', requireAuth, (_req, res) => res.json(db.controles));

app.delete('/api/seg-controles/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const idx = db.controles.findIndex((c) => c.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Control no encontrado.' });
  const [removed] = db.controles.splice(idx, 1);
  logAudit(actorName(req), 'DELETE_CONTROL', 'control', removed.id, `Control "${removed.descripcion}" eliminado.`);
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

    let created = { paises: 0, provincias: 0, ciudades: 0, empresas: 0, sucursales: 0, puntosVenta: 0, usuarios: 0, apps: 0, mods: 0, prgs: 0, perfs: 0 };
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 2;

      const estadoRaw = normalize(r['estado']) || 'ACTIVO';
      const estado = estadoRaw.toUpperCase() === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO';

      // --- País ( upsert por codigo) ---
      const paisCodigo = normalize(r['emp_pais_codigo']);
      const paisDesc = normalize(r['emp_pais_descripcion']) || normalize(r['pais_descripcion']);
      if (paisCodigo && paisDesc) {
        let pais = db.paises.find(p => p.codigo === paisCodigo);
        if (!pais) {
          pais = { id: newId('param_pais'), codigo: paisCodigo, descripcion: paisDesc, estado: 'ACTIVO', createdAt: nowIso() };
          db.paises.push(pais);
          created.paises++;
        }
      }

      // --- Provincia (upsert por codigo) ---
      const provCodigo = normalize(r['emp_prov_codigo']);
      const provDesc = normalize(r['emp_prov_descripcion']) || normalize(r['provincia_descripcion']);
      if (provCodigo && provDesc && paisCodigo) {
        let pais = db.paises.find(p => p.codigo === paisCodigo);
        let prov = db.provincias.find(p => p.codigo === provCodigo);
        if (!prov) {
          prov = { id: newId('param_prov'), codigo: provCodigo, descripcion: provDesc, paisId: pais?.id || '', paisDescripcion: pais?.descripcion || '', estado: 'ACTIVO', createdAt: nowIso() };
          db.provincias.push(prov);
          created.provincias++;
        }
      }

      // --- Ciudad (upsert por codigo) ---
      const ciuCodigo = normalize(r['ciu_codigo']);
      const ciuDesc = normalize(r['ciu_descripcion']) || normalize(r['ciudad_descripcion']);
      if (ciuCodigo && ciuDesc && provCodigo) {
        let prov = db.provincias.find(p => p.codigo === provCodigo);
        let ciu = db.ciudades.find(c => c.codigo === ciuCodigo);
        if (!ciu) {
          ciu = { id: newId('param_ciu'), codigo: ciuCodigo, descripcion: ciuDesc, provinciaId: prov?.id || '', provinciaDescripcion: prov?.descripcion || '', paisId: prov?.paisId || '', paisDescripcion: prov?.paisDescripcion || '', estado: 'ACTIVO', createdAt: nowIso() };
          db.ciudades.push(ciu);
          created.ciudades++;
        }
      }

      // --- Empresa (upsert por codigo) ---
      const empCodigo = normalize(r['emp_codigo']);
      const empNombre = normalize(r['emp_nombre']);
      const empRuc = normalize(r['emp_ruc']);
      if (empCodigo && empNombre && empRuc) {
        let pais = db.paises.find(p => p.codigo === paisCodigo);
        let prov = db.provincias.find(p => p.codigo === provCodigo);
        let ciu = db.ciudades.find(c => c.codigo === ciuCodigo);
        let emp = db.empresas.find(e => e.codigo === empCodigo);
        if (!emp) {
          emp = {
            id: newId('cfg_emp'),
            codigo: empCodigo,
            nombre: empNombre,
            razonSocial: normalize(r['emp_razon_social']) || empNombre,
            ruc: empRuc,
            direccion: normalize(r['emp_direccion']) || '',
            telefono: normalize(r['emp_telefono']) || '',
            email: normalize(r['emp_email']) || '',
            paginaWeb: normalize(r['emp_pagina_web']) || '',
            customFields: [],
            logo: '',
            paisId: pais?.id || '',
            paisDescripcion: pais?.descripcion || '',
            provinciaId: prov?.id || '',
            provinciaDescripcion: prov?.descripcion || '',
            ciudadId: ciu?.id || '',
            ciudadDescripcion: ciu?.descripcion || '',
            estado,
            createdAt: nowIso(),
          };
          db.empresas.push(emp);
          created.empresas++;
        } else {
          emp.paisId = pais?.id || emp.paisId;
          emp.paisDescripcion = pais?.descripcion || emp.paisDescripcion;
          emp.provinciaId = prov?.id || emp.provinciaId;
          emp.provinciaDescripcion = prov?.descripcion || emp.provinciaDescripcion;
          emp.ciudadId = ciu?.id || emp.ciudadId;
          emp.ciudadDescripcion = ciu?.descripcion || emp.ciudadDescripcion;
        }
      }

      // --- Sucursal (upsert por codigo) ---
      const sucCodigo = normalize(r['suc_codigo']);
      const sucNombre = normalize(r['suc_nombre']);
      if (sucCodigo && sucNombre && empCodigo) {
        let emp = db.empresas.find(e => e.codigo === empCodigo);
        let suc = db.sucursales.find(s => s.codigo === sucCodigo);
        if (!suc) {
          suc = {
            id: newId('cfg_suc'),
            codigo: sucCodigo,
            nombre: sucNombre,
            empresaCodigo: empCodigo,
            direccion: normalize(r['suc_direccion']) || '',
            telefono: normalize(r['suc_telefono']) || '',
            estado,
            createdAt: nowIso(),
          };
          db.sucursales.push(suc);
          created.sucursales++;
        }
      }

      // --- Punto de Venta (upsert por codigo) ---
      const pvCodigo = normalize(r['pv_codigo']);
      const pvNombre = normalize(r['pv_nombre']);
      if (pvCodigo && pvNombre && sucCodigo) {
        let pv = db.puntosVenta.find(p => p.codigo === pvCodigo);
        if (!pv) {
          pv = {
            id: newId('cfg_pv'),
            codigo: pvCodigo,
            nombre: pvNombre,
            sucursalCodigo: sucCodigo,
            direccion: normalize(r['pv_direccion']) || '',
            estado,
            createdAt: nowIso(),
          };
          db.puntosVenta.push(pv);
          created.puntosVenta++;
        }
      }

      // --- Usuario (upsert por username/email) ---
      const usrCodigo = normalize(r['usr_codigo']);
      const usrNombre = normalize(r['usr_nombre']);
      const usrEmail = normalize(r['usr_email']);
      if (usrCodigo && usrNombre) {
        let usr = db.users.find(u => u.username.toLowerCase() === usrCodigo.toLowerCase());
        if (!usr) {
          usr = {
            id: newId('u'),
            username: usrCodigo,
            firstName: usrNombre,
            lastName: '',
            email: usrEmail || `${usrCodigo}@reybanpac.com`,
            cargo: '',
            department: '',
            company: 'Reybanpac',
            empresaCodigo: empCodigo || '',
            perfilCodigos: [],
            type: 'ADMIN' as const,
            source: 'LOCAL' as const,
            status: estado === 'ACTIVO' ? 'ACTIVE' : 'INACTIVE',
            roleIds: [],
            createdAt: nowIso(),
            lastLogin: null,
            password: 'changeme',
          };
          db.users.push(usr);
          created.usuarios++;
        }
      }

      // --- Aplicación (upsert por codigo) ---
      const appCodigo = normalize(r['app_codigo']);
      const appNombre = normalize(r['app_nombre']);
      if (appCodigo && appNombre) {
        let app = db.aplicaciones.find(a => a.codigo === appCodigo);
        if (!app) {
          app = { id: newId('seg_app'), codigo: appCodigo, nombre: appNombre, descripcion: normalize(r['app_descripcion']), estado: 'ACTIVO', createdAt: nowIso() };
          db.aplicaciones.push(app);
          created.apps++;
        }
      }

      // --- Módulo (upsert por codigo) ---
      const modCodigo = normalize(r['mod_codigo']);
      const modNombre = normalize(r['mod_nombre']);
      if (modCodigo && modNombre && appCodigo) {
        let mod = db.modulos.find(m => m.codigo === modCodigo);
        if (!mod) {
          mod = { id: newId('seg_mod'), codigo: modCodigo, nombre: modNombre, descripcion: normalize(r['mod_descripcion']), appCodigo, estado: 'ACTIVO', createdAt: nowIso() };
          db.modulos.push(mod);
          created.mods++;
        }
      }

      // --- Programa (upsert por codigo) ---
      const prgCodigo = normalize(r['prg_codigo']);
      const prgNombre = normalize(r['prg_nombre']);
      if (prgCodigo && prgNombre && modCodigo) {
        let prg = db.programas.find(p => p.codigo === prgCodigo);
        const prgTipo = (normalize(r['prg_tipo']) || 'Transacción') as any;
        if (!prg) {
          prg = { id: newId('seg_prg'), codigo: prgCodigo, nombre: prgNombre, descripcion: normalize(r['prg_descripcion']), modCodigo, tipo: prgTipo, estado: 'ACTIVO', createdAt: nowIso() };
          db.programas.push(prg);
          created.prgs++;
        }
      }

      // --- Perfil (upsert por codigo) ---
      const perfCodigo = normalize(r['perf_codigo']);
      const perfNombre = normalize(r['perf_nombre']);
      if (perfCodigo && perfNombre && prgCodigo) {
        let perf = db.perfiles.find(p => p.codigo === perfCodigo);
        if (!perf) {
          perf = {
            id: newId('seg_perf'),
            codigo: perfCodigo,
            nombre: perfNombre,
            descripcion: normalize(r['perf_descripcion']),
            programas: [{ prgCodigo, nuevo: false, modificar: false, anular: false, procesar: false, imprimir: false, consultar: false }],
            estado,
            createdAt: nowIso(),
          };
          db.perfiles.push(perf);
          created.perfs++;
        } else {
          if (!perf.programas.some((pp) => pp.prgCodigo === prgCodigo)) {
            perf.programas.push({ prgCodigo, nuevo: false, modificar: false, anular: false, procesar: false, imprimir: false, consultar: false });
          }
          if (perf.estado !== estado) perf.estado = estado;
        }
      }
    }

    logAudit(
      actorName(req),
      'UPLOAD_MATRIZ',
      'matriz',
      'excel',
      `Carga masiva: ${created.paises} países, ${created.provincias} provincias, ${created.ciudades} ciudades, ${created.empresas} empresas, ${created.sucursales} sucursales, ${created.puntosVenta} puntos venta, ${created.usuarios} usuarios, ${created.apps} apps, ${created.mods} mods, ${created.prgs} prgs, ${created.perfs} perfs. Omitidas: ${skipped}.`,
    );

    const summary = `Creados: ${created.paises} países, ${created.provincias} provincias, ${created.ciudades} ciudades, ${created.empresas} empresas, ${created.sucursales} sucursales, ${created.puntosVenta} puntos de venta, ${created.usuarios} usuarios, ${created.apps} aplicaciones, ${created.mods} módulos, ${created.prgs} programas, ${created.perfs} perfiles.${skipped ? ` Filas omitidas: ${skipped}.` : ''}`;
    res.json({ ok: true, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al procesar el archivo.' });
  }
});

// ==========================================================================
// Configuración: Empresas / Sucursales / Puntos de Venta
// ==========================================================================

// --- Empresas ---
app.get('/api/config-empresas', requireAuth, (_req, res) => { res.json(db.empresas); });

app.post('/api/config-empresas', requireAuth, requireGlobalAdmin, (req, res) => {
  const body = req.body;
  if (!body?.codigo || !body?.nombre || !body?.ruc) { res.status(400).json({ error: 'codigo, nombre y ruc son obligatorios.' }); return; }
  const empresa: Empresa = {
    id: newId('cfg_emp'),
    codigo: body.codigo,
    nombre: body.nombre,
    razonSocial: body.razonSocial || '',
    ruc: body.ruc,
    direccion: body.direccion || '',
    telefono: body.telefono || '',
    email: body.email || '',
    paginaWeb: body.paginaWeb || '',
    customFields: [],
    logo: '',
    paisId: body.paisId || '',
    paisDescripcion: body.paisDescripcion || '',
    provinciaId: body.provinciaId || '',
    provinciaDescripcion: body.provinciaDescripcion || '',
    ciudadId: body.ciudadId || '',
    ciudadDescripcion: body.ciudadDescripcion || '',
    estado: body.estado || 'ACTIVO',
    createdAt: nowIso(),
  };
  db.empresas.push(empresa);
  logAudit('api', 'CREATE', 'config-empresa', empresa.id, `Empresa ${empresa.codigo}`);
  res.status(201).json(empresa);
});

app.put('/api/config-empresas/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const empresa = db.empresas.find(e => e.id === req.params.id);
  if (!empresa) { res.status(404).json({ error: 'Empresa no encontrada.' }); return; }
  const b = definedOnly(req.body);
  Object.assign(empresa, b);
  logAudit('api', 'UPDATE', 'config-empresa', empresa.id, `Empresa ${empresa.codigo}`);
  res.json(empresa);
});

app.delete('/api/config-empresas/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const idx = db.empresas.findIndex(e => e.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: 'Empresa no encontrada.' }); return; }
  const removed = db.empresas.splice(idx, 1)[0];
  const sucursalesEliminadas = db.sucursales.filter(s => s.empresaCodigo === removed.codigo);
  const sucCodigos = sucursalesEliminadas.map(s => s.codigo);
  db.sucursales = db.sucursales.filter(s => s.empresaCodigo !== removed.codigo);
  db.puntosVenta = db.puntosVenta.filter(p => !sucCodigos.includes(p.sucursalCodigo));
  logAudit('api', 'DELETE', 'config-empresa', removed.id, `Empresa ${removed.codigo}. Sucursales eliminadas: ${sucursalesEliminadas.length}.`);
  res.json({ ok: true });
});

// --- Sucursales ---
app.get('/api/config-sucursales', requireAuth, (_req, res) => { res.json(db.sucursales); });

app.post('/api/config-sucursales', requireAuth, requireGlobalAdmin, (req, res) => {
  const body = req.body;
  if (!body?.codigo || !body?.nombre || !body?.empresaCodigo) { res.status(400).json({ error: 'codigo, nombre y empresaCodigo son obligatorios.' }); return; }
  const sucursal: Sucursal = { id: newId('cfg_suc'), codigo: body.codigo, nombre: body.nombre, empresaCodigo: body.empresaCodigo, direccion: body.direccion || '', telefono: body.telefono || '', estado: body.estado || 'ACTIVO', createdAt: nowIso() };
  db.sucursales.push(sucursal);
  logAudit('api', 'CREATE', 'config-sucursal', sucursal.id, `Sucursal ${sucursal.codigo}`);
  res.status(201).json(sucursal);
});

app.put('/api/config-sucursales/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const sucursal = db.sucursales.find(s => s.id === req.params.id);
  if (!sucursal) { res.status(404).json({ error: 'Sucursal no encontrada.' }); return; }
  const b = definedOnly(req.body);
  Object.assign(sucursal, b);
  logAudit('api', 'UPDATE', 'config-sucursal', sucursal.id, `Sucursal ${sucursal.codigo}`);
  res.json(sucursal);
});

app.delete('/api/config-sucursales/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const idx = db.sucursales.findIndex(s => s.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: 'Sucursal no encontrada.' }); return; }
  const removed = db.sucursales.splice(idx, 1)[0];
  db.puntosVenta = db.puntosVenta.filter(p => p.sucursalCodigo !== removed.codigo);
  logAudit('api', 'DELETE', 'config-sucursal', removed.id, `Sucursal ${removed.codigo}. Puntos de venta eliminados.`);
  res.json({ ok: true });
});

// --- Puntos de Venta ---
app.get('/api/config-puntos-venta', requireAuth, (_req, res) => { res.json(db.puntosVenta); });

app.post('/api/config-puntos-venta', requireAuth, requireGlobalAdmin, (req, res) => {
  const body = req.body;
  if (!body?.codigo || !body?.nombre || !body?.sucursalCodigo) { res.status(400).json({ error: 'codigo, nombre y sucursalCodigo son obligatorios.' }); return; }
  const pv: PuntoVenta = { id: newId('cfg_pv'), codigo: body.codigo, nombre: body.nombre, sucursalCodigo: body.sucursalCodigo, direccion: body.direccion || '', estado: body.estado || 'ACTIVO', createdAt: nowIso() };
  db.puntosVenta.push(pv);
  logAudit('api', 'CREATE', 'config-punto-venta', pv.id, `Punto de Venta ${pv.codigo}`);
  res.status(201).json(pv);
});

app.put('/api/config-puntos-venta/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const pv = db.puntosVenta.find(p => p.id === req.params.id);
  if (!pv) { res.status(404).json({ error: 'Punto de Venta no encontrado.' }); return; }
  const b = definedOnly(req.body);
  Object.assign(pv, b);
  logAudit('api', 'UPDATE', 'config-punto-venta', pv.id, `Punto de Venta ${pv.codigo}`);
  res.json(pv);
});

app.delete('/api/config-puntos-venta/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const idx = db.puntosVenta.findIndex(p => p.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: 'Punto de Venta no encontrado.' }); return; }
  const removed = db.puntosVenta.splice(idx, 1)[0];
  logAudit('api', 'DELETE', 'config-punto-venta', removed.id, `Punto de Venta ${removed.codigo}`);
  res.json({ ok: true });
});

// ==========================================================================
// Parámetros y Configuración: Países, Provincias, Ciudades
// ==========================================================================

// --- Países ---
app.get('/api/param-paises', requireAuth, (_req, res) => { res.json(db.paises); });

app.post('/api/param-paises', requireAuth, requireGlobalAdmin, (req, res) => {
  const body = req.body;
  if (!body?.codigo || !body?.descripcion) { res.status(400).json({ error: 'codigo y descripcion son obligatorios.' }); return; }
  const pais: Pais = { id: newId('param_pais'), codigo: body.codigo, descripcion: body.descripcion, estado: body.estado || 'ACTIVO', createdAt: nowIso() };
  db.paises.push(pais);
  logAudit('api', 'CREATE', 'param-pais', pais.id, `País ${pais.codigo}`);
  res.status(201).json(pais);
});

app.put('/api/param-paises/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const pais = db.paises.find(p => p.id === req.params.id);
  if (!pais) { res.status(404).json({ error: 'País no encontrado.' }); return; }
  const b = definedOnly(req.body);
  Object.assign(pais, b);
  logAudit('api', 'UPDATE', 'param-pais', pais.id, `País ${pais.codigo}`);
  res.json(pais);
});

app.delete('/api/param-paises/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const idx = db.paises.findIndex(p => p.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: 'País no encontrado.' }); return; }
  const removed = db.paises.splice(idx, 1)[0];
  db.provincias = db.provincias.filter(p => p.paisId !== removed.id);
  db.ciudades = db.ciudades.filter(c => c.paisId !== removed.id);
  logAudit('api', 'DELETE', 'param-pais', removed.id, `País ${removed.codigo}. Provincias y ciudades eliminadas en cascada.`);
  res.json({ ok: true });
});

// --- Provincias ---
app.get('/api/param-provincias', requireAuth, (_req, res) => { res.json(db.provincias); });

app.post('/api/param-provincias', requireAuth, requireGlobalAdmin, (req, res) => {
  const body = req.body;
  if (!body?.codigo || !body?.descripcion || !body?.paisId) { res.status(400).json({ error: 'codigo, descripcion y paisId son obligatorios.' }); return; }
  const pais = db.paises.find(p => p.id === body.paisId);
  const provincia: Provincia = { id: newId('param_prov'), codigo: body.codigo, descripcion: body.descripcion, paisId: body.paisId, paisDescripcion: pais?.descripcion || '', estado: body.estado || 'ACTIVO', createdAt: nowIso() };
  db.provincias.push(provincia);
  logAudit('api', 'CREATE', 'param-provincia', provincia.id, `Provincia ${provincia.codigo}`);
  res.status(201).json(provincia);
});

app.put('/api/param-provincias/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const provincia = db.provincias.find(p => p.id === req.params.id);
  if (!provincia) { res.status(404).json({ error: 'Provincia no encontrada.' }); return; }
  const b = definedOnly(req.body);
  if (b.paisId) {
    const pais = db.paises.find(p => p.id === b.paisId);
    b.paisDescripcion = pais?.descripcion || '';
  }
  Object.assign(provincia, b);
  logAudit('api', 'UPDATE', 'param-provincia', provincia.id, `Provincia ${provincia.codigo}`);
  res.json(provincia);
});

app.delete('/api/param-provincias/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const idx = db.provincias.findIndex(p => p.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: 'Provincia no encontrada.' }); return; }
  const removed = db.provincias.splice(idx, 1)[0];
  db.ciudades = db.ciudades.filter(c => c.provinciaId !== removed.id);
  logAudit('api', 'DELETE', 'param-provincia', removed.id, `Provincia ${removed.codigo}. Ciudades eliminadas en cascada.`);
  res.json({ ok: true });
});

// --- Ciudades ---
app.get('/api/param-ciudades', requireAuth, (_req, res) => { res.json(db.ciudades); });

app.post('/api/param-ciudades', requireAuth, requireGlobalAdmin, (req, res) => {
  const body = req.body;
  if (!body?.codigo || !body?.descripcion || !body?.provinciaId) { res.status(400).json({ error: 'codigo, descripcion y provinciaId son obligatorios.' }); return; }
  const provincia = db.provincias.find(p => p.id === body.provinciaId);
  const ciudad: Ciudad = { id: newId('param_ciu'), codigo: body.codigo, descripcion: body.descripcion, provinciaId: body.provinciaId, provinciaDescripcion: provincia?.descripcion || '', paisId: provincia?.paisId || '', paisDescripcion: provincia?.paisDescripcion || '', estado: body.estado || 'ACTIVO', createdAt: nowIso() };
  db.ciudades.push(ciudad);
  logAudit('api', 'CREATE', 'param-ciudad', ciudad.id, `Ciudad ${ciudad.codigo}`);
  res.status(201).json(ciudad);
});

app.put('/api/param-ciudades/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const ciudad = db.ciudades.find(c => c.id === req.params.id);
  if (!ciudad) { res.status(404).json({ error: 'Ciudad no encontrada.' }); return; }
  const b = definedOnly(req.body);
  if (b.provinciaId) {
    const provincia = db.provincias.find(p => p.id === b.provinciaId);
    b.provinciaDescripcion = provincia?.descripcion || '';
    b.paisId = provincia?.paisId || '';
    b.paisDescripcion = provincia?.paisDescripcion || '';
  }
  Object.assign(ciudad, b);
  logAudit('api', 'UPDATE', 'param-ciudad', ciudad.id, `Ciudad ${ciudad.codigo}`);
  res.json(ciudad);
});

app.delete('/api/param-ciudades/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const idx = db.ciudades.findIndex(c => c.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: 'Ciudad no encontrada.' }); return; }
  const removed = db.ciudades.splice(idx, 1)[0];
  logAudit('api', 'DELETE', 'param-ciudad', removed.id, `Ciudad ${removed.codigo}`);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[CAM] Backend escuchando en http://localhost:${PORT}`);
  console.log(`[CAM] LDAP URL: ${process.env.LDAP_URL || 'ldap://ldap:389'}`);
});
