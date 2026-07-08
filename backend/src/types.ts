// ===========================================================================
// Central Access Manager — Shared domain types
// (Kept in sync with frontend/src/types.ts — this is the API contract)
// ===========================================================================

export type Environment = 'PROD' | 'PRE' | 'QAS' | 'DEV';

/** Niveles de acceso, alineados con la matriz Admin / Edit / View. */
export type AccessLevel = 'VIEW' | 'EDIT' | 'ADMIN';

// --- Seguridades -----------------------------------------------------------
export type SegEstado = 'ACTIVO' | 'INACTIVO';

export interface Aplicacion {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  estado: SegEstado;
  createdAt: string;
}

export interface Modulo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  appCodigo: string;
  estado: SegEstado;
  orden?: number;
  createdAt: string;
}

export type TipoPrograma = 'Menú' | 'Submenú' | 'Maestro' | 'Transacción' | 'Proceso' | 'Consulta' | 'Reporte' | 'Objeto';

export interface Programa {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  modCodigo: string;
  tipo: TipoPrograma;
  estado: SegEstado;
  orden?: number;
  createdAt: string;
}

export type TipoControl = 'Caja de Texto' | 'Botón' | 'Check' | 'Combo' | 'Grid' | 'Option' | 'Otros';

export interface Control {
  id: string;
  prgCodigo: string;
  tipoControl: TipoControl;
  descripcion: string;
  estado: SegEstado;
  log: SegEstado;
  createdAt: string;
}

export interface PerfilPrograma {
  prgCodigo: string;
  nuevo: boolean;
  modificar: boolean;
  anular: boolean;
  procesar: boolean;
  imprimir: boolean;
  consultar: boolean;
}

export interface Perfil {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  programas: PerfilPrograma[];
  estado: SegEstado;
  createdAt: string;
}

export type UserType = 'ADMIN' | 'CLIENTE_FINAL';
export type UserSource = 'LOCAL' | 'LDAP';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Un sistema / aplicativo gobernado por la consola (p.ej. KS8, SAP, RPA). */
export interface SystemApp {
  id: string;
  code: string;
  name: string;
  description: string;
  environment: Environment;
  ownerName: string;
  color: string;
  createdAt: string;
}

/** Un acceso/permiso concreto que puede otorgar un sistema. */
export interface Permission {
  id: string;
  systemId: string;
  code: string;
  name: string;
  description: string;
  level: AccessLevel;
  category: string;
}

/** Un rol agrupa accesos de uno o varios sistemas. */
export interface Role {
  id: string;
  name: string;
  description: string;
  systemId: string | null; // null => rol transversal (p.ej. Administrador Global)
  permissionIds: string[];
  isAdmin: boolean; // rol administrador con acceso completo
  authorizerUserId: string | null; // Dueño Técnico (autorizador) del rol
  color: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  cargo: string;
  department: string;
  company: string;
  empresaCodigo: string;
  perfilCodigos: string[];
  type: UserType;
  source: UserSource;
  status: UserStatus;
  roleIds: string[];
  createdAt: string;
  lastLogin: string | null;
  password?: string;
}

/** Solicitud de acceso que pasa por el módulo autorizador. */
export interface AccessRequest {
  id: string;
  userId: string;
  roleId: string;
  systemId: string | null;
  justification: string;
  status: RequestStatus;
  requestedByUserId: string;
  createdAt: string;
  decidedByUserId: string | null;
  decidedAt: string | null;
  decisionComment: string | null;
}

/** Acceso efectivo (vigente) tras aprobación. */
export interface Grant {
  id: string;
  userId: string;
  roleId: string;
  systemId: string | null;
  grantedAt: string;
  requestId: string | null;
  authorizedByUserId: string | null;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string | null;
  detail: string;
}

export interface AuthUser extends Omit<User, 'password'> {}

// --- Configuración ----------------------------------------------------------
export interface Empresa {
  id: string;
  codigo: string;
  nombre: string;
  razonSocial: string;
  ruc: string;
  direccion: string;
  telefono: string;
  email: string;
  paginaWeb: string;
  customFields: string[];
  logo: string;
  paisId: string;
  paisDescripcion: string;
  provinciaId: string;
  provinciaDescripcion: string;
  ciudadId: string;
  ciudadDescripcion: string;
  estado: SegEstado;
  createdAt: string;
}

export interface Sucursal {
  id: string;
  codigo: string;
  nombre: string;
  empresaCodigo: string;
  direccion: string;
  telefono: string;
  estado: SegEstado;
  createdAt: string;
}

export interface PuntoVenta {
  id: string;
  codigo: string;
  nombre: string;
  sucursalCodigo: string;
  direccion: string;
  estado: SegEstado;
  createdAt: string;
}

// --- Parámetros y Configuración -----------------------------------------------
export interface Pais {
  id: string;
  codigo: string;
  descripcion: string;
  estado: SegEstado;
  createdAt: string;
}

export interface Provincia {
  id: string;
  codigo: string;
  descripcion: string;
  paisId: string;
  paisDescripcion: string;
  estado: SegEstado;
  createdAt: string;
}

export interface Ciudad {
  id: string;
  codigo: string;
  descripcion: string;
  provinciaId: string;
  provinciaDescripcion: string;
  paisId: string;
  paisDescripcion: string;
  estado: SegEstado;
  createdAt: string;
}

// --- Contratos LDAP / Stats (espejo de frontend/src/types.ts) --------------
export interface LdapPerson {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  cargo: string;
  department: string;
  dn: string;
  imported?: boolean; // derivado: solo presente en GET /api/ldap/users
}

export interface LdapResponse {
  source: 'LDAP' | 'FALLBACK';
  message: string;
  people: LdapPerson[];
}

export interface Stats {
  systems: number;
  roles: number;
  users: number;
  localUsers: number;
  ldapUsers: number;
  permissions: number;
  grants: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  usersByType: { ADMIN: number; CLIENTE_FINAL: number };
  rolesPerSystem: { systemId: string; code: string; name: string; color: string; roles: number }[];
  recentAudit: AuditEntry[];
}
