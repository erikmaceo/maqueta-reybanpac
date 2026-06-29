// ===========================================================================
// Datos de ejemplo (maqueta) — derivados de la "MATRIZ DE CREACIÓN DE GRUPOS"
// de Reybanpac / Favorita Fruit Company.
//   - Grupos KS8-DEV-Admin / Edit / View  ->  Roles con niveles Admin/Edit/View
//   - Dueño Técnico (DT) de cada grupo    ->  Autorizador del rol
//   - Usuarios cliente final              ->  provienen de LDAP
//   - Usuarios administradores            ->  creados localmente en la consola
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
} from './types.js';

const now = new Date();
const iso = (daysAgo: number) =>
  new Date(now.getTime() - daysAgo * 86400000).toISOString();

// --- Sistemas / aplicativos ------------------------------------------------
export const systems: SystemApp[] = [
  {
    id: 'sys_ks8',
    code: 'KS8',
    name: 'Kubernetes KS8',
    description:
      'Clúster Kubernetes KS8 (entorno No Productivo / Desarrollo). Gobernado por grupos de seguridad KS8-DEV-*.',
    environment: 'DEV',
    ownerName: 'Cristóbal Tudela',
    color: '#2563eb',
    createdAt: iso(120),
  },
  {
    id: 'sys_cubolac',
    code: 'RPA-CUBOLAC',
    name: 'RPA Cubolac',
    description:
      'Plataforma de automatización robótica de procesos (RPA) Cubolac.',
    environment: 'PROD',
    ownerName: 'Lázaro Diaz',
    color: '#7c3aed',
    createdAt: iso(110),
  },
  {
    id: 'sys_sap',
    code: 'SAP-ERP',
    name: 'SAP ERP',
    description: 'SAP ERP Reybanpac — Finanzas, Compras y Logística.',
    environment: 'PROD',
    ownerName: 'María Fernanda Vélez',
    color: '#0d9488',
    createdAt: iso(300),
  },
  {
    id: 'sys_ad',
    code: 'AD-CORP',
    name: 'Directorio Corporativo',
    description: 'Active Directory / LDAP corporativo (dc=reybanpac,dc=com).',
    environment: 'PROD',
    ownerName: 'Osniel Torres',
    color: '#d97706',
    createdAt: iso(420),
  },
];

// --- Permisos / accesos por sistema ----------------------------------------
const perm = (
  id: string,
  systemId: string,
  code: string,
  name: string,
  description: string,
  level: Permission['level'],
  category: string,
): Permission => ({ id, systemId, code, name, description, level, category });

