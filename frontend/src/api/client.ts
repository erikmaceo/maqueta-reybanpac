// Cliente HTTP minimalista para la API del Central Access Manager.

import type {
  SystemApp, Permission, Role, User, AccessRequest, Grant, AuditEntry,
  LdapResponse, Stats,
} from '../types';

const TOKEN_KEY = 'cam.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as any)?.error || `Error ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('POST', '/auth/login', { username, password }),
  logout: () => request<{ ok: boolean }>('POST', '/auth/logout'),
  me: () => request<User>('GET', '/auth/me'),

  // Stats
  stats: () => request<Stats>('GET', '/stats'),

  // Systems
  listSystems: () => request<SystemApp[]>('GET', '/systems'),
  createSystem: (b: Partial<SystemApp>) => request<SystemApp>('POST', '/systems', b),
  updateSystem: (id: string, b: Partial<SystemApp>) => request<SystemApp>('PUT', `/systems/${id}`, b),
  deleteSystem: (id: string) => request<{ ok: boolean }>('DELETE', `/systems/${id}`),

  // Permissions
  listPermissions: (systemId?: string) =>
    request<Permission[]>('GET', `/permissions${systemId ? `?systemId=${systemId}` : ''}`),
  createPermission: (b: Partial<Permission>) => request<Permission>('POST', '/permissions', b),

  // Roles
  listRoles: () => request<Role[]>('GET', '/roles'),
  createRole: (b: Partial<Role>) => request<Role>('POST', '/roles', b),
  updateRole: (id: string, b: Partial<Role>) => request<Role>('PUT', `/roles/${id}`, b),
  deleteRole: (id: string) => request<{ ok: boolean }>('DELETE', `/roles/${id}`),

  // Users
  listUsers: (q?: { type?: string; source?: string }) => {
    const params = new URLSearchParams(q as Record<string, string>).toString();
    return request<User[]>('GET', `/users${params ? `?${params}` : ''}`);
  },
  createUser: (b: Partial<User> & { password?: string }) => request<User>('POST', '/users', b),
  updateUser: (id: string, b: Partial<User> & { password?: string }) => request<User>('PUT', `/users/${id}`, b),
  deleteUser: (id: string) => request<{ ok: boolean }>('DELETE', `/users/${id}`),
  setUserRoles: (id: string, roleIds: string[]) =>
    request<User>('PUT', `/users/${id}/roles`, { roleIds }),

  // LDAP
  ldapUsers: () => request<LdapResponse>('GET', '/ldap/users'),
  importLdap: (username: string, roleIds: string[]) =>
    request<User>('POST', '/ldap/import', { username, roleIds }),

  // Requests (autorizador)
  listRequests: (status?: string) =>
    request<AccessRequest[]>('GET', `/requests${status ? `?status=${status}` : ''}`),
  createRequest: (b: { userId: string; roleId: string; justification: string }) =>
    request<AccessRequest>('POST', '/requests', b),
  approveRequest: (id: string, comment: string) =>
    request<{ request: AccessRequest; grant: Grant }>('POST', `/requests/${id}/approve`, { comment }),
  rejectRequest: (id: string, comment: string) =>
    request<AccessRequest>('POST', `/requests/${id}/reject`, { comment }),

  // Grants
  listGrants: () => request<Grant[]>('GET', '/grants'),
  revokeGrant: (id: string) => request<{ ok: boolean }>('DELETE', `/grants/${id}`),

  // Audit
  listAudit: () => request<AuditEntry[]>('GET', '/audit'),

  // Maqueta
  reset: () => request<{ ok: boolean }>('POST', '/admin/reset'),
};
