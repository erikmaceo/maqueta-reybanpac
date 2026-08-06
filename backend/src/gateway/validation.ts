// ===========================================================================
// API Gateway — Runtime authorization validation logic
// ===========================================================================

import { db } from '../store.js';
import type { User, Perfil, NodoSegregacion } from '../types.js';

export interface ValidationResult {
  allowed: boolean;
  username: string;
  motivo: string;
  requestedAt: string;
  details?: Record<string, unknown>;
}

export function findActiveUser(username: string): User | null {
  const user = db.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.status === 'ACTIVE',
  );
  return user || null;
}

export function findActivePerfil(codigo: string): Perfil | null {
  const perfil = db.perfiles.find(
    (p) => p.codigo.toLowerCase() === codigo.toLowerCase() && p.estado === 'ACTIVO',
  );
  return perfil || null;
}

export function findNodoByCodigo(codigo: string): NodoSegregacion | null {
  return db.nodosSegregacion.find((n) => n.codigo.toLowerCase() === codigo.toLowerCase()) || null;
}

export function isNodoAllowedForUser(user: User, nodoCodigo: string): boolean {
  const nodo = findNodoByCodigo(nodoCodigo);
  if (!nodo) return false;
  // Direct assignment
  if (user.nodoIds.includes(nodo.id)) return true;
  // Check ancestors: if the user has access to a parent node, descendants are implicitly allowed.
  let current: NodoSegregacion | undefined = nodo;
  while (current?.padreId) {
    const padre = db.nodosSegregacion.find((n) => n.id === current!.padreId);
    if (!padre) break;
    if (user.nodoIds.includes(padre.id)) return true;
    current = padre;
  }
  return false;
}

export function validatePerfilForUser(
  username: string,
  perfilCodigo: string,
  nodoCodigo?: string,
): ValidationResult {
  const now = new Date().toISOString();
  const user = findActiveUser(username);
  if (!user) {
    return { allowed: false, username, motivo: 'Usuario no encontrado o inactivo.', requestedAt: now };
  }
  const perfil = findActivePerfil(perfilCodigo);
  if (!perfil) {
    return { allowed: false, username, motivo: 'Perfil no encontrado o inactivo.', requestedAt: now };
  }
  if (!user.perfilCodigos.some((c) => c.toLowerCase() === perfilCodigo.toLowerCase())) {
    return { allowed: false, username, motivo: 'Usuario no tiene el perfil asignado.', requestedAt: now };
  }
  if (nodoCodigo && !isNodoAllowedForUser(user, nodoCodigo)) {
    return {
      allowed: false,
      username,
      motivo: 'Usuario no tiene acceso al nodo de segregación solicitado.',
      requestedAt: now,
    };
  }
  return {
    allowed: true,
    username,
    motivo: nodoCodigo
      ? 'Usuario tiene el perfil asignado y acceso al nodo solicitado.'
      : 'Usuario tiene el perfil asignado.',
    requestedAt: now,
    details: { perfilCodigo, nodoCodigo: nodoCodigo || null },
  };
}

export function validateProgramaForUser(
  username: string,
  programaCodigo: string,
  nodoCodigo?: string,
): ValidationResult {
  const now = new Date().toISOString();
  const user = findActiveUser(username);
  if (!user) {
    return { allowed: false, username, motivo: 'Usuario no encontrado o inactivo.', requestedAt: now };
  }
  const programa = db.programas.find((p) => p.codigo.toLowerCase() === programaCodigo.toLowerCase() && p.estado === 'ACTIVO');
  if (!programa) {
    return { allowed: false, username, motivo: 'Programa no encontrado o inactivo.', requestedAt: now };
  }
  const perfilCodigo = user.perfilCodigos.find((pc) => {
    const perfil = findActivePerfil(pc);
    if (!perfil) return false;
    return perfil.programas.some((pp) => pp.prgCodigo.toLowerCase() === programaCodigo.toLowerCase());
  });
  if (!perfilCodigo) {
    return {
      allowed: false,
      username,
      motivo: 'Ninguno de los perfiles del usuario incluye el programa solicitado.',
      requestedAt: now,
    };
  }
  if (nodoCodigo && !isNodoAllowedForUser(user, nodoCodigo)) {
    return {
      allowed: false,
      username,
      motivo: 'Usuario no tiene acceso al nodo de segregación solicitado.',
      requestedAt: now,
    };
  }
  return {
    allowed: true,
    username,
    motivo: 'Usuario tiene un perfil que incluye el programa y acceso al nodo (si aplica).',
    requestedAt: now,
    details: { programaCodigo, perfilCodigo, nodoCodigo: nodoCodigo || null },
  };
}

export function validateRolForUser(username: string, rolId: string): ValidationResult {
  const now = new Date().toISOString();
  const user = findActiveUser(username);
  if (!user) {
    return { allowed: false, username, motivo: 'Usuario no encontrado o inactivo.', requestedAt: now };
  }
  const role = db.roles.find((r) => r.id === rolId);
  if (!role) {
    return { allowed: false, username, motivo: 'Rol no encontrado.', requestedAt: now };
  }
  const hasRole = user.roleIds.includes(rolId) || db.grants.some((g) => g.userId === user.id && g.roleId === rolId);
  if (!hasRole) {
    return { allowed: false, username, motivo: 'Usuario no tiene el rol asignado ni un grant vigente.', requestedAt: now };
  }
  return {
    allowed: true,
    username,
    motivo: 'Usuario tiene el rol asignado o un grant vigente.',
    requestedAt: now,
    details: { rolId, rolName: role.name },
  };
}
