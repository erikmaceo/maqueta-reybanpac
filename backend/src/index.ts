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
import type { Role, User, AccessRequest, Grant, Stats, Aplicacion, Modulo, Programa, Perfil, PerfilPrograma, TipoPrograma, Control, NivelSegregacion, NodoSegregacion, NivelAtributo, NodoAtributoValor, Pais, Provincia, Ciudad, DispositivoMovil } from './types.js';

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
  const source: User['source'] = body.source === 'LDAP' ? 'LDAP' : 'LOCAL';
  // El tipo se deriva del origen: LOCAL permite ADMIN; LDAP se asocia a CLIENTE_FINAL.
  const type: User['type'] = source === 'LDAP' ? 'CLIENTE_FINAL' : 'ADMIN';

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
    nodoIds: Array.isArray(body.nodoIds) ? body.nodoIds : [],
    perfilCodigos: [],
    type,
    source,
    status: body.status || 'ACTIVE',
    roleIds: Array.isArray(body.roleIds) ? body.roleIds : [],
    createdAt: nowIso(),
    lastLogin: null,
    password: body.password || 'changeme',
  };
  db.users.push(user);
  logAudit(actorName(req), 'CREATE_USER', 'user', user.id,
    `Usuario "${user.username}" creado (origen: ${source}).`);
  res.status(201).json(publicUser(user));
});

app.put('/api/users/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const body = { ...req.body };
  // Campos inmutables por esta vía: id, tipo y roles. El origen sí se puede modificar
  // desde el formulario de edición; el tipo se ajusta automáticamente según el origen.
  delete body.id;
  delete body.type;
  delete body.roleIds;
  if (body.source !== undefined) {
    const source: User['source'] = body.source === 'LDAP' ? 'LDAP' : 'LOCAL';
    body.source = source;
    body.type = source === 'LDAP' ? 'CLIENTE_FINAL' : 'ADMIN';
  }
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
// Acceso por usuario: Nodos de Segregación + Perfiles
// ===========================================================================
app.get('/api/user-access', requireAuth, requireGlobalAdmin, (_req, res) => {
  res.json(db.users.map(u => publicUser(u)));
});

app.put('/api/user-access/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const b = definedOnly(req.body);
  if (b.nodoIds !== undefined) user.nodoIds = b.nodoIds;
  if (b.perfilCodigos !== undefined) user.perfilCodigos = b.perfilCodigos;
  logAudit(actorName(req), 'UPDATE_USER_ACCESS', 'user', user.id,
    `Acceso actualizado para "${user.username}": nodos=${user.nodoIds.length}, perfiles=${user.perfilCodigos.length}.`);
  res.json(publicUser(user));
});

interface BulkAccessRow {
  row: number;
  username: string;
  perfilCodigos: string[];
  nodoCodigosPorNivelId: Record<string, string[]>;
}

app.post('/api/user-access/bulk', requireAuth, requireGlobalAdmin, (req, res) => {
  const rows: BulkAccessRow[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ ok: false, error: 'No se recibieron filas para procesar.' });

  const errors: { row: number; message: string }[] = [];
  const updates: { user: typeof db.users[number]; nodoIds: string[]; perfilCodigos: string[] }[] = [];

    for (const r of rows) {
      const user = db.users.find(u => u.username.toLowerCase() === r.username.toLowerCase().trim());
      if (!r.username?.trim()) {
        errors.push({ row: r.row, message: 'El campo USUARIO es obligatorio.' });
        continue;
      }
      if (!user) {
        errors.push({ row: r.row, message: `El usuario "${r.username}" no existe.` });
        continue;
      }

      const perfilCodigos: string[] = [];
      for (const pc of r.perfilCodigos || []) {
        const cod = pc.trim();
        if (!cod) continue;
        const perfil = db.perfiles.find(p => p.codigo.toLowerCase() === cod.toLowerCase());
        if (!perfil) {
          errors.push({ row: r.row, message: `El perfil "${cod}" no existe.` });
          break;
        }
        if (perfil.estado !== 'ACTIVO') {
          errors.push({ row: r.row, message: `El perfil "${cod}" no está activo.` });
          break;
        }
        perfilCodigos.push(perfil.codigo);
      }
      if (errors.some(e => e.row === r.row)) continue;

      const nodoIds: string[] = [];
      const selectedNodoIds = new Set<string>();
      const nivelIds = Object.keys(r.nodoCodigosPorNivelId || {});

      for (const nivelId of nivelIds) {
        const nivel = db.nivelesSegregacion.find(n => n.id === nivelId);
        if (!nivel) {
          errors.push({ row: r.row, message: `El nivel de segregación no existe.` });
          break;
        }
        const codigos = r.nodoCodigosPorNivelId[nivelId] || [];
        for (const nc of codigos) {
          const cod = nc.trim();
          if (!cod) continue;
          const nodo = db.nodosSegregacion.find(n => n.codigo.toLowerCase() === cod.toLowerCase() && n.nivelId === nivelId);
          if (!nodo) {
            errors.push({ row: r.row, message: `El nodo "${cod}" no existe en el nivel ${nivel.nombre}.` });
            break;
          }
          if (nodo.estado !== 'ACTIVO') {
            errors.push({ row: r.row, message: `El nodo "${cod}" no está activo.` });
            break;
          }
          nodoIds.push(nodo.id);
          selectedNodoIds.add(nodo.id);
        }
        if (errors.some(e => e.row === r.row)) break;
      }
      if (errors.some(e => e.row === r.row)) continue;

      // Validar jerarquía padre-hijo: todo nodo seleccionado debe tener su cadena de ancestros completa
      for (const nodoId of nodoIds) {
        const nodo = db.nodosSegregacion.find(n => n.id === nodoId);
        if (!nodo) continue;
        let padreId = nodo.padreId;
        while (padreId) {
          if (!selectedNodoIds.has(padreId)) {
            const padre = db.nodosSegregacion.find(n => n.id === padreId);
            errors.push({ row: r.row, message: `Falta seleccionar el nodo padre "${padre?.codigo || padreId}" para "${nodo.codigo}".` });
            break;
          }
          const padre = db.nodosSegregacion.find(n => n.id === padreId);
          padreId = padre?.padreId || null;
        }
        if (errors.some(e => e.row === r.row)) break;
      }
      if (errors.some(e => e.row === r.row)) continue;

      updates.push({ user, nodoIds: [...new Set(nodoIds)], perfilCodigos: [...new Set(perfilCodigos)] });
    }

  if (errors.length) {
    return res.status(400).json({ ok: false, processed: 0, errors });
  }

  for (const u of updates) {
    u.user.nodoIds = u.nodoIds;
    u.user.perfilCodigos = u.perfilCodigos;
    logAudit(actorName(req), 'UPDATE_USER_ACCESS', 'user', u.user.id,
      `Acceso actualizado por carga masiva para "${u.user.username}": nodos=${u.nodoIds.length}, perfiles=${u.perfilCodigos.length}.`);
  }

  res.json({ ok: true, processed: updates.length, errors: [] });
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
    nodoIds: [],
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

app.get('/api/audit', requireAuth, (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const desde = String(req.query.desde || '').trim();
  const hasta = String(req.query.hasta || '').trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 25));

  let list = [...db.audit];

  if (desde) {
    const d = new Date(desde);
    if (!isNaN(d.getTime())) list = list.filter(e => new Date(e.timestamp) >= d);
  }
  if (hasta) {
    const h = new Date(hasta);
    if (!isNaN(h.getTime())) {
      h.setHours(23, 59, 59, 999);
      list = list.filter(e => new Date(e.timestamp) <= h);
    }
  }
  if (q) {
    list = list.filter(e => `${e.actor} ${e.action} ${e.entityType} ${e.detail}`.toLowerCase().includes(q));
  }

  list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const total = list.length;
  const start = (page - 1) * limit;
  const items = list.slice(start, start + limit);
  res.json({ items, total, page, limit });
});

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
  const { codigo, nombre, descripcion, estado, nodoIds } = req.body || {};
  if (!codigo || !nombre) return res.status(400).json({ error: 'codigo y nombre son obligatorios.' });
  if (db.aplicaciones.some((a) => a.codigo === codigo)) return res.status(409).json({ error: 'El código ya existe.' });
  const nodos = Array.isArray(nodoIds) ? nodoIds : [];
  const nodosInvalidos = nodos.filter((id: string) => !db.nodosSegregacion.some((n) => n.id === id));
  if (nodosInvalidos.length > 0) {
    return res.status(400).json({ error: `Algunos nodos de segregación no existen: ${nodosInvalidos.join(', ')}.` });
  }
  const app: Aplicacion = { id: newId('seg_app'), codigo, nombre, descripcion: descripcion || '', estado: estado || 'ACTIVO', nodoIds: nodos, createdAt: nowIso() };
  db.aplicaciones.push(app);
  logAudit(actorName(req), 'CREATE_APLICACION', 'aplicacion', app.id, `Aplicación "${nombre}" creada.`);
  res.status(201).json(app);
});