export const permissions: Permission[] = [
  // KS8
  perm('p_ks8_view_pods', 'sys_ks8', 'ks8.pods.view', 'Ver pods y servicios', 'Consultar el estado de pods, deployments y servicios.', 'VIEW', 'Observabilidad'),
  perm('p_ks8_view_logs', 'sys_ks8', 'ks8.logs.read', 'Leer logs', 'Acceso de lectura a logs de contenedores.', 'VIEW', 'Observabilidad'),
  perm('p_ks8_edit_deploy', 'sys_ks8', 'ks8.deploy.edit', 'Editar deployments', 'Crear y modificar deployments y configmaps.', 'EDIT', 'Despliegue'),
  perm('p_ks8_edit_scale', 'sys_ks8', 'ks8.scale', 'Escalar workloads', 'Escalar réplicas de workloads.', 'EDIT', 'Despliegue'),
  perm('p_ks8_admin_secrets', 'sys_ks8', 'ks8.secrets.admin', 'Administrar secrets', 'Gestión completa de secrets y credenciales.', 'ADMIN', 'Seguridad'),
  perm('p_ks8_admin_rbac', 'sys_ks8', 'ks8.rbac.admin', 'Administrar RBAC', 'Gestión de roles y bindings del clúster.', 'ADMIN', 'Seguridad'),

  // RPA Cubolac
  perm('p_rpa_view', 'sys_cubolac', 'rpa.exec.view', 'Ver ejecuciones', 'Monitorear ejecuciones de bots.', 'VIEW', 'Operación'),
  perm('p_rpa_run', 'sys_cubolac', 'rpa.bot.run', 'Ejecutar bots', 'Lanzar y detener procesos automatizados.', 'EDIT', 'Operación'),
  perm('p_rpa_admin', 'sys_cubolac', 'rpa.studio.admin', 'Administrar studio', 'Diseñar y publicar nuevos procesos RPA.', 'ADMIN', 'Desarrollo'),

  // SAP
  perm('p_sap_fi_view', 'sys_sap', 'sap.fi.display', 'Consultar Finanzas (FI)', 'Visualización de documentos contables.', 'VIEW', 'Finanzas'),
  perm('p_sap_mm_post', 'sys_sap', 'sap.mm.post', 'Registrar Compras (MM)', 'Crear y registrar pedidos de compra.', 'EDIT', 'Compras'),
  perm('p_sap_basis', 'sys_sap', 'sap.basis.admin', 'Administrar Basis', 'Administración técnica de la plataforma SAP.', 'ADMIN', 'Plataforma'),

  // AD
  perm('p_ad_view', 'sys_ad', 'ad.dir.read', 'Consultar directorio', 'Lectura de usuarios y grupos del directorio.', 'VIEW', 'Directorio'),
  perm('p_ad_manage', 'sys_ad', 'ad.group.manage', 'Gestionar grupos', 'Alta/baja de miembros en grupos de seguridad.', 'EDIT', 'Directorio'),
];

// --- Usuarios --------------------------------------------------------------
// Administradores: creados localmente en la consola (source LOCAL).
// Clientes finales: provienen exclusivamente de LDAP (source LDAP).
const mkUser = (u: Partial<User> & Pick<User, 'id' | 'username' | 'firstName' | 'lastName' | 'type' | 'source'>): User => ({
  email: `${u.username}@reybanpac.com`,
  cargo: '',
  department: '',
  company: 'Reybanpac',
  status: 'ACTIVE',
  roleIds: [],
  createdAt: iso(90),
  lastLogin: null,
  ...u,
});

export const users: User[] = [
  mkUser({
    id: 'u_admin',
    username: 'ctudela',
    firstName: 'Cristóbal',
    lastName: 'Tudela',
    cargo: 'DevOps / Dueño Técnico',
    department: 'Desarrollo',
    type: 'ADMIN',
    source: 'LOCAL',
    password: 'admin123',
    roleIds: ['r_global_admin'],
    lastLogin: iso(0),
  }),
  mkUser({
    id: 'u_ldiaz',
    username: 'ldiaz',
    firstName: 'Lázaro',
    lastName: 'Diaz',
    cargo: 'Líder de Automatización',
    department: 'Desarrollo',
    type: 'ADMIN',
    source: 'LOCAL',
    password: 'admin123',
    roleIds: ['r_ks8_edit'],
  }),
  // Clientes finales — provienen de LDAP (espejo de ldap/bootstrap.ldif)
  mkUser({
    id: 'u_grobles',
    username: 'grobles',
    firstName: 'Geovanny',
    lastName: 'Robles',
    cargo: 'Analista Desarrollo',
    department: 'Desarrollo',
    type: 'CLIENTE_FINAL',
    source: 'LDAP',
    roleIds: ['r_ks8_view'],
  }),
  // Osniel Torres es Dueño Técnico (autorizador) del grupo View, por lo que es
  // un administrador local capaz de iniciar sesión y resolver solicitudes.
  mkUser({
    id: 'u_otorres',
    username: 'otorres',
    firstName: 'Osniel',
    lastName: 'Torres',
    cargo: 'Administrador de Sistemas / Dueño Técnico',
    department: 'Infraestructura',
    type: 'ADMIN',
    source: 'LOCAL',
    password: 'admin123',
    roleIds: ['r_ks8_view'],
  }),
  mkUser({
    id: 'u_mvelez',
    username: 'mvelez',
    firstName: 'María Fernanda',
    lastName: 'Vélez',
    cargo: 'Analista Financiero',
    department: 'Finanzas',
    type: 'CLIENTE_FINAL',
    source: 'LDAP',
    roleIds: [],
  }),
];

