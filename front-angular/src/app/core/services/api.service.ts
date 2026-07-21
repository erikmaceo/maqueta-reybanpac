import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type {
  SystemApp, Permission, Role, User, AccessRequest, Grant, AuditEntry,
  LdapResponse, Stats,
  Aplicacion, Modulo, Programa, Perfil, Control,
  NivelSegregacion, NodoSegregacion, NivelAtributo, NodoAtributoValor,
  Pais, Provincia, Ciudad, DispositivoMovil,
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

  // --- Acceso por usuario ---
  listUserAccess(): Observable<User[]> {
    return this.request<User[]>('GET', '/user-access');
  }
  updateUserAccess(id: string, body: { nodoIds: string[]; perfilCodigos: string[] }): Observable<User> {
    return this.request<User>('PUT', `/user-access/${id}`, body);
  }
  bulkUpdateUserAccess(rows: { row: number; username: string; perfilCodigos: string[]; nodoCodigosPorNivelId: Record<string, string[]> }[]): Observable<{ ok: boolean; processed: number; errors: { row: number; message: string }[] }> {
    return this.request<{ ok: boolean; processed: number; errors: { row: number; message: string }[] }>('POST', '/user-access/bulk', { rows });
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
  bulkCreateAplicaciones(rows: { row: number; tipo: string; codigo: string; nombre: string; descripcion: string; appCodigo: string; modCodigo: string; prgTipo: string; estado: string }[]): Observable<{ ok: boolean; processed: number; created: { apps: number; mods: number; prgs: number }; updated: { apps: number; mods: number; prgs: number }; errors: { row: number; message: string }[] }> {
    return this.request<{ ok: boolean; processed: number; created: { apps: number; mods: number; prgs: number }; updated: { apps: number; mods: number; prgs: number }; errors: { row: number; message: string }[] }>('POST', '/seg-aplicaciones/bulk', { rows });
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
  reordenarModulos(orden: { id: string; orden: number }[]): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('PUT', '/seg-modulos/reordenar', { orden });
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
  reordenarProgramas(orden: { id: string; orden: number }[]): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('PUT', '/seg-programas/reordenar', { orden });
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
  bulkCreatePerfiles(rows: { row: number; perfilCodigo: string; perfilNombre: string; perfilDescripcion: string; prgCodigo: string; nuevo: string; modificar: string; anular: string; imprimir: string; consultar: string; estado: string }[]): Observable<{ ok: boolean; processed: number; created: number; updated: number; errors: { row: number; message: string }[] }> {
    return this.request<{ ok: boolean; processed: number; created: number; updated: number; errors: { row: number; message: string }[] }>('POST', '/seg-perfiles/bulk', { rows });
  }

  // --- Seguridades: Controles ---
  listControles(): Observable<Control[]> {
    return this.request<Control[]>('GET', '/seg-controles');
  }
  deleteControl(id: string): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('DELETE', `/seg-controles/${id}`);
  }
  reordenarControles(orden: { id: string; orden: number }[]): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('PUT', '/seg-controles/reordenar', { orden });
  }

  // --- Configuración: Niveles de Segregación ---
  listNivelesSegregacion(): Observable<NivelSegregacion[]> {
    return this.request<NivelSegregacion[]>('GET', '/niveles-segregacion');
  }
  createNivelSegregacion(body: Partial<NivelSegregacion>): Observable<NivelSegregacion> {
    return this.request<NivelSegregacion>('POST', '/niveles-segregacion', body);
  }
  updateNivelSegregacion(id: string, body: Partial<NivelSegregacion>): Observable<NivelSegregacion> {
    return this.request<NivelSegregacion>('PUT', `/niveles-segregacion/${id}`, body);
  }
  deleteNivelSegregacion(id: string): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('DELETE', `/niveles-segregacion/${id}`);
  }

  // --- Configuración: Nodos de Segregación ---
  listNodosSegregacion(): Observable<NodoSegregacion[]> {
    return this.request<NodoSegregacion[]>('GET', '/nodos-segregacion');
  }
  getArbolNodosSegregacion(): Observable<NodoSegregacion[]> {
    return this.request<NodoSegregacion[]>('GET', '/nodos-segregacion/arbol');
  }
  createNodoSegregacion(body: Partial<NodoSegregacion> & { atributos?: { atributoId: string; valor: string }[] }): Observable<NodoSegregacion> {
    return this.request<NodoSegregacion>('POST', '/nodos-segregacion', body);
  }
  updateNodoSegregacion(id: string, body: Partial<NodoSegregacion> & { atributos?: { atributoId: string; valor: string }[] }): Observable<NodoSegregacion> {
    return this.request<NodoSegregacion>('PUT', `/nodos-segregacion/${id}`, body);
  }
  deleteNodoSegregacion(id: string): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('DELETE', `/nodos-segregacion/${id}`);
  }
  bulkCreateNodos(rows: { row: number; nivel: string; codigo: string; nombre: string; padre: string; estado: string }[]): Observable<{ ok: boolean; processed: number; created: number; updated: number; errors: { row: number; message: string }[] }> {
    return this.request<{ ok: boolean; processed: number; created: number; updated: number; errors: { row: number; message: string }[] }>('POST', '/nodos-segregacion/bulk', { rows });
  }

  // --- Configuración: Valores de Atributos de Nodos ---
  listNodosAtributoValores(nodoId?: string): Observable<NodoAtributoValor[]> {
    const query = nodoId ? `?nodoId=${nodoId}` : '';
    return this.request<NodoAtributoValor[]>('GET', `/nodos-atributo-valor${query}`);
  }

  // --- Configuración: Atributos de Nivel ---
  listNivelesAtributos(nivelId?: string): Observable<NivelAtributo[]> {
    const query = nivelId ? `?nivelId=${nivelId}` : '';
    return this.request<NivelAtributo[]>('GET', `/niveles-atributos${query}`);
  }
  createNivelAtributo(body: Partial<NivelAtributo>): Observable<NivelAtributo> {
    return this.request<NivelAtributo>('POST', '/niveles-atributos', body);
  }
  updateNivelAtributo(id: string, body: Partial<NivelAtributo>): Observable<NivelAtributo> {
    return this.request<NivelAtributo>('PUT', `/niveles-atributos/${id}`, body);
  }
  deleteNivelAtributo(id: string): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('DELETE', `/niveles-atributos/${id}`);
  }

  // --- Parámetros: Países ---
  listPaises(): Observable<Pais[]> {
    return this.request<Pais[]>('GET', '/param-paises');
  }
  createPais(body: Partial<Pais>): Observable<Pais> {
    return this.request<Pais>('POST', '/param-paises', body);
  }
  updatePais(id: string, body: Partial<Pais>): Observable<Pais> {
    return this.request<Pais>('PUT', `/param-paises/${id}`, body);
  }
  deletePais(id: string): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('DELETE', `/param-paises/${id}`);
  }

  // --- Parámetros: Provincias ---
  listProvincias(): Observable<Provincia[]> {
    return this.request<Provincia[]>('GET', '/param-provincias');
  }
  listProvinciasPorPais(paisId: string): Observable<Provincia[]> {
    return this.request<Provincia[]>('GET', `/param-provincias?paisId=${paisId}`);
  }
  createProvincia(body: Partial<Provincia>): Observable<Provincia> {
    return this.request<Provincia>('POST', '/param-provincias', body);
  }
  updateProvincia(id: string, body: Partial<Provincia>): Observable<Provincia> {
    return this.request<Provincia>('PUT', `/param-provincias/${id}`, body);
  }
  deleteProvincia(id: string): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('DELETE', `/param-provincias/${id}`);
  }

  // --- Parámetros: Ciudades ---
  listCiudades(): Observable<Ciudad[]> {
    return this.request<Ciudad[]>('GET', '/param-ciudades');
  }
  listCiudadesPorProvincia(provinciaId: string): Observable<Ciudad[]> {
    return this.request<Ciudad[]>('GET', `/param-ciudades?provinciaId=${provinciaId}`);
  }
  createCiudad(body: Partial<Ciudad>): Observable<Ciudad> {
    return this.request<Ciudad>('POST', '/param-ciudades', body);
  }
  updateCiudad(id: string, body: Partial<Ciudad>): Observable<Ciudad> {
    return this.request<Ciudad>('PUT', `/param-ciudades/${id}`, body);
  }
  deleteCiudad(id: string): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('DELETE', `/param-ciudades/${id}`);
  }

  // --- Parámetros: Dispositivos Móviles ---
  listDispositivosMoviles(): Observable<DispositivoMovil[]> {
    return this.request<DispositivoMovil[]>('GET', '/param-dispositivos-moviles');
  }
  createDispositivoMovil(body: Partial<DispositivoMovil>): Observable<DispositivoMovil> {
    return this.request<DispositivoMovil>('POST', '/param-dispositivos-moviles', body);
  }
  updateDispositivoMovil(id: string, body: Partial<DispositivoMovil>): Observable<DispositivoMovil> {
    return this.request<DispositivoMovil>('PUT', `/param-dispositivos-moviles/${id}`, body);
  }
  deleteDispositivoMovil(id: string): Observable<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('DELETE', `/param-dispositivos-moviles/${id}`);
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