app.put('/api/seg-aplicaciones/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const app = db.aplicaciones.find((a) => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: 'Aplicación no encontrada.' });
  const { codigo, nombre, descripcion, estado, nodoIds } = req.body || {};
  if (codigo && db.aplicaciones.some((a) => a.id !== app.id && a.codigo === codigo))
    return res.status(409).json({ error: 'El código ya existe.' });
  if (nodoIds !== undefined) {
    const nodos = Array.isArray(nodoIds) ? nodoIds : [];
    const nodosInvalidos = nodos.filter((id: string) => !db.nodosSegregacion.some((n) => n.id === id));
    if (nodosInvalidos.length > 0) {
      return res.status(400).json({ error: `Algunos nodos de segregación no existen: ${nodosInvalidos.join(', ')}.` });
    }
    app.nodoIds = nodos;
  }
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
    controles.forEach((c, idx) => {
      const ctrl: Control = {
        id: newId('seg_ctrl'),
        prgCodigo: codigo,
        codigo: c.codigo || '',
        tipoControl: c.tipoControl || 'Otros',
        descripcion: c.descripcion || '',
        estado: c.estado || 'ACTIVO',
        log: c.log || 'ACTIVO',
        orden: idx,
        createdAt: nowIso(),
      };
      db.controles.push(ctrl);
    });
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
    controles.forEach((c, idx) => {
      const ctrl: Control = {
        id: newId('seg_ctrl'),
        prgCodigo: prg.codigo,
        codigo: c.codigo || '',
        tipoControl: c.tipoControl || 'Otros',
        descripcion: c.descripcion || '',
        estado: c.estado || 'ACTIVO',
        log: c.log || 'ACTIVO',
        orden: idx,
        createdAt: nowIso(),
      };
      db.controles.push(ctrl);
    });
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

const TIPOS_PROGRAMA_VALIDOS: TipoPrograma[] = ['Menú', 'Submenú', 'Maestro', 'Transacción', 'Proceso', 'Consulta', 'Reporte', 'Objeto'];

interface BulkSeguridadRow {
  row: number;
  tipo: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  appCodigo: string;
  modCodigo: string;
  prgTipo: string;
  estado: string;
}

app.post('/api/seg-aplicaciones/bulk', requireAuth, requireGlobalAdmin, (req, res) => {
  const rows: BulkSeguridadRow[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ ok: false, error: 'No se recibieron filas para procesar.' });

  const errors: { row: number; message: string }[] = [];
  let processed = 0;
  let createdApps = 0;
  let createdMods = 0;
  let createdPrgs = 0;
  let updatedApps = 0;
  let updatedMods = 0;
  let updatedPrgs = 0;

  const tipoOrden = new Map<string, number>([['APLICACION', 1], ['MODULO', 2], ['PROGRAMA', 3]]);
  const sortedRows = [...rows].sort((a, b) => {
    const oa = tipoOrden.get(a.tipo?.trim().toUpperCase()) ?? 99;
    const ob = tipoOrden.get(b.tipo?.trim().toUpperCase()) ?? 99;
    return oa - ob;
  });

  for (const r of sortedRows) {
    const tipo = r.tipo?.trim().toUpperCase();
    const codigo = r.codigo?.trim();
    const nombre = r.nombre?.trim();
    const descripcion = r.descripcion?.trim() || '';
    const appCodigo = r.appCodigo?.trim();
    const modCodigo = r.modCodigo?.trim();
    const prgTipoRaw = r.prgTipo?.trim();
    const estadoRaw = r.estado?.trim();

    if (!tipo) { errors.push({ row: r.row, message: 'El campo TIPO es obligatorio.' }); continue; }
    if (!codigo) { errors.push({ row: r.row, message: 'El campo CODIGO es obligatorio.' }); continue; }
    if (!nombre) { errors.push({ row: r.row, message: 'El campo NOMBRE es obligatorio.' }); continue; }

    const estado = estadoRaw ? estadoRaw.toUpperCase() : 'ACTIVO';
    if (estado !== 'ACTIVO' && estado !== 'INACTIVO') {
      errors.push({ row: r.row, message: `El estado "${estadoRaw}" no es válido. Use ACTIVO o INACTIVO.` });
      continue;
    }

    if (tipo === 'APLICACION') {
      const existing = db.aplicaciones.find(a => a.codigo.toLowerCase() === codigo.toLowerCase());
      if (existing) {
        existing.nombre = nombre;
        existing.descripcion = descripcion;
        existing.estado = estado as Aplicacion['estado'];
        updatedApps++;
        logAudit(actorName(req), 'UPDATE_APLICACION', 'aplicacion', existing.id, `Aplicación "${nombre}" actualizada por carga masiva.`);
      } else {
        const app: Aplicacion = { id: newId('seg_app'), codigo, nombre, descripcion, estado: estado as Aplicacion['estado'], nodoIds: [], createdAt: nowIso() };
        db.aplicaciones.push(app);
        createdApps++;
        logAudit(actorName(req), 'CREATE_APLICACION', 'aplicacion', app.id, `Aplicación "${nombre}" creada por carga masiva.`);
      }
    } else if (tipo === 'MODULO') {
      if (!appCodigo) { errors.push({ row: r.row, message: 'El campo APP_CODIGO es obligatorio para un módulo.' }); continue; }
      const app = db.aplicaciones.find(a => a.codigo.toLowerCase() === appCodigo.toLowerCase());
      if (!app) { errors.push({ row: r.row, message: `La aplicación "${appCodigo}" no existe.` }); continue; }
      const existing = db.modulos.find(m => m.codigo.toLowerCase() === codigo.toLowerCase());
      if (existing) {
        if (existing.appCodigo.toLowerCase() !== appCodigo.toLowerCase()) {
          errors.push({ row: r.row, message: `El módulo "${codigo}" ya existe en la aplicación "${existing.appCodigo}". No se puede cambiar de aplicación por carga masiva.` });
          continue;
        }
        existing.nombre = nombre;
        existing.descripcion = descripcion;
        existing.estado = estado as Modulo['estado'];
        updatedMods++;
        logAudit(actorName(req), 'UPDATE_MODULO', 'modulo', existing.id, `Módulo "${nombre}" actualizado por carga masiva.`);
      } else {
        const mod: Modulo = { id: newId('seg_mod'), codigo, nombre, descripcion, appCodigo: app.codigo, estado: estado as Modulo['estado'], orden: siguienteOrdenModulo(app.codigo), createdAt: nowIso() };
        db.modulos.push(mod);
        createdMods++;
        logAudit(actorName(req), 'CREATE_MODULO', 'modulo', mod.id, `Módulo "${nombre}" creado por carga masiva.`);
      }
    } else if (tipo === 'PROGRAMA') {
      if (!modCodigo) { errors.push({ row: r.row, message: 'El campo MOD_CODIGO es obligatorio para un programa.' }); continue; }
      const mod = db.modulos.find(m => m.codigo.toLowerCase() === modCodigo.toLowerCase());
      if (!mod) { errors.push({ row: r.row, message: `El módulo "${modCodigo}" no existe.` }); continue; }
      if (appCodigo && mod.appCodigo.toLowerCase() !== appCodigo.toLowerCase()) {
        errors.push({ row: r.row, message: `El módulo "${modCodigo}" no pertenece a la aplicación "${appCodigo}".` });
        continue;
      }
      const tipoPrograma = prgTipoRaw || 'Transacción';
      if (!TIPOS_PROGRAMA_VALIDOS.includes(tipoPrograma as TipoPrograma)) {
        errors.push({ row: r.row, message: `El tipo de programa "${prgTipoRaw}" no es válido. Valores: ${TIPOS_PROGRAMA_VALIDOS.join(', ')}.` });
        continue;
      }
      const existing = db.programas.find(p => p.codigo.toLowerCase() === codigo.toLowerCase());
      if (existing) {
        if (existing.modCodigo.toLowerCase() !== modCodigo.toLowerCase()) {
          errors.push({ row: r.row, message: `El programa "${codigo}" ya existe en el módulo "${existing.modCodigo}". No se puede cambiar de módulo por carga masiva.` });
          continue;
        }
        existing.nombre = nombre;
        existing.descripcion = descripcion;
        existing.tipo = tipoPrograma as TipoPrograma;
        existing.estado = estado as Programa['estado'];
        updatedPrgs++;
        logAudit(actorName(req), 'UPDATE_PROGRAMA', 'programa', existing.id, `Programa "${nombre}" actualizado por carga masiva.`);
      } else {
        const prg: Programa = { id: newId('seg_prg'), codigo, nombre, descripcion, modCodigo: mod.codigo, tipo: tipoPrograma as TipoPrograma, estado: estado as Programa['estado'], orden: siguienteOrdenPrograma(mod.codigo), createdAt: nowIso() };
        db.programas.push(prg);
        createdPrgs++;
        logAudit(actorName(req), 'CREATE_PROGRAMA', 'programa', prg.id, `Programa "${nombre}" creado por carga masiva.`);
      }
    } else {
      errors.push({ row: r.row, message: `El tipo "${r.tipo}" no es válido. Use APLICACION, MODULO o PROGRAMA.` });
      continue;
    }
    processed++;
  }

  if (errors.length) {
    return res.status(400).json({ ok: false, processed, created: { apps: createdApps, mods: createdMods, prgs: createdPrgs }, updated: { apps: updatedApps, mods: updatedMods, prgs: updatedPrgs }, errors });
  }
  res.json({ ok: true, processed, created: { apps: createdApps, mods: createdMods, prgs: createdPrgs }, updated: { apps: updatedApps, mods: updatedMods, prgs: updatedPrgs }, errors: [] });
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

interface BulkPerfilRow {
  row: number;
  perfilCodigo: string;
  perfilNombre: string;
  perfilDescripcion: string;
  prgCodigo: string;
  nuevo: string;
  modificar: string;
  anular: string;
  imprimir: string;
  consultar: string;
  estado: string;
}

function parseBool(v: string): boolean {
  const s = String(v || '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'si' || s === 'sí' || s === 'verdadero' || s === 'x';
}

app.post('/api/seg-perfiles/bulk', requireAuth, requireGlobalAdmin, (req, res) => {
  const rows: BulkPerfilRow[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ ok: false, error: 'No se recibieron filas para procesar.' });

  const errors: { row: number; message: string }[] = [];
  let processedPerfiles = 0;
  let createdPerfiles = 0;
  let updatedPerfiles = 0;

  // Agrupar filas por PERFIL_CODIGO (case-insensitive), preservando el orden de aparición.
  const grupos = new Map<string, BulkPerfilRow[]>();
  const ordenCodigos: string[] = [];
  for (const r of rows) {
    const cod = r.perfilCodigo?.trim();
    if (!cod) { errors.push({ row: r.row, message: 'El campo PERFIL_CODIGO es obligatorio.' }); continue; }
    const key = cod.toLowerCase();
    if (!grupos.has(key)) { grupos.set(key, []); ordenCodigos.push(key); }
    grupos.get(key)!.push(r);
  }

  // Validar y construir perfiles
  type PerfilData = {
    codigo: string;
    nombre: string;
    descripcion: string;
    estado: string;
    programas: PerfilPrograma[];
  };
  const perfilsData: PerfilData[] = [];

  for (const codKey of ordenCodigos) {
    const grupo = grupos.get(codKey)!;
    const primeraRow = grupo.find(r => r.perfilNombre?.trim()) || grupo[0];
    const codigo = grupo[0].perfilCodigo.trim();
    const nombre = primeraRow.perfilNombre?.trim() || '';
    const descripcion = grupo[0].perfilDescripcion?.trim() || '';
    const estadoRaw = grupo[0].estado?.trim() || 'ACTIVO';
    const estado = estadoRaw.toUpperCase();
    const programas: PerfilPrograma[] = [];
    let grupoTieneError = false;

    if (!nombre) { errors.push({ row: grupo[0].row, message: `El campo PERFIL_NOMBRE es obligatorio para el perfil "${codigo}".` }); grupoTieneError = true; }
    if (estado !== 'ACTIVO' && estado !== 'INACTIVO') { errors.push({ row: grupo[0].row, message: `El estado "${estadoRaw}" no es válido. Use ACTIVO o INACTIVO.` }); grupoTieneError = true; }

    const prgVistos = new Set<string>();
    for (const r of grupo) {
      const prgCodigo = r.prgCodigo?.trim();
      if (!prgCodigo) { errors.push({ row: r.row, message: `El campo PRG_CODIGO es obligatorio (perfil "${codigo}").` }); grupoTieneError = true; continue; }
      if (!db.programas.some(p => p.codigo.toLowerCase() === prgCodigo.toLowerCase())) { errors.push({ row: r.row, message: `El programa "${prgCodigo}" no existe.` }); grupoTieneError = true; continue; }
      if (prgVistos.has(prgCodigo.toLowerCase())) { errors.push({ row: r.row, message: `El programa "${prgCodigo}" está duplicado para el perfil "${codigo}".` }); grupoTieneError = true; continue; }
      prgVistos.add(prgCodigo.toLowerCase());
      programas.push({
        prgCodigo,
        nuevo: parseBool(r.nuevo),
        modificar: parseBool(r.modificar),
        anular: parseBool(r.anular),
        procesar: false,
        imprimir: parseBool(r.imprimir),
        consultar: parseBool(r.consultar),
      });
    }

    if (!grupoTieneError && programas.length === 0) { errors.push({ row: grupo[0].row, message: `El perfil "${codigo}" debe tener al menos un programa.` }); grupoTieneError = true; }

    if (grupoTieneError) continue;
    perfilsData.push({ codigo, nombre, descripcion, estado, programas });
  }

  // Aplicar
  for (const pd of perfilsData) {
    const existing = db.perfiles.find(p => p.codigo.toLowerCase() === pd.codigo.toLowerCase());
    if (existing) {
      existing.nombre = pd.nombre;
      existing.descripcion = pd.descripcion;
      existing.estado = pd.estado as Perfil['estado'];
      existing.programas = pd.programas;
      updatedPerfiles++;
      logAudit(actorName(req), 'UPDATE_PERFIL', 'perfil', existing.id, `Perfil "${pd.nombre}" actualizado por carga masiva con ${pd.programas.length} programa(s).`);
    } else {
      const perf: Perfil = { id: newId('seg_perf'), codigo: pd.codigo, nombre: pd.nombre, descripcion: pd.descripcion, programas: pd.programas, estado: pd.estado as Perfil['estado'], createdAt: nowIso() };
      db.perfiles.push(perf);
      createdPerfiles++;
      logAudit(actorName(req), 'CREATE_PERFIL', 'perfil', perf.id, `Perfil "${pd.nombre}" creado por carga masiva con ${pd.programas.length} programa(s).`);
    }
    processedPerfiles++;
  }

  if (errors.length) {
    return res.status(400).json({ ok: false, processed: processedPerfiles, created: createdPerfiles, updated: updatedPerfiles, errors });
  }
  res.json({ ok: true, processed: processedPerfiles, created: createdPerfiles, updated: updatedPerfiles, errors: [] });
});

// --- Controles ---
function ordenarControles(items: Control[]): Control[] {
  return [...items].sort((a, b) => {
    if (a.orden !== undefined && b.orden !== undefined) return a.orden - b.orden;
    if (a.orden !== undefined) return -1;
    if (b.orden !== undefined) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

function siguienteOrdenControl(prgCodigo: string): number {
  const existentes = db.controles.filter((c) => c.prgCodigo === prgCodigo);
  if (existentes.length === 0) return 0;
  return Math.max(...existentes.map((c) => c.orden ?? 0)) + 1;
}

app.get('/api/seg-controles', requireAuth, (_req, res) => res.json(ordenarControles(db.controles)));

app.put('/api/seg-controles/reordenar', requireAuth, requireGlobalAdmin, (req, res) => {
  const { orden } = req.body || {};
  if (!Array.isArray(orden)) return res.status(400).json({ error: 'El campo "orden" debe ser un array de { id, orden }.' });
  for (const item of orden) {
    const ctrl = db.controles.find((c) => c.id === item.id);
    if (ctrl) ctrl.orden = Number(item.orden);
  }
  logAudit(actorName(req), 'REORDER_CONTROLES', 'control', null, `Reordenados ${orden.length} controles.`);
  res.json({ ok: true });
});

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

    let created = { paises: 0, provincias: 0, ciudades: 0, usuarios: 0, apps: 0, mods: 0, prgs: 0, perfs: 0 };
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
            nodoIds: [],
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
          app = { id: newId('seg_app'), codigo: appCodigo, nombre: appNombre, descripcion: normalize(r['app_descripcion']), estado: 'ACTIVO', nodoIds: [], createdAt: nowIso() };
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
      `Carga masiva: ${created.paises} países, ${created.provincias} provincias, ${created.ciudades} ciudades, ${created.usuarios} usuarios, ${created.apps} apps, ${created.mods} mods, ${created.prgs} prgs, ${created.perfs} perfs. Omitidas: ${skipped}.`,
    );

    const summary = `Creados: ${created.paises} países, ${created.provincias} provincias, ${created.ciudades} ciudades, ${created.usuarios} usuarios, ${created.apps} aplicaciones, ${created.mods} módulos, ${created.prgs} programas, ${created.perfs} perfiles.${skipped ? ` Filas omitidas: ${skipped}.` : ''}`;
    res.json({ ok: true, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al procesar el archivo.' });
  }
});

// ==========================================================================
// Configuración: Niveles y Nodos de Segregación
// ==========================================================================

function ordenarNiveles(items: NivelSegregacion[]): NivelSegregacion[] {
  return [...items].sort((a, b) => a.orden - b.orden || a.createdAt.localeCompare(b.createdAt));
}

function ordenarNodos(items: NodoSegregacion[]): NodoSegregacion[] {
  return [...items].sort((a, b) => a.codigo.localeCompare(b.codigo) || a.nombre.localeCompare(b.nombre));
}

/** Devuelve el nivel anterior en la jerarquía (null si es el primero). */
function nivelPadre(nivelId: string): NivelSegregacion | null {
  const nivel = db.nivelesSegregacion.find(n => n.id === nivelId);
  if (!nivel || nivel.orden <= 1) return null;
  return db.nivelesSegregacion
    .filter(n => n.orden < nivel.orden)
    .sort((a, b) => b.orden - a.orden)[0] || null;
}

/** Verifica que un nodo padre pertenezca al nivel inmediatamente anterior. */
function padreValido(nivelId: string, padreId: string | null): { ok: boolean; error?: string } {
  if (padreId === null || padreId === undefined) return { ok: true };
  const nivel = db.nivelesSegregacion.find(n => n.id === nivelId);
  if (!nivel) return { ok: false, error: 'Nivel no encontrado.' };
  const padre = db.nodosSegregacion.find(n => n.id === padreId);
  if (!padre) return { ok: false, error: 'Nodo padre no encontrado.' };
  const nivelPadreReq = nivelPadre(nivelId);
  if (!nivelPadreReq) return { ok: false, error: 'El nivel seleccionado no admite padre.' };
  if (padre.nivelId !== nivelPadreReq.id) {
    return { ok: false, error: `El padre debe pertenecer al nivel "${nivelPadreReq.nombre}".` };
  }
  return { ok: true };
}

/** Detecta ciclos en la jerarquía de nodos. */
function detectaCiclo(nodoId: string, padreId: string | null): boolean {
  if (!padreId) return false;
  let actual: string | null = padreId;
  const visitados = new Set<string>();
  while (actual) {
    if (actual === nodoId) return true;
    if (visitados.has(actual)) return true;
    visitados.add(actual);
    const n = db.nodosSegregacion.find(x => x.id === actual);
    actual = n?.padreId || null;
  }
  return false;
}

/** Recolecta recursivamente los IDs de los descendientes de un nodo. */
function descendientesNodo(nodoId: string): string[] {
  const hijos = db.nodosSegregacion.filter(n => n.padreId === nodoId).map(n => n.id);
  const result = [...hijos];
  for (const h of hijos) result.push(...descendientesNodo(h));
  return result;
}

/** Construye el árbol de nodos a partir de la lista plana. */
function buildTree(nodos: NodoSegregacion[]): any[] {
  const niveles = ordenarNiveles(db.nivelesSegregacion);
  const nivelMap = new Map(niveles.map(n => [n.id, n]));
  const nodosPorId = new Map(nodos.map(n => [n.id, { ...n, children: [] as any[], nivel: nivelMap.get(n.nivelId) }]));
  const roots: any[] = [];
  for (const n of nodosPorId.values()) {
    if (!n.padreId) {
      roots.push(n);
    } else {
      const padre = nodosPorId.get(n.padreId);
      if (padre) padre.children.push(n);
    }
  }
  // Ordenar por nivel y código
  const sortRec = (items: any[]) => {
    items.sort((a, b) => {
      const oa = a.nivel?.orden ?? 0;
      const ob = b.nivel?.orden ?? 0;
      if (oa !== ob) return oa - ob;
      return a.codigo.localeCompare(b.codigo);
    });
    items.forEach(i => sortRec(i.children));
  };
  sortRec(roots);
  return roots;
}

// --- Niveles de Segregación ---
app.get('/api/niveles-segregacion', requireAuth, (_req, res) => {
  res.json(ordenarNiveles(db.nivelesSegregacion));
});

app.post('/api/niveles-segregacion', requireAuth, requireGlobalAdmin, (req, res) => {
  const { codigo, nombre, orden, estado } = req.body || {};
  if (!codigo || !nombre || orden === undefined || orden === null) {
    return res.status(400).json({ error: 'codigo, nombre y orden son obligatorios.' });
  }
  const ordenNum = Number(orden);
  if (!Number.isFinite(ordenNum) || ordenNum < 1) {
    return res.status(400).json({ error: 'El orden debe ser un número mayor o igual a 1.' });
  }
  if (db.nivelesSegregacion.some(n => n.codigo === codigo)) {
    return res.status(409).json({ error: 'El código de nivel ya existe.' });
  }
  if (db.nivelesSegregacion.some(n => n.orden === ordenNum)) {
    return res.status(409).json({ error: 'Ya existe un nivel con ese orden.' });
  }
  const nivel: NivelSegregacion = {
    id: newId('niv_seg'),
    codigo,
    nombre,
    orden: ordenNum,
    estado: estado || 'ACTIVO',
    createdAt: nowIso(),
  };
  db.nivelesSegregacion.push(nivel);
  logAudit(actorName(req), 'CREATE_NIVEL_SEGREGACION', 'nivel-segregacion', nivel.id, `Nivel "${nombre}" creado con orden ${ordenNum}.`);
  res.status(201).json(nivel);
});

app.put('/api/niveles-segregacion/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const nivel = db.nivelesSegregacion.find(n => n.id === req.params.id);
  if (!nivel) return res.status(404).json({ error: 'Nivel no encontrado.' });
  const { codigo, nombre, orden, estado } = req.body || {};
  const patch = definedOnly({ codigo, nombre, orden, estado });
  if (patch.orden !== undefined) {
    patch.orden = Number(patch.orden);
    if (!Number.isFinite(patch.orden) || patch.orden < 1) {
      return res.status(400).json({ error: 'El orden debe ser un número mayor o igual a 1.' });
    }
    if (db.nivelesSegregacion.some(n => n.id !== nivel.id && n.orden === patch.orden)) {
      return res.status(409).json({ error: 'Ya existe un nivel con ese orden.' });
    }
  }
  if (patch.codigo && db.nivelesSegregacion.some(n => n.id !== nivel.id && n.codigo === patch.codigo)) {
    return res.status(409).json({ error: 'El código de nivel ya existe.' });
  }
  Object.assign(nivel, patch);
  logAudit(actorName(req), 'UPDATE_NIVEL_SEGREGACION', 'nivel-segregacion', nivel.id, `Nivel "${nivel.nombre}" actualizado.`);
  res.json(nivel);
});

app.delete('/api/niveles-segregacion/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const idx = db.nivelesSegregacion.findIndex(n => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Nivel no encontrado.' });
  const nivel = db.nivelesSegregacion[idx];
  if (db.nodosSegregacion.some(n => n.nivelId === nivel.id)) {
    return res.status(400).json({ error: 'No se puede eliminar un nivel que tiene nodos asociados.' });
  }
  const atributosEliminados = db.nivelesAtributos.filter(a => a.nivelId === nivel.id).map(a => a.id);
  db.nivelesAtributos = db.nivelesAtributos.filter(a => a.nivelId !== nivel.id);
  db.nodosAtributosValores = db.nodosAtributosValores.filter(v => !atributosEliminados.includes(v.atributoId));
  db.nivelesSegregacion.splice(idx, 1);
  logAudit(actorName(req), 'DELETE_NIVEL_SEGREGACION', 'nivel-segregacion', nivel.id, `Nivel "${nivel.nombre}" eliminado.`);
  res.json({ ok: true });
});