// --- Roles -----------------------------------------------------------------
export const roles: Role[] = [
  {
    id: 'r_global_admin',
    name: 'Administrador Global',
    description:
      'Rol administrador con acceso completo a todos los sistemas y a la consola de gestión.',
    systemId: null,
    permissionIds: permissions.map((p) => p.id),
    isAdmin: true,
    authorizerUserId: 'u_admin',
    color: '#dc2626',
    createdAt: iso(120),
  },
  {
    id: 'r_ks8_admin',
    name: 'KS8 DEV — Admin',
    description: 'Grupo administrador KS8 NPD DV. Acceso total al clúster de desarrollo.',
    systemId: 'sys_ks8',
    permissionIds: ['p_ks8_view_pods', 'p_ks8_view_logs', 'p_ks8_edit_deploy', 'p_ks8_edit_scale', 'p_ks8_admin_secrets', 'p_ks8_admin_rbac'],
    isAdmin: false,
    authorizerUserId: 'u_admin', // DT Cristóbal Tudela
    color: '#2563eb',
    createdAt: iso(118),
  },
  {
    id: 'r_ks8_edit',
    name: 'KS8 DEV — Edit',
    description: 'Grupo EDIT KS8 NPD DV. Permite desplegar y modificar workloads.',
    systemId: 'sys_ks8',
    permissionIds: ['p_ks8_view_pods', 'p_ks8_view_logs', 'p_ks8_edit_deploy', 'p_ks8_edit_scale'],
    isAdmin: false,
    authorizerUserId: 'u_ldiaz', // DT Lázaro Diaz
    color: '#0891b2',
    createdAt: iso(116),
  },
  {
    id: 'r_ks8_view',
    name: 'KS8 DEV — View',
    description: 'Grupo VIEW KS8 NPD DV. Acceso de solo lectura al clúster.',
    systemId: 'sys_ks8',
    permissionIds: ['p_ks8_view_pods', 'p_ks8_view_logs'],
    isAdmin: false,
    authorizerUserId: 'u_otorres', // DT Osniel Torres
    color: '#0d9488',
    createdAt: iso(116),
  },
  {
    id: 'r_sap_fi',
    name: 'SAP Finanzas — Consulta',
    description: 'Visualización de información financiera en SAP.',
    systemId: 'sys_sap',
    permissionIds: ['p_sap_fi_view'],
    isAdmin: false,
    authorizerUserId: 'u_admin',
    color: '#0d9488',
    createdAt: iso(80),
  },
  {
    id: 'r_rpa_op',
    name: 'RPA Operador',
    description: 'Operación diaria de bots en RPA Cubolac.',
    systemId: 'sys_cubolac',
    permissionIds: ['p_rpa_view', 'p_rpa_run'],
    isAdmin: false,
    authorizerUserId: 'u_ldiaz',
    color: '#7c3aed',
    createdAt: iso(70),
  },
];

