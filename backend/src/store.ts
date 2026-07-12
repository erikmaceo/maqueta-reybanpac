// ===========================================================================
// Almacén en memoria (RAM). Toda la data vive en el proceso; al reiniciar el
// contenedor se vuelve a sembrar desde seed.ts. Solo para maqueta.
// ===========================================================================

import type {
  SystemApp,
  Permission,
  Role,
  User,
  AccessRequest,
  Grant,
  AuditEntry,
  Aplicacion,
  Modulo,
  Programa,
  Perfil,
  Control,
  NivelSegregacion,
  NodoSegregacion,
  Pais,
  Provincia,
  Ciudad,
} from './types.js';
import {
  systems as seedSystems,
  permissions as seedPermissions,
  roles as seedRoles,
  users as seedUsers,
  requests as seedRequests,
  grants as seedGrants,
  audit as seedAudit,
  aplicaciones as seedAplicaciones,
  modulos as seedModulos,
  programas as seedProgramas,
  perfiles as seedPerfiles,
  controles as seedControles,
  nivelesSegregacion as seedNivelesSegregacion,
  nodosSegregacion as seedNodosSegregacion,
  paises as seedPaises,
  provincias as seedProvincias,
  ciudades as seedCiudades,
} from './seed.js';

interface DB {
  systems: SystemApp[];
  permissions: Permission[];
  roles: Role[];
  users: User[];
  requests: AccessRequest[];
  grants: Grant[];
  audit: AuditEntry[];
  aplicaciones: Aplicacion[];
  modulos: Modulo[];
  programas: Programa[];
  perfiles: Perfil[];
  controles: Control[];
  nivelesSegregacion: NivelSegregacion[];
  nodosSegregacion: NodoSegregacion[];
  paises: Pais[];
  provincias: Provincia[];
  ciudades: Ciudad[];
}

// Clonado profundo para no mutar los arrays de seed (permite "reset").
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export const db: DB = {
  systems: clone(seedSystems),
  permissions: clone(seedPermissions),
  roles: clone(seedRoles),
  users: clone(seedUsers),
  requests: clone(seedRequests),
  grants: clone(seedGrants),
  audit: clone(seedAudit),
  aplicaciones: clone(seedAplicaciones),
  modulos: clone(seedModulos),
  programas: clone(seedProgramas),
  perfiles: clone(seedPerfiles),
  controles: clone(seedControles),
  nivelesSegregacion: clone(seedNivelesSegregacion),
  nodosSegregacion: clone(seedNodosSegregacion),
  paises: clone(seedPaises),
  provincias: clone(seedProvincias),
  ciudades: clone(seedCiudades),
};

export function resetDb() {
  db.systems = clone(seedSystems);
  db.permissions = clone(seedPermissions);
  db.roles = clone(seedRoles);
  db.users = clone(seedUsers);
  db.requests = clone(seedRequests);
  db.grants = clone(seedGrants);
  db.audit = clone(seedAudit);
  db.aplicaciones = clone(seedAplicaciones);
  db.modulos = clone(seedModulos);
  db.programas = clone(seedProgramas);
  db.perfiles = clone(seedPerfiles);
  db.controles = clone(seedControles);
  db.nivelesSegregacion = clone(seedNivelesSegregacion);
  db.nodosSegregacion = clone(seedNodosSegregacion);
  db.paises = clone(seedPaises);
  db.provincias = clone(seedProvincias);
  db.ciudades = clone(seedCiudades);
}

let counter = 1000;
export const newId = (prefix: string) => `${prefix}_${++counter}`;
export const nowIso = () => new Date().toISOString();

export function logAudit(
  actor: string,
  action: string,
  entityType: string,
  entityId: string | null,
  detail: string,
) {
  db.audit.unshift({
    id: newId('a'),
    timestamp: nowIso(),
    actor,
    action,
    entityType,
    entityId,
    detail,
  });
}

/** Quita el password antes de exponer un usuario por la API. */
export function publicUser(u: User) {
  const { password, ...rest } = u;
  return rest;
}