// --- Atributos de Nivel ---------------------------------------------------
function ordenarAtributos(items: NivelAtributo[]): NivelAtributo[] {
  return [...items].sort((a, b) => a.orden - b.orden || a.createdAt.localeCompare(b.createdAt));
}

function reemplazarAtributosNodo(nodoId: string, atributos: any[] | undefined) {
  db.nodosAtributosValores = db.nodosAtributosValores.filter(v => v.nodoId !== nodoId);
  if (!Array.isArray(atributos)) return;
  for (const a of atributos) {
    if (!a?.atributoId) continue;
    const valor: NodoAtributoValor = {
      id: newId('nod_attr_val'),
      nodoId,
      atributoId: a.atributoId,
      valor: String(a.valor ?? ''),
      createdAt: nowIso(),
    };
    db.nodosAtributosValores.push(valor);
  }
}

// --- Nodos de Segregación ---
app.get('/api/nodos-segregacion', requireAuth, (_req, res) => {
  res.json(ordenarNodos(db.nodosSegregacion));
});

app.get('/api/nodos-segregacion/arbol', requireAuth, (_req, res) => {
  res.json(buildTree(db.nodosSegregacion));
});

app.get('/api/nodos-atributo-valor', requireAuth, (req, res) => {
  const { nodoId } = req.query;
  let list = db.nodosAtributosValores;
  if (nodoId) list = list.filter(v => v.nodoId === nodoId);
  res.json(list);
});