// --- Solicitudes de acceso (módulo autorizador) ----------------------------
export const requests: AccessRequest[] = [
  {
    id: 'req_1',
    userId: 'u_mvelez',
    roleId: 'r_sap_fi',
    systemId: 'sys_sap',
    justification: 'Requiere consultar reportes financieros para el cierre mensual.',
    status: 'PENDING',
    requestedByUserId: 'u_admin',
    createdAt: iso(2),
    decidedByUserId: null,
    decidedAt: null,
    decisionComment: null,
  },
  {
    id: 'req_2',
    userId: 'u_grobles',
    roleId: 'r_ks8_edit',
    systemId: 'sys_ks8',
    justification: 'Necesita desplegar microservicios en el entorno de desarrollo.',
    status: 'PENDING',
    requestedByUserId: 'u_admin',
    createdAt: iso(1),
    decidedByUserId: null,
    decidedAt: null,
    decisionComment: null,
  },
  {
    id: 'req_3',
    userId: 'u_otorres',
    roleId: 'r_ks8_view',
    systemId: 'sys_ks8',
    justification: 'Acceso de lectura para monitoreo de infraestructura.',
    status: 'APPROVED',
    requestedByUserId: 'u_admin',
    createdAt: iso(10),
    // Resuelto por el administrador global (no por el propio beneficiario): segregación de funciones.
    decidedByUserId: 'u_admin',
    decidedAt: iso(9),
    decisionComment: 'Aprobado. Acceso de monitoreo justificado.',
  },
  {
    id: 'req_4',
    userId: 'u_mvelez',
    roleId: 'r_rpa_op',
    systemId: 'sys_cubolac',
    justification: 'Solicitud para operar bots de conciliación.',
    status: 'REJECTED',
    requestedByUserId: 'u_admin',
    createdAt: iso(7),
    decidedByUserId: 'u_ldiaz',
    decidedAt: iso(6),
    decisionComment: 'Rechazado. El cargo no corresponde al área de automatización.',
  },
];

// --- Accesos efectivos (grants) --------------------------------------------
export const grants: Grant[] = [
  {
    id: 'g_1',
    userId: 'u_otorres',
    roleId: 'r_ks8_view',
    systemId: 'sys_ks8',
    grantedAt: iso(9),
    requestId: 'req_3',
    authorizedByUserId: 'u_admin',
  },
  {
    id: 'g_2',
    userId: 'u_grobles',
    roleId: 'r_ks8_view',
    systemId: 'sys_ks8',
    grantedAt: iso(30),
    requestId: null,
    authorizedByUserId: 'u_admin',
  },
  {
    id: 'g_admin',
    userId: 'u_admin',
    roleId: 'r_global_admin',
    systemId: null,
    grantedAt: iso(120),
    requestId: null,
    authorizedByUserId: 'u_admin',
  },
];

// --- Auditoría -------------------------------------------------------------
export const audit: AuditEntry[] = [
  { id: 'a_1', timestamp: iso(0), actor: 'ctudela', action: 'LOGIN', entityType: 'auth', entityId: 'u_admin', detail: 'Inicio de sesión del administrador.' },
  { id: 'a_2', timestamp: iso(1), actor: 'ctudela', action: 'CREATE_REQUEST', entityType: 'request', entityId: 'req_2', detail: 'Solicitud de acceso KS8 DEV — Edit para Geovanny Robles.' },
  { id: 'a_3', timestamp: iso(6), actor: 'ldiaz', action: 'REJECT_REQUEST', entityType: 'request', entityId: 'req_4', detail: 'Rechazó solicitud RPA Operador para María Fernanda Vélez.' },
  { id: 'a_4', timestamp: iso(9), actor: 'ctudela', action: 'APPROVE_REQUEST', entityType: 'request', entityId: 'req_3', detail: 'Aprobó acceso KS8 DEV — View para Osniel Torres.' },
];

