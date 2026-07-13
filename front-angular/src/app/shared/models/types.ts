export type Environment = 'PROD' | 'PRE' | 'QAS' | 'DEV';
export type AccessLevel = 'VIEW' | 'EDIT' | 'ADMIN';
export type UserType = 'ADMIN' | 'CLIENTE_FINAL';
export type UserSource = 'LOCAL' | 'LDAP';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Aplicacion {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  estado: 'ACTIVO' | 'INACTIVO';
  createdAt: string;
}

export interface Modulo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  appCodigo: string;
  estado: 'ACTIVO' | 'INACTIVO';
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
  estado: 'ACTIVO' | 'INACTIVO';
  orden?: number;
  createdAt: string;
}

export type TipoControl = 'Caja de Texto' | 'Botón' | 'Check' | 'Combo' | 'Grid' | 'Option' | 'Otros';

export interface Control {
  id: string;
  prgCodigo: string;
  codigo: string;
  tipoControl: TipoControl;
  descripcion: string;
  estado: 'ACTIVO' | 'INACTIVO';
  log: 'ACTIVO' | 'INACTIVO';
  orden?: number;
  createdAt: string;
}

export interface PerfilProgramaControl {
  ctrlIndex: number;
  visualizar: boolean;
  modificar: boolean;
}

export interface PerfilPrograma {
  prgCodigo: string;
  nuevo: boolean;
  modificar: boolean;
  anular: boolean;
  procesar: boolean;
  imprimir: boolean;
  consultar: boolean;
  controles?: PerfilProgramaControl[];
}

export interface Perfil {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  programas: PerfilPrograma[];
  estado: 'ACTIVO' | 'INACTIVO';
  createdAt: string;
}

export interface NivelSegregacion {
  id: string;
  codigo: string;
  nombre: string;
  orden: number;
  estado: 'ACTIVO' | 'INACTIVO';
  createdAt: string;
}

export interface NodoSegregacion {
  id: string;
  codigo: string;
  nombre: string;
  nivelId: string;
  padreId: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
  createdAt: string;
}

export type TipoAtributo = 'texto' | 'numero' | 'telefono' | 'email' | 'select';

export interface NivelAtributoConfig {
  fuente?: string; // ej: 'paises', 'provincias', 'ciudades'
}

export interface NivelAtributo {
  id: string;
  nivelId: string;
  codigo: string;
  nombre: string;
  tipo: TipoAtributo;
  config?: NivelAtributoConfig;
  obligatorio: boolean;
  orden: number;
  estado: 'ACTIVO' | 'INACTIVO';
  createdAt: string;
}

export interface NodoAtributoValor {
  id: string;
  nodoId: string;
  atributoId: string;
  valor: string;
  createdAt: string;
}

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

export interface Permission {
  id: string;
  systemId: string;
  code: string;
  name: string;
  description: string;
  level: AccessLevel;
  category: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  systemId: string | null;
  permissionIds: string[];
  isAdmin: boolean;
  authorizerUserId: string | null;
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
  nodoIds: string[];
  perfilCodigos: string[];
  type: UserType;
  source: UserSource;
  status: UserStatus;
  roleIds: string[];
  createdAt: string;
  lastLogin: string | null;
  password?: string;
  isAdmin?: boolean;
}

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

export interface LdapPerson {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  cargo: string;
  department: string;
  dn: string;
  imported?: boolean;
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

// --- Parámetros y Configuración ------------------------------------------------
export interface Pais {
  id: string;
  codigo: string;
  descripcion: string;
  estado: 'ACTIVO' | 'INACTIVO';
  createdAt: string;
}

export interface Provincia {
  id: string;
  codigo: string;
  descripcion: string;
  paisId: string;
  paisDescripcion?: string;
  estado: 'ACTIVO' | 'INACTIVO';
  createdAt: string;
}

export interface Ciudad {
  id: string;
  codigo: string;
  descripcion: string;
  provinciaId: string;
  provinciaDescripcion?: string;
  paisId?: string;
  paisDescripcion?: string;
  estado: 'ACTIVO' | 'INACTIVO';
  createdAt: string;
}