app.post('/api/nodos-segregacion', requireAuth, requireGlobalAdmin, (req, res) => {
  const { codigo, nombre, nivelId, padreId, estado, atributos } = req.body || {};
  if (!codigo || !nombre || !nivelId) {
    return res.status(400).json({ error: 'codigo, nombre y nivelId son obligatorios.' });
  }
  if (!db.nivelesSegregacion.some(n => n.id === nivelId)) {
    return res.status(404).json({ error: 'Nivel no encontrado.' });
  }
  if (db.nodosSegregacion.some(n => n.codigo === codigo)) {
    return res.status(409).json({ error: 'El código de nodo ya existe.' });
  }
  const validacion = padreValido(nivelId, padreId);
  if (!validacion.ok) return res.status(400).json({ error: validacion.error });
  const nodo: NodoSegregacion = {
    id: newId('nod_seg'),
    codigo,
    nombre,
    nivelId,
    padreId: padreId || null,
    estado: estado || 'ACTIVO',
    createdAt: nowIso(),
  };
  db.nodosSegregacion.push(nodo);
  reemplazarAtributosNodo(nodo.id, atributos);
  logAudit(actorName(req), 'CREATE_NODO_SEGREGACION', 'nodo-segregacion', nodo.id, `Nodo "${nombre}" creado.`);
  res.status(201).json(nodo);
});