// --- Usuarios LDAP de respaldo (si el servidor LDAP no está disponible) -----
// Espejo de ldap/bootstrap.ldif para que la maqueta funcione sin contenedor LDAP.
export const ldapFallbackUsers = [
  { username: 'grobles', firstName: 'Geovanny', lastName: 'Robles', email: 'grobles@reybanpac.com', cargo: 'Analista Desarrollo', department: 'Desarrollo', dn: 'uid=grobles,ou=people,dc=reybanpac,dc=com' },
  { username: 'mvelez', firstName: 'María Fernanda', lastName: 'Vélez', email: 'mvelez@reybanpac.com', cargo: 'Analista Financiero', department: 'Finanzas', dn: 'uid=mvelez,ou=people,dc=reybanpac,dc=com' },
  { username: 'jmoran', firstName: 'Julio', lastName: 'Morán', email: 'jmoran@reybanpac.com', cargo: 'Jefe de Logística', department: 'Logística', dn: 'uid=jmoran,ou=people,dc=reybanpac,dc=com' },
  { username: 'acastro', firstName: 'Ana', lastName: 'Castro', email: 'acastro@reybanpac.com', cargo: 'Contadora', department: 'Finanzas', dn: 'uid=acastro,ou=people,dc=reybanpac,dc=com' },
  { username: 'pvera', firstName: 'Pedro', lastName: 'Vera', email: 'pvera@reybanpac.com', cargo: 'Especialista QA', department: 'Calidad', dn: 'uid=pvera,ou=people,dc=reybanpac,dc=com' },
];

// ===========================================================================
// Seguridades — jerarquía Aplicación → Modulo → Programa → Perfil
// ===========================================================================
export const aplicaciones: Aplicacion[] = [
  { id: 'seg_app_1', codigo: 'APP-SAP', nombre: 'SAP ERP', descripcion: 'SAP ERP Reybanpac — Finanzas, Compras y Logística.', estado: 'ACTIVO', createdAt: iso(120) },
  { id: 'seg_app_2', codigo: 'APP-KS8', nombre: 'Kubernetes KS8', descripcion: 'Clúster Kubernetes KS8 (No Productivo).', estado: 'ACTIVO', createdAt: iso(100) },
  { id: 'seg_app_3', codigo: 'APP-RPA', nombre: 'RPA Cubolac', descripcion: 'Plataforma de automatización robótica Cubolac.', estado: 'ACTIVO', createdAt: iso(80) },
];

export const modulos: Modulo[] = [
  { id: 'seg_mod_1', codigo: 'MOD-FI', nombre: 'Finanzas (FI)', descripcion: 'Módulo financiero de SAP.', appCodigo: 'APP-SAP', estado: 'ACTIVO', createdAt: iso(90) },
  { id: 'seg_mod_2', codigo: 'MOD-MM', nombre: 'Compras (MM)', descripcion: 'Gestión de compras y materiales SAP.', appCodigo: 'APP-SAP', estado: 'ACTIVO', createdAt: iso(88) },
  { id: 'seg_mod_3', codigo: 'MOD-KS8-OPS', nombre: 'Operación KS8', descripcion: 'Operación del clúster Kubernetes.', appCodigo: 'APP-KS8', estado: 'ACTIVO', createdAt: iso(70) },
  { id: 'seg_mod_4', codigo: 'MOD-RPA-RUN', nombre: 'Ejecución de bots', descripcion: 'Ejecución de procesos RPA.', appCodigo: 'APP-RPA', estado: 'ACTIVO', createdAt: iso(60) },
];

export const programas: Programa[] = [
  { id: 'seg_prg_1', codigo: 'PRG-FI-DOCS', nombre: 'Documentos contables', descripcion: 'Consulta de documentos contables FI.', modCodigo: 'MOD-FI', tipo: 'Consulta', estado: 'ACTIVO', createdAt: iso(80) },
  { id: 'seg_prg_2', codigo: 'PRG-MM-PED', nombre: 'Pedidos de compra', descripcion: 'Creación de pedidos de compra MM.', modCodigo: 'MOD-MM', tipo: 'Transacción', estado: 'ACTIVO', createdAt: iso(78) },
  { id: 'seg_prg_3', codigo: 'PRG-KS8-DEP', nombre: 'Deployments', descripcion: 'Gestión de deployments en KS8.', modCodigo: 'MOD-KS8-OPS', tipo: 'Proceso', estado: 'ACTIVO', createdAt: iso(65) },
  { id: 'seg_prg_4', codigo: 'PRG-RPA-LAUNCH', nombre: 'Lanzar bot', descripcion: 'Lanzar proceso automatizado.', modCodigo: 'MOD-RPA-RUN', tipo: 'Proceso', estado: 'ACTIVO', createdAt: iso(55) },
];

