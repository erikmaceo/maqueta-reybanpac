// Tipos del dominio — espejo de backend/src/types.ts (contrato de la API).

export type Environment = 'PROD' | 'PRE' | 'QAS' | 'DEV';
export type AccessLevel = 'VIEW' | 'EDIT' | 'ADMIN';
export type UserType = 'ADMIN' | 'CLIENTE_FINAL';
export type UserSource = 'LOCAL' | 'LDAP';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

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
  type: UserType;
  source: UserSource;
  status: UserStatus;
  roleIds: string[];
  createdAt: string;
  lastLogin: string | null;
  // solo-escritura (alta/edición de administrador LOCAL); el backend nunca lo devuelve
  password?: string;
  // derivado por el backend en /auth/login y /auth/me (administrador global)
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