interface BulkNodoRow {
  row: number;
  nivel: string;
  codigo: string;
  nombre: string;
  padre: string;
  estado: string;
}

app.post('/api/nodos-segregacion/bulk', requireAuth, requireGlobalAdmin, (req, res) => {
  const rows: BulkNodoRow[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ ok: false, error: 'No se recibieron filas para procesar.' });

  const errors: { row: number; message: string }[] = [];
  let processed = 0;
  const createdIds: string[] = [];
  const updatedIds: string[] = [];

  // Mapa de códigos procesados en este lote a IDs de nodo (existentes o recién creados).
  const codeToId = new Map<string, string>();
  for (const n of db.nodosSegregacion) codeToId.set(n.codigo.toLowerCase(), n.id);

  // Ordenar por orden del nivel para que los padres se procesen antes que los hijos.
  const nivelOrden = new Map<string, number>();
  for (const n of db.nivelesSegregacion) nivelOrden.set(n.id, n.orden);
  const sortedRows = [...rows].sort((a, b) => {
    const nivelA = db.nivelesSegregacion.find(n => n.nombre.toLowerCase() === a.nivel.toLowerCase().trim());
    const nivelB = db.nivelesSegregacion.find(n => n.nombre.toLowerCase() === b.nivel.toLowerCase().trim());
    const ordenA = nivelA ? nivelOrden.get(nivelA.id) ?? 0 : 0;
    const ordenB = nivelB ? nivelOrden.get(nivelB.id) ?? 0 : 0;
    return ordenA - ordenB;
  });

  for (const r of sortedRows) {
    const nivelNombre = r.nivel?.trim();
    const codigo = r.codigo?.trim();
    const nombre = r.nombre?.trim();
    const padreCodigo = r.padre?.trim();
    const estadoRaw = r.estado?.trim();

    if (!nivelNombre) { errors.push({ row: r.row, message: 'El campo NIVEL es obligatorio.' }); continue; }
    if (!codigo) { errors.push({ row: r.row, message: 'El campo CODIGO es obligatorio.' }); continue; }
    if (!nombre) { errors.push({ row: r.row, message: 'El campo NOMBRE es obligatorio.' }); continue; }

    const nivel = db.nivelesSegregacion.find(n => n.nombre.toLowerCase() === nivelNombre.toLowerCase());
    if (!nivel) { errors.push({ row: r.row, message: `El nivel "${nivelNombre}" no existe.` }); continue; }
    if (nivel.estado !== 'ACTIVO') { errors.push({ row: r.row, message: `El nivel "${nivelNombre}" no está activo.` }); continue; }

    const estado = estadoRaw ? estadoRaw.toUpperCase() : 'ACTIVO';
    if (estado !== 'ACTIVO' && estado !== 'INACTIVO') {
      errors.push({ row: r.row, message: `El estado "${estadoRaw}" no es válido. Use ACTIVO o INACTIVO.` });
      continue;
    }

    // Resolver padre
    let padreId: string | null = null;
    if (padreCodigo) {
      const padreIdByCode = codeToId.get(padreCodigo.toLowerCase());
      const padre = padreIdByCode ? db.nodosSegregacion.find(n => n.id === padreIdByCode) : null;
      if (!padre) { errors.push({ row: r.row, message: `El nodo padre "${padreCodigo}" no existe.` }); continue; }
      const nivelPadreReq = nivelPadre(nivel.id);
      if (!nivelPadreReq) { errors.push({ row: r.row, message: `El nivel "${nivel.nombre}" no admite padre.` }); continue; }
      if (padre.nivelId !== nivelPadreReq.id) {
        errors.push({ row: r.row, message: `El padre "${padreCodigo}" debe pertenecer al nivel "${nivelPadreReq.nombre}".` });
        continue;
      }
      padreId = padre.id;
    } else if (nivel.orden > 1) {
      const nivelPadreReq = nivelPadre(nivel.id);
      errors.push({ row: r.row, message: `El nivel "${nivel.nombre}" requiere un padre del nivel "${nivelPadreReq?.nombre || 'anterior'}".` });
      continue;
    }

    const existing = db.nodosSegregacion.find(n => n.codigo.toLowerCase() === codigo.toLowerCase());
    if (existing) {
      if (existing.nivelId !== nivel.id) {
        const nivelActual = db.nivelesSegregacion.find(n => n.id === existing.nivelId);
        errors.push({ row: r.row, message: `El nodo "${codigo}" ya existe en el nivel "${nivelActual?.nombre || existing.nivelId}". No se puede cambiar de nivel por carga masiva.` });
        continue;
      }
      // Actualizar solo nombre y estado para evitar conflictos de jerarquía.
      existing.nombre = nombre;
      existing.estado = estado as NodoSegregacion['estado'];
      updatedIds.push(existing.id);
      logAudit(actorName(req), 'UPDATE_NODO_SEGREGACION', 'nodo-segregacion', existing.id, `Nodo "${nombre}" actualizado por carga masiva.`);
    } else {
      const nuevo: NodoSegregacion = {
        id: newId('nod_seg'),
        codigo,
        nombre,
        nivelId: nivel.id,
        padreId,
        estado: estado as NodoSegregacion['estado'],
        createdAt: nowIso(),
      };
      db.nodosSegregacion.push(nuevo);
      createdIds.push(nuevo.id);
      codeToId.set(codigo.toLowerCase(), nuevo.id);
      logAudit(actorName(req), 'CREATE_NODO_SEGREGACION', 'nodo-segregacion', nuevo.id, `Nodo "${nombre}" creado por carga masiva.`);
    }
    processed++;
  }

  if (errors.length) {
    return res.status(400).json({ ok: false, processed, created: createdIds.length, updated: updatedIds.length, errors });
  }
  res.json({ ok: true, processed, created: createdIds.length, updated: updatedIds.length, errors: [] });
});