export const perfiles: Perfil[] = [
  { id: 'seg_perf_1', codigo: 'PERF-FI-VIS', nombre: 'FI Visualizador', descripcion: 'Visualización de documentos contables.', programas: [{ prgCodigo: 'PRG-FI-DOCS', nuevo: false, modificar: false, anular: false, procesar: false, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(70) },
  { id: 'seg_perf_2', codigo: 'PERF-FI-ED', nombre: 'FI Editor', descripcion: 'Edición de documentos contables.', programas: [{ prgCodigo: 'PRG-FI-DOCS', nuevo: true, modificar: true, anular: true, procesar: false, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(68) },
  { id: 'seg_perf_3', codigo: 'PERF-MM-CR', nombre: 'MM Creador', descripcion: 'Creación de pedidos de compra.', programas: [{ prgCodigo: 'PRG-MM-PED', nuevo: true, modificar: true, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(72) },
  { id: 'seg_perf_4', codigo: 'PERF-KS8-OPS', nombre: 'KS8 Operador', descripcion: 'Operación de deployments.', programas: [{ prgCodigo: 'PRG-KS8-DEP', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: false, consultar: true }], estado: 'ACTIVO', createdAt: iso(60) },
  { id: 'seg_perf_5', codigo: 'PERF-RPA-OP', nombre: 'RPA Operador', descripcion: 'Ejecutar bots de automatización.', programas: [{ prgCodigo: 'PRG-RPA-LAUNCH', nuevo: false, modificar: false, anular: false, procesar: true, imprimir: false, consultar: true }], estado: 'ACTIVO', createdAt: iso(50) },
];

export const controles: Control[] = [
  { id: 'seg_ctrl_1', prgCodigo: 'PRG-FI-DOCS', tipoControl: 'Caja de Texto', descripcion: 'Número de documento', estado: 'ACTIVO', createdAt: iso(70) },
  { id: 'seg_ctrl_2', prgCodigo: 'PRG-FI-DOCS', tipoControl: 'Botón', descripcion: 'Buscar documento', estado: 'ACTIVO', createdAt: iso(70) },
  { id: 'seg_ctrl_3', prgCodigo: 'PRG-FI-DOCS', tipoControl: 'Grid', descripcion: 'Resultados de búsqueda', estado: 'ACTIVO', createdAt: iso(70) },
  { id: 'seg_ctrl_4', prgCodigo: 'PRG-MM-PED', tipoControl: 'Combo', descripcion: 'Seleccionar proveedor', estado: 'ACTIVO', createdAt: iso(72) },
  { id: 'seg_ctrl_5', prgCodigo: 'PRG-MM-PED', tipoControl: 'Botón', descripcion: 'Crear pedido', estado: 'ACTIVO', createdAt: iso(72) },
  { id: 'seg_ctrl_6', prgCodigo: 'PRG-KS8-DEP', tipoControl: 'Option', descripcion: 'Seleccionar ambiente (DEV/QAS/PROD)', estado: 'ACTIVO', createdAt: iso(65) },
  { id: 'seg_ctrl_7', prgCodigo: 'PRG-KS8-DEP', tipoControl: 'Grid', descripcion: 'Lista de deployments', estado: 'ACTIVO', createdAt: iso(65) },
  { id: 'seg_ctrl_8', prgCodigo: 'PRG-RPA-LAUNCH', tipoControl: 'Botón', descripcion: 'Ejecutar bot', estado: 'ACTIVO', log: 'INACTIVO', createdAt: iso(55) },
  { id: 'seg_ctrl_9', prgCodigo: 'PRG-RPA-LAUNCH', tipoControl: 'Otros', descripcion: 'Log de ejecución', estado: 'ACTIVO', log: 'INACTIVO', createdAt: iso(55) },
];
