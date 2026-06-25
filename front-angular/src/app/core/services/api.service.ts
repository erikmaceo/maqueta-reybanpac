import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type {
  SystemApp, Permission, Role, User, AccessRequest, Grant, AuditEntry,
  LdapResponse, Stats,
  Aplicacion, Modulo, Programa, Perfil, Control,
} from '../../shared/models/types';

const TOKEN_KEY = 'cam.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = '/api';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = tokenStore.get();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return new HttpHeaders(headers);
  }

  private request<T>(method: string, path: string, body?: unknown): Observable<T> {
    const url = `${this.baseUrl}${path}`;
    const options = {
      headers: this.getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };

    let observable: Observable<T>;
    switch (method.toUpperCase()) {
      case 'GET':
        observable = this.http.get<T>(url, { headers: this.getHeaders() });
        break;
      case 'POST':
        observable = this.http.post<T>(url, body, { headers: this.getHeaders() });
        break;
      case 'PUT':
        observable = this.http.put<T>(url, body, { headers: this.getHeaders() });
        break;
      case 'DELETE':
        observable = this.http.delete<T>(url, { headers: this.getHeaders() });
        break;
      default:
        throw new Error(`Unknown method: ${method}`);
    }
    return observable;
  }

  login(username: string, password: string): Observable<{ token: string; user: User }> {
    return this.request<{ token: string; user: User }>('POST', '/auth/login', { username, password });
  }

  logout(): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('POST', '/auth/logout');
  }

  me(): Observable<User> {
    return this.request<User>('GET', '/auth/me');
  }

  stats(): Observable<Stats> {
    return this.request<Stats>('GET', '/stats');
  }

  listSystems(): Observable<SystemApp[]> {
    return this.request<SystemApp[]>('GET', '/systems');
  }

  createSystem(body: Partial<SystemApp>): Observable<SystemApp> {
    return this.request<SystemApp>('POST', '/systems', body);
  }

  updateSystem(id: string, body: Partial<SystemApp>): Observable<SystemApp> {
    return this.request<SystemApp>('PUT', `/systems/${id}`, body);
  }

  deleteSystem(id: string): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('DELETE', `/systems/${id}`);
  }

  listPermissions(systemId?: string): Observable<Permission[]> {
    const query = systemId ? `?systemId=${systemId}` : '';
    return this.request<Permission[]>('GET', `/permissions${query}`);
  }

  createPermission(body: Partial<Permission>): Observable<Permission> {
    return this.request<Permission>('POST', '/permissions', body);
  }

  listRoles(): Observable<Role[]> {
    return this.request<Role[]>('GET', '/roles');
  }

  createRole(body: Partial<Role>): Observable<Role> {
    return this.request<Role>('POST', '/roles', body);
  }

  updateRole(id: string, body: Partial<Role>): Observable<Role> {
    return this.request<Role>('PUT', `/roles/${id}`, body);
  }

  deleteRole(id: string): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('DELETE', `/roles/${id}`);
  }

  listUsers(q?: { type?: string; source?: string }): Observable<User[]> {
    const params = q ? '?' + new URLSearchParams(q as Record<string, string>).toString() : '';
    return this.request<User[]>('GET', `/users${params}`);
  }

  createUser(body: Partial<User> & { password?: string }): Observable<User> {
    return this.request<User>('POST', '/users', body);
  }

  updateUser(id: string, body: Partial<User> & { password?: string }): Observable<User> {
    return this.request<User>('PUT', `/users/${id}`, body);
  }

  deleteUser(id: string): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('DELETE', `/users/${id}`);
  }

  setUserRoles(id: string, roleIds: string[]): Observable<User> {
    return this.request<User>('PUT', `/users/${id}/roles`, { roleIds });
  }

  ldapUsers(): Observable<LdapResponse> {
    return this.request<LdapResponse>('GET', '/ldap/users');
  }

  importLdap(username: string, roleIds: string[]): Observable<User> {
    return this.request<User>('POST', '/ldap/import', { username, roleIds });
  }

  listRequests(status?: string): Observable<AccessRequest[]> {
    const query = status ? `?status=${status}` : '';
    return this.request<AccessRequest[]>('GET', `/requests${query}`);
  }

  createRequest(body: { userId: string; roleId: string; justification: string }): Observable<AccessRequest> {
    return this.request<AccessRequest>('POST', '/requests', body);
  }

  approveRequest(id: string, comment: string): Observable<{ request: AccessRequest; grant: Grant }> {
    return this.request<{ request: AccessRequest; grant: Grant }>('POST', `/requests/${id}/approve`, { comment });
  }

  rejectRequest(id: string, comment: string): Observable<AccessRequest> {
    return this.request<AccessRequest>('POST', `/requests/${id}/reject`, { comment });
  }

  listGrants(): Observable<Grant[]> {
    return this.request<Grant[]>('GET', '/grants');
  }

  revokeGrant(id: string): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('DELETE', `/grants/${id}`);
  }

  listAudit(): Observable<AuditEntry[]> {
    return this.request<AuditEntry[]>('GET', '/audit');
  }

  reset(): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('POST', '/admin/reset');
  }

  // --- Seguridades: Aplicaciones ---
  listAplicaciones(): Observable<Aplicacion[]> {
    return this.request<Aplicacion[]>('GET', '/seg-aplicaciones');
  }
  createAplicacion(body: Partial<Aplicacion>): Observable<Aplicacion> {
    return this.request<Aplicacion>('POST', '/seg-aplicaciones', body);
  }
  updateAplicacion(id: string, body: Partial<Aplicacion>): Observable<Aplicacion> {
    return this.request<Aplicacion>('PUT', `/seg-aplicaciones/${id}`, body);
  }
  deleteAplicacion(id: string): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('DELETE', `/seg-aplicaciones/${id}`);
  }

  // --- Seguridades: Modulos ---
  listModulos(): Observable<Modulo[]> {
    return this.request<Modulo[]>('GET', '/seg-modulos');
  }
  createModulo(body: Partial<Modulo>): Observable<Modulo> {
    return this.request<Modulo>('POST', '/seg-modulos', body);
  }
  updateModulo(id: string, body: Partial<Modulo>): Observable<Modulo> {
    return this.request<Modulo>('PUT', `/seg-modulos/${id}`, body);
  }
  deleteModulo(id: string): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('DELETE', `/seg-modulos/${id}`);
  }

  // --- Seguridades: Programas ---
  listProgramas(): Observable<Programa[]> {
    return this.request<Programa[]>('GET', '/seg-programas');
  }
  createPrograma(body: Partial<Programa>): Observable<Programa> {
    return this.request<Programa>('POST', '/seg-programas', body);
  }
  updatePrograma(id: string, body: Partial<Programa>): Observable<Programa> {
    return this.request<Programa>('PUT', `/seg-programas/${id}`, body);
  }
  deletePrograma(id: string): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('DELETE', `/seg-programas/${id}`);
  }

  // --- Seguridades: Perfiles ---
  listPerfiles(): Observable<Perfil[]> {
    return this.request<Perfil[]>('GET', '/seg-perfiles');
  }
  createPerfil(body: Partial<Perfil>): Observable<Perfil> {
    return this.request<Perfil>('POST', '/seg-perfiles', body);
  }
  updatePerfil(id: string, body: Partial<Perfil>): Observable<Perfil> {
    return this.request<Perfil>('PUT', `/seg-perfiles/${id}`, body);
  }
  deletePerfil(id: string): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('DELETE', `/seg-perfiles/${id}`);
  }

  // --- Seguridades: Controles ---
  listControles(): Observable<Control[]> {
    return this.request<Control[]>('GET', '/seg-controles');
  }
  deleteControl(id: string): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('DELETE', `/seg-controles/${id}`);
  }

  uploadMatriz(file: File): Observable<{ ok: boolean; summary: string }> {
    const url = `${this.baseUrl}/seg-matriz/upload`;
    const token = tokenStore.get();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.post<{ ok: boolean; summary: string }>(url, fd, { headers: new HttpHeaders(headers) });
  }
}