app.put('/api/nodos-segregacion/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const nodo = db.nodosSegregacion.find(n => n.id === req.params.id);
  if (!nodo) return res.status(404).json({ error: 'Nodo no encontrado.' });
  const { codigo, nombre, nivelId, padreId, estado, atributos } = req.body || {};
  const patch = definedOnly({ codigo, nombre, nivelId, padreId, estado });

  if (patch.nivelId && !db.nivelesSegregacion.some(n => n.id === patch.nivelId)) {
    return res.status(404).json({ error: 'Nivel no encontrado.' });
  }
  const nivelFinal = patch.nivelId || nodo.nivelId;
  const padreFinal = patch.padreId !== undefined ? patch.padreId : nodo.padreId;
  const validacion = padreValido(nivelFinal, padreFinal);
  if (!validacion.ok) return res.status(400).json({ error: validacion.error });
  if (detectaCiclo(nodo.id, padreFinal)) {
    return res.status(400).json({ error: 'No se puede formar un ciclo en la jerarquía.' });
  }
  if (patch.codigo && db.nodosSegregacion.some(n => n.id !== nodo.id && n.codigo === patch.codigo)) {
    return res.status(409).json({ error: 'El código de nodo ya existe.' });
  }
  // Si cambia de nivel, los descendientes quedarían huérfanos; los eliminamos en cascada.
  if (patch.nivelId && patch.nivelId !== nodo.nivelId) {
    const desc = descendientesNodo(nodo.id);
    db.nodosSegregacion = db.nodosSegregacion.filter(n => !desc.includes(n.id));
    // Limpiar referencias de usuarios a nodos eliminados
    db.users.forEach(u => { u.nodoIds = u.nodoIds.filter(id => id !== nodo.id && !desc.includes(id)); });
  }
  Object.assign(nodo, patch);
  reemplazarAtributosNodo(nodo.id, atributos);
  logAudit(actorName(req), 'UPDATE_NODO_SEGREGACION', 'nodo-segregacion', nodo.id, `Nodo "${nodo.nombre}" actualizado.`);
  res.json(nodo);
});

app.delete('/api/nodos-segregacion/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const idx = db.nodosSegregacion.findIndex(n => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Nodo no encontrado.' });
  const removed = db.nodosSegregacion[idx];
  const desc = descendientesNodo(removed.id);
  const eliminados = [removed.id, ...desc];
  db.nodosSegregacion = db.nodosSegregacion.filter(n => !eliminados.includes(n.id));
  db.nodosAtributosValores = db.nodosAtributosValores.filter(v => !eliminados.includes(v.nodoId));
  db.users.forEach(u => { u.nodoIds = u.nodoIds.filter(id => !eliminados.includes(id)); });
  logAudit(actorName(req), 'DELETE_NODO_SEGREGACION', 'nodo-segregacion', removed.id, `Nodo "${removed.nombre}" eliminado con ${desc.length} descendiente(s).`);
  res.json({ ok: true });
});

// ==========================================================================
// Atributos de Nivel (metadatos dinámicos por nivel)
// ==========================================================================

app.get('/api/niveles-atributos', requireAuth, (req, res) => {
  const { nivelId } = req.query;
  let list = db.nivelesAtributos;
  if (nivelId) list = list.filter(a => a.nivelId === nivelId);
  res.json(ordenarAtributos(list));
});

app.post('/api/niveles-atributos', requireAuth, requireGlobalAdmin, (req, res) => {
  const { nivelId, codigo, nombre, tipo, config, obligatorio, orden, estado } = req.body || {};
  if (!nivelId || !codigo || !nombre) {
    return res.status(400).json({ error: 'nivelId, codigo y nombre son obligatorios.' });
  }
  if (!db.nivelesSegregacion.some(n => n.id === nivelId)) {
    return res.status(404).json({ error: 'Nivel no encontrado.' });
  }
  if (db.nivelesAtributos.some(a => a.nivelId === nivelId && a.codigo === codigo)) {
    return res.status(409).json({ error: 'El código de atributo ya existe para este nivel.' });
  }
  const atributo: NivelAtributo = {
    id: newId('niv_attr'),
    nivelId,
    codigo,
    nombre,
    tipo: tipo || 'texto',
    config: config && typeof config === 'object' ? config : undefined,
    obligatorio: !!obligatorio,
    orden: orden !== undefined ? Number(orden) : db.nivelesAtributos.filter(a => a.nivelId === nivelId).length,
    estado: estado || 'ACTIVO',
    createdAt: nowIso(),
  };
  db.nivelesAtributos.push(atributo);
  logAudit(actorName(req), 'CREATE_NIVEL_ATRIBUTO', 'nivel-atributo', atributo.id, `Atributo "${nombre}" creado para nivel ${nivelId}.`);
  res.status(201).json(atributo);
});

app.put('/api/niveles-atributos/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const attr = db.nivelesAtributos.find(a => a.id === req.params.id);
  if (!attr) return res.status(404).json({ error: 'Atributo no encontrado.' });
  const { nivelId, codigo, nombre, tipo, config, obligatorio, orden, estado } = req.body || {};
  const patch = definedOnly({ nivelId, codigo, nombre, tipo, config, obligatorio, orden, estado });
  if (patch.nivelId && !db.nivelesSegregacion.some(n => n.id === patch.nivelId)) {
    return res.status(404).json({ error: 'Nivel no encontrado.' });
  }
  if (patch.codigo && db.nivelesAtributos.some(a => a.id !== attr.id && a.nivelId === (patch.nivelId || attr.nivelId) && a.codigo === patch.codigo)) {
    return res.status(409).json({ error: 'El código de atributo ya existe para este nivel.' });
  }
  if (patch.orden !== undefined) patch.orden = Number(patch.orden);
  Object.assign(attr, patch);
  logAudit(actorName(req), 'UPDATE_NIVEL_ATRIBUTO', 'nivel-atributo', attr.id, `Atributo "${attr.nombre}" actualizado.`);
  res.json(attr);
});

app.delete('/api/niveles-atributos/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const idx = db.nivelesAtributos.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Atributo no encontrado.' });
  const removed = db.nivelesAtributos[idx];
  db.nivelesAtributos.splice(idx, 1);
  db.nodosAtributosValores = db.nodosAtributosValores.filter(v => v.atributoId !== removed.id);
  logAudit(actorName(req), 'DELETE_NIVEL_ATRIBUTO', 'nivel-atributo', removed.id, `Atributo "${removed.nombre}" eliminado.`);
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

// --- Parámetros: Dispositivos Móviles -----------------------------------------
app.get('/api/param-dispositivos-moviles', requireAuth, (_req, res) => {
  res.json(db.dispositivosMoviles);
});

app.post('/api/param-dispositivos-moviles', requireAuth, requireGlobalAdmin, (req, res) => {
  const { codigo, estado } = req.body || {};
  if (!codigo) { res.status(400).json({ error: 'El código es obligatorio.' }); return; }
  if (db.dispositivosMoviles.some(d => d.codigo === codigo)) { res.status(400).json({ error: 'Ya existe un dispositivo con ese código.' }); return; }
  const dispositivo: DispositivoMovil = { id: newId('param_disp'), codigo, estado: estado || 'ACTIVO', createdAt: new Date().toISOString() };
  db.dispositivosMoviles.push(dispositivo);
  logAudit('api', 'CREATE', 'param-dispositivo-movil', dispositivo.id, `Dispositivo móvil ${dispositivo.codigo}`);
  res.status(201).json(dispositivo);
});

app.put('/api/param-dispositivos-moviles/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const dispositivo = db.dispositivosMoviles.find(d => d.id === req.params.id);
  if (!dispositivo) { res.status(404).json({ error: 'Dispositivo móvil no encontrado.' }); return; }
  const { codigo, estado } = req.body || {};
  if (codigo && db.dispositivosMoviles.some(d => d.id !== req.params.id && d.codigo === codigo)) { res.status(400).json({ error: 'Ya existe otro dispositivo con ese código.' }); return; }
  if (codigo) dispositivo.codigo = codigo;
  if (estado) dispositivo.estado = estado;
  logAudit('api', 'UPDATE', 'param-dispositivo-movil', dispositivo.id, `Dispositivo móvil ${dispositivo.codigo}`);
  res.json(dispositivo);
});

app.delete('/api/param-dispositivos-moviles/:id', requireAuth, requireGlobalAdmin, (req, res) => {
  const idx = db.dispositivosMoviles.findIndex(d => d.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: 'Dispositivo móvil no encontrado.' }); return; }
  const removed = db.dispositivosMoviles.splice(idx, 1)[0];
  logAudit('api', 'DELETE', 'param-dispositivo-movil', removed.id, `Dispositivo móvil ${removed.codigo}`);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[CAM] Backend escuchando en http://localhost:${PORT}`);
  console.log(`[CAM] LDAP URL: ${process.env.LDAP_URL || 'ldap://ldap:389'}`);
});
