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
  NivelSegregacion,
  NodoSegregacion,
  NivelAtributo,
  NodoAtributoValor,
  Pais,
  Provincia,
  Ciudad,
  DispositivoMovil,
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
  nodoIds: [],
  perfilCodigos: [],
  status: 'ACTIVE',
  roleIds: [],
  createdAt: iso(90),
  lastLogin: null,
  ...u,
});

const nombres = ['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Pedro', 'Sofía', 'Diego', 'Laura', 'Andrés', 'Valentina', 'Jorge', 'Camila', 'Fernando', 'Daniela', 'Gabriel', 'Lucía', 'Miguel', 'Paula', 'Ricardo'];
const apellidos = ['Pérez', 'Gómez', 'Rodríguez', 'López', 'Martínez', 'García', 'Sánchez', 'Torres', 'Ramírez', 'Flores', 'Vargas', 'Castro', 'Morales', 'Jiménez', 'Herrera', 'Díaz', 'Moreno', 'Muñoz', 'Ortega', 'Delgado'];
const departamentos = ['Finanzas', 'Contabilidad', 'Logística', 'Ventas', 'Marketing', 'RRHH', 'Operaciones', 'Desarrollo', 'Soporte', 'Calidad', 'Producción', 'Compras', 'Legal', 'TI'];
const cargos = ['Analista', 'Coordinador', 'Especialista', 'Gerente', 'Supervisor', 'Asistente', 'Consultor', 'Jefe', 'Técnico', 'Ejecutivo'];

function generateLdapUsers(count: number): User[] {
  const generated: User[] = [];
  for (let i = 0; i < count; i++) {
    const firstName = nombres[i % nombres.length];
    const lastName = apellidos[(i + Math.floor(i / nombres.length)) % apellidos.length];
    const idx = String(i + 1).padStart(3, '0');
    const username = `${firstName.toLowerCase()[0]}${lastName.toLowerCase()}${idx}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const department = departamentos[i % departamentos.length];
    const cargo = cargos[i % cargos.length];
    generated.push(mkUser({
      id: `u_ldap_${idx}`,
      username,
      firstName,
      lastName,
      cargo: `${cargo} ${department}`,
      department,
      type: 'CLIENTE_FINAL',
      source: 'LDAP',
      roleIds: [],
      nodoIds: i % 2 === 0 ? ['nod_emp_1'] : ['nod_emp_2'],
      perfilCodigos: [],
    }));
  }
  return generated;
}

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
    nodoIds: ['nod_emp_1'],
    perfilCodigos: ['PERF-FI-VIS', 'PERF-MM-CR'],
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
    nodoIds: ['nod_emp_1'],
    perfilCodigos: ['PERF-KS8-OPS'],
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
    nodoIds: ['nod_emp_2'],
    perfilCodigos: [],
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
    nodoIds: ['nod_emp_1'],
    perfilCodigos: ['PERF-FI-ED'],
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
    nodoIds: ['nod_emp_2'],
    perfilCodigos: ['PERF-FI-VIS'],
  }),
  ...generateLdapUsers(100),
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
  { id: 'seg_app_1', codigo: 'APP-SAP', nombre: 'SAP ERP', descripcion: 'SAP ERP Reybanpac — Finanzas, Compras y Logística.', estado: 'ACTIVO', nodoIds: ['nod_emp_1'], createdAt: iso(120) },
  { id: 'seg_app_2', codigo: 'APP-KS8', nombre: 'Kubernetes KS8', descripcion: 'Clúster Kubernetes KS8 (No Productivo).', estado: 'ACTIVO', nodoIds: ['nod_emp_1'], createdAt: iso(100) },
  { id: 'seg_app_3', codigo: 'APP-RPA', nombre: 'RPA Cubolac', descripcion: 'Plataforma de automatización robótica Cubolac.', estado: 'ACTIVO', nodoIds: ['nod_emp_1'], createdAt: iso(80) },
];

export const modulos: Modulo[] = [
  { id: 'seg_mod_1', codigo: 'MOD-FI', nombre: 'Finanzas (FI)', descripcion: 'Módulo financiero de SAP.', appCodigo: 'APP-SAP', estado: 'ACTIVO', orden: 0, createdAt: iso(90) },
  { id: 'seg_mod_2', codigo: 'MOD-MM', nombre: 'Compras (MM)', descripcion: 'Gestión de compras y materiales SAP.', appCodigo: 'APP-SAP', estado: 'ACTIVO', orden: 1, createdAt: iso(88) },
  { id: 'seg_mod_3', codigo: 'MOD-KS8-OPS', nombre: 'Operación KS8', descripcion: 'Operación del clúster Kubernetes.', appCodigo: 'APP-KS8', estado: 'ACTIVO', orden: 0, createdAt: iso(70) },
  { id: 'seg_mod_4', codigo: 'MOD-RPA-RUN', nombre: 'Ejecución de bots', descripcion: 'Ejecución de procesos RPA.', appCodigo: 'APP-RPA', estado: 'ACTIVO', orden: 0, createdAt: iso(60) },
];

export const programas: Programa[] = [
  { id: 'seg_prg_1', codigo: 'PRG-FI-DOCS', nombre: 'Documentos contables', descripcion: 'Consulta de documentos contables FI.', modCodigo: 'MOD-FI', tipo: 'Consulta', estado: 'ACTIVO', orden: 0, createdAt: iso(80) },
  { id: 'seg_prg_2', codigo: 'PRG-MM-PED', nombre: 'Pedidos de compra', descripcion: 'Creación de pedidos de compra MM.', modCodigo: 'MOD-MM', tipo: 'Transacción', estado: 'ACTIVO', orden: 0, createdAt: iso(78) },
  { id: 'seg_prg_3', codigo: 'PRG-KS8-DEP', nombre: 'Deployments', descripcion: 'Gestión de deployments en KS8.', modCodigo: 'MOD-KS8-OPS', tipo: 'Proceso', estado: 'ACTIVO', orden: 0, createdAt: iso(65) },
  { id: 'seg_prg_4', codigo: 'PRG-RPA-LAUNCH', nombre: 'Lanzar bot', descripcion: 'Lanzar proceso automatizado.', modCodigo: 'MOD-RPA-RUN', tipo: 'Proceso', estado: 'ACTIVO', orden: 0, createdAt: iso(55) },
];

export const perfiles: Perfil[] = [
  { id: 'seg_perf_1', codigo: 'PERF-FI-VIS', nombre: 'FI Visualizador', descripcion: 'Visualización de documentos contables.', programas: [{ prgCodigo: 'PRG-FI-DOCS', nuevo: false, modificar: false, anular: false, procesar: false, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(70) },
  { id: 'seg_perf_2', codigo: 'PERF-FI-ED', nombre: 'FI Editor', descripcion: 'Edición de documentos contables.', programas: [{ prgCodigo: 'PRG-FI-DOCS', nuevo: true, modificar: true, anular: true, procesar: false, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(68) },
  { id: 'seg_perf_3', codigo: 'PERF-MM-CR', nombre: 'MM Creador', descripcion: 'Creación de pedidos de compra.', programas: [{ prgCodigo: 'PRG-MM-PED', nuevo: true, modificar: true, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(72) },
  { id: 'seg_perf_4', codigo: 'PERF-KS8-OPS', nombre: 'KS8 Operador', descripcion: 'Operación de deployments.', programas: [{ prgCodigo: 'PRG-KS8-DEP', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: false, consultar: true }], estado: 'ACTIVO', createdAt: iso(60) },
  { id: 'seg_perf_5', codigo: 'PERF-RPA-OP', nombre: 'RPA Operador', descripcion: 'Ejecutar bots de automatización.', programas: [{ prgCodigo: 'PRG-RPA-LAUNCH', nuevo: false, modificar: false, anular: false, procesar: true, imprimir: false, consultar: true }], estado: 'ACTIVO', createdAt: iso(50) },
  // Perfiles adicionales para poblar tablas
  { id: 'seg_perf_6', codigo: 'PERF-FI-APRO', nombre: 'FI Aprobador', descripcion: 'Aprobación de documentos contables.', programas: [{ prgCodigo: 'PRG-FI-DOCS', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(69) },
  { id: 'seg_perf_7', codigo: 'PERF-FI-RECT', nombre: 'FI Rectificador', descripcion: 'Rectificación de asientos contables.', programas: [{ prgCodigo: 'PRG-FI-DOCS', nuevo: true, modificar: true, anular: true, procesar: false, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(67) },
  { id: 'seg_perf_8', codigo: 'PERF-FI-REPO', nombre: 'FI Reportes', descripcion: 'Generación de reportes financieros.', programas: [{ prgCodigo: 'PRG-FI-DOCS', nuevo: false, modificar: false, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(66) },
  { id: 'seg_perf_9', codigo: 'PERF-FI-CONC', nombre: 'FI Conciliador', descripcion: 'Conciliación bancaria y estados de cuenta.', programas: [{ prgCodigo: 'PRG-FI-DOCS', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(65) },
  { id: 'seg_perf_10', codigo: 'PERF-FI-PRES', nombre: 'FI Presupuesto', descripcion: 'Gestión de presupuestos y versiones.', programas: [{ prgCodigo: 'PRG-FI-DOCS', nuevo: true, modificar: true, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(64) },
  { id: 'seg_perf_11', codigo: 'PERF-FI-COST', nombre: 'FI Costos', descripcion: 'Análisis y contabilización de costos.', programas: [{ prgCodigo: 'PRG-FI-DOCS', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(63) },
  { id: 'seg_perf_12', codigo: 'PERF-FI-AUD', nombre: 'FI Auditor', descripcion: 'Auditoría y revisión de documentos FI.', programas: [{ prgCodigo: 'PRG-FI-DOCS', nuevo: false, modificar: false, anular: false, procesar: false, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(62) },
  { id: 'seg_perf_13', codigo: 'PERF-FI-CONT', nombre: 'FI Contador', descripcion: 'Contador general de documentos contables.', programas: [{ prgCodigo: 'PRG-FI-DOCS', nuevo: true, modificar: true, anular: true, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(61) },
  { id: 'seg_perf_14', codigo: 'PERF-FI-TES', nombre: 'FI Tesorero', descripcion: 'Gestión de tesorería y pagos.', programas: [{ prgCodigo: 'PRG-FI-DOCS', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(59) },
  { id: 'seg_perf_15', codigo: 'PERF-FI-FAC', nombre: 'FI Facturador', descripcion: 'Emisión y control de facturas.', programas: [{ prgCodigo: 'PRG-FI-DOCS', nuevo: true, modificar: true, anular: true, procesar: false, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(58) },
  { id: 'seg_perf_16', codigo: 'PERF-MM-APRO', nombre: 'MM Aprobador', descripcion: 'Aprobación de pedidos de compra.', programas: [{ prgCodigo: 'PRG-MM-PED', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(57) },
  { id: 'seg_perf_17', codigo: 'PERF-MM-PROV', nombre: 'MM Proveedores', descripcion: 'Gestión y mantenimiento de proveedores.', programas: [{ prgCodigo: 'PRG-MM-PED', nuevo: true, modificar: true, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(56) },
  { id: 'seg_perf_18', codigo: 'PERF-MM-RECEP', nombre: 'MM Recepción', descripcion: 'Recepción y control de mercancías.', programas: [{ prgCodigo: 'PRG-MM-PED', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(55) },
  { id: 'seg_perf_19', codigo: 'PERF-MM-INV', nombre: 'MM Inventarios', descripcion: 'Gestión de inventarios y stock.', programas: [{ prgCodigo: 'PRG-MM-PED', nuevo: true, modificar: true, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(54) },
  { id: 'seg_perf_20', codigo: 'PERF-MM-SOL', nombre: 'MM Solicitante', descripcion: 'Solicitud de compras y servicios.', programas: [{ prgCodigo: 'PRG-MM-PED', nuevo: true, modificar: true, anular: true, procesar: false, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(53) },
  { id: 'seg_perf_21', codigo: 'PERF-MM-CONS', nombre: 'MM Consulta', descripcion: 'Consulta de pedidos y órdenes de compra.', programas: [{ prgCodigo: 'PRG-MM-PED', nuevo: false, modificar: false, anular: false, procesar: false, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(52) },
  { id: 'seg_perf_22', codigo: 'PERF-MM-LOG', nombre: 'MM Logística', descripcion: 'Seguimiento logístico de materiales.', programas: [{ prgCodigo: 'PRG-MM-PED', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(51) },
  { id: 'seg_perf_23', codigo: 'PERF-MM-ALM', nombre: 'MM Almacén', descripcion: 'Control de almacén y movimientos.', programas: [{ prgCodigo: 'PRG-MM-PED', nuevo: true, modificar: true, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(49) },
  { id: 'seg_perf_24', codigo: 'PERF-MM-CAL', nombre: 'MM Calidad', descripcion: 'Inspección de calidad de entrada.', programas: [{ prgCodigo: 'PRG-MM-PED', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(48) },
  { id: 'seg_perf_25', codigo: 'PERF-MM-NEG', nombre: 'MM Negociador', descripcion: 'Negociación y contratación con proveedores.', programas: [{ prgCodigo: 'PRG-MM-PED', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(47) },
  { id: 'seg_perf_26', codigo: 'PERF-KS8-DEV', nombre: 'KS8 Desarrollador', descripcion: 'Desarrollo y despliegue en KS8.', programas: [{ prgCodigo: 'PRG-KS8-DEP', nuevo: true, modificar: true, anular: false, procesar: true, imprimir: false, consultar: true }], estado: 'ACTIVO', createdAt: iso(46) },
  { id: 'seg_perf_27', codigo: 'PERF-KS8-QAS', nombre: 'KS8 QA', descripcion: 'Pruebas de calidad en clúster KS8.', programas: [{ prgCodigo: 'PRG-KS8-DEP', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: false, consultar: true }], estado: 'ACTIVO', createdAt: iso(45) },
  { id: 'seg_perf_28', codigo: 'PERF-KS8-PROD', nombre: 'KS8 Producción', descripcion: 'Operación del ambiente productivo KS8.', programas: [{ prgCodigo: 'PRG-KS8-DEP', nuevo: false, modificar: false, anular: false, procesar: true, imprimir: false, consultar: true }], estado: 'ACTIVO', createdAt: iso(44) },
  { id: 'seg_perf_29', codigo: 'PERF-KS8-MON', nombre: 'KS8 Monitor', descripcion: 'Monitoreo de recursos y workloads.', programas: [{ prgCodigo: 'PRG-KS8-DEP', nuevo: false, modificar: false, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(43) },
  { id: 'seg_perf_30', codigo: 'PERF-KS8-SEC', nombre: 'KS8 Seguridad', descripcion: 'Gestión de seguridad y políticas KS8.', programas: [{ prgCodigo: 'PRG-KS8-DEP', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: false, consultar: true }], estado: 'ACTIVO', createdAt: iso(42) },
  { id: 'seg_perf_31', codigo: 'PERF-KS8-ARC', nombre: 'KS8 Arquitecto', descripcion: 'Diseño de arquitectura de microservicios.', programas: [{ prgCodigo: 'PRG-KS8-DEP', nuevo: true, modificar: true, anular: true, procesar: true, imprimir: false, consultar: true }], estado: 'ACTIVO', createdAt: iso(41) },
  { id: 'seg_perf_32', codigo: 'PERF-KS8-SRE', nombre: 'KS8 SRE', descripcion: 'Site reliability engineering del clúster.', programas: [{ prgCodigo: 'PRG-KS8-DEP', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: false, consultar: true }], estado: 'ACTIVO', createdAt: iso(40) },
  { id: 'seg_perf_33', codigo: 'PERF-KS8-BACK', nombre: 'KS8 Backend', descripcion: 'Desarrollo backend y APIs.', programas: [{ prgCodigo: 'PRG-KS8-DEP', nuevo: true, modificar: true, anular: false, procesar: true, imprimir: false, consultar: true }], estado: 'ACTIVO', createdAt: iso(39) },
  { id: 'seg_perf_34', codigo: 'PERF-KS8-FRONT', nombre: 'KS8 Frontend', descripcion: 'Desarrollo frontend y UX.', programas: [{ prgCodigo: 'PRG-KS8-DEP', nuevo: true, modificar: true, anular: false, procesar: false, imprimir: false, consultar: true }], estado: 'ACTIVO', createdAt: iso(38) },
  { id: 'seg_perf_35', codigo: 'PERF-KS8-DEVOPS', nombre: 'KS8 DevOps', descripcion: 'Automatización CI/CD y pipelines.', programas: [{ prgCodigo: 'PRG-KS8-DEP', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: false, consultar: true }], estado: 'ACTIVO', createdAt: iso(37) },
  { id: 'seg_perf_36', codigo: 'PERF-RPA-DES', nombre: 'RPA Desarrollador', descripcion: 'Diseño y desarrollo de bots RPA.', programas: [{ prgCodigo: 'PRG-RPA-LAUNCH', nuevo: true, modificar: true, anular: false, procesar: true, imprimir: false, consultar: true }], estado: 'ACTIVO', createdAt: iso(36) },
  { id: 'seg_perf_37', codigo: 'PERF-RPA-MON', nombre: 'RPA Monitor', descripcion: 'Monitoreo de ejecución de bots.', programas: [{ prgCodigo: 'PRG-RPA-LAUNCH', nuevo: false, modificar: false, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(35) },
  { id: 'seg_perf_38', codigo: 'PERF-RPA-AUD', nombre: 'RPA Auditor', descripcion: 'Auditoría de logs y ejecuciones RPA.', programas: [{ prgCodigo: 'PRG-RPA-LAUNCH', nuevo: false, modificar: false, anular: false, procesar: false, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(34) },
  { id: 'seg_perf_39', codigo: 'PERF-RPA-ANL', nombre: 'RPA Analista', descripcion: 'Análisis de procesos automatizables.', programas: [{ prgCodigo: 'PRG-RPA-LAUNCH', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(33) },
  { id: 'seg_perf_40', codigo: 'PERF-RPA-LEAD', nombre: 'RPA Líder', descripcion: 'Liderazgo del equipo de automatización.', programas: [{ prgCodigo: 'PRG-RPA-LAUNCH', nuevo: true, modificar: true, anular: true, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(32) },
  { id: 'seg_perf_41', codigo: 'PERF-RPA-SUP', nombre: 'RPA Supervisor', descripcion: 'Supervisión de operadores y bots.', programas: [{ prgCodigo: 'PRG-RPA-LAUNCH', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(31) },
  { id: 'seg_perf_42', codigo: 'PERF-RPA-CONF', nombre: 'RPA Configurador', descripcion: 'Configuración de credenciales y entornos.', programas: [{ prgCodigo: 'PRG-RPA-LAUNCH', nuevo: true, modificar: true, anular: false, procesar: true, imprimir: false, consultar: true }], estado: 'ACTIVO', createdAt: iso(30) },
  { id: 'seg_perf_43', codigo: 'PERF-RPA-TEST', nombre: 'RPA Tester', descripcion: 'Pruebas funcionales de bots.', programas: [{ prgCodigo: 'PRG-RPA-LAUNCH', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: false, consultar: true }], estado: 'ACTIVO', createdAt: iso(29) },
  { id: 'seg_perf_44', codigo: 'PERF-RPA-ADM', nombre: 'RPA Administrador', descripcion: 'Administración de la plataforma RPA.', programas: [{ prgCodigo: 'PRG-RPA-LAUNCH', nuevo: true, modificar: true, anular: true, procesar: true, imprimir: true, consultar: true }], estado: 'ACTIVO', createdAt: iso(28) },
  { id: 'seg_perf_45', codigo: 'PERF-RPA-COGN', nombre: 'RPA Cognitive', descripcion: 'Bots con procesamiento cognitivo.', programas: [{ prgCodigo: 'PRG-RPA-LAUNCH', nuevo: false, modificar: true, anular: false, procesar: true, imprimir: false, consultar: true }], estado: 'ACTIVO', createdAt: iso(27) },
];

export const controles: Control[] = [
  { id: 'seg_ctrl_1', prgCodigo: 'PRG-FI-DOCS', codigo: 'CTRL-DOC-NUM', tipoControl: 'Caja de Texto', descripcion: 'Número de documento', estado: 'ACTIVO', log: 'ACTIVO', orden: 0, createdAt: iso(70) },
  { id: 'seg_ctrl_2', prgCodigo: 'PRG-FI-DOCS', codigo: 'CTRL-DOC-BUS', tipoControl: 'Botón', descripcion: 'Buscar documento', estado: 'ACTIVO', log: 'ACTIVO', orden: 1, createdAt: iso(70) },
  { id: 'seg_ctrl_3', prgCodigo: 'PRG-FI-DOCS', codigo: 'CTRL-DOC-GRD', tipoControl: 'Grid', descripcion: 'Resultados de búsqueda', estado: 'ACTIVO', log: 'ACTIVO', orden: 2, createdAt: iso(70) },
  { id: 'seg_ctrl_4', prgCodigo: 'PRG-MM-PED', codigo: 'CTRL-PED-PRV', tipoControl: 'Combo', descripcion: 'Seleccionar proveedor', estado: 'ACTIVO', log: 'ACTIVO', orden: 0, createdAt: iso(72) },
  { id: 'seg_ctrl_5', prgCodigo: 'PRG-MM-PED', codigo: 'CTRL-PED-CRE', tipoControl: 'Botón', descripcion: 'Crear pedido', estado: 'ACTIVO', log: 'ACTIVO', orden: 1, createdAt: iso(72) },
  { id: 'seg_ctrl_6', prgCodigo: 'PRG-KS8-DEP', codigo: 'CTRL-DEP-AMB', tipoControl: 'Option', descripcion: 'Seleccionar ambiente (DEV/QAS/PROD)', estado: 'ACTIVO', log: 'ACTIVO', orden: 0, createdAt: iso(65) },
  { id: 'seg_ctrl_7', prgCodigo: 'PRG-KS8-DEP', codigo: 'CTRL-DEP-LST', tipoControl: 'Grid', descripcion: 'Lista de deployments', estado: 'ACTIVO', log: 'ACTIVO', orden: 1, createdAt: iso(65) },
  { id: 'seg_ctrl_8', prgCodigo: 'PRG-RPA-LAUNCH', codigo: 'CTRL-RPA-EJE', tipoControl: 'Botón', descripcion: 'Ejecutar bot', estado: 'ACTIVO', log: 'INACTIVO', orden: 0, createdAt: iso(55) },
  { id: 'seg_ctrl_9', prgCodigo: 'PRG-RPA-LAUNCH', codigo: 'CTRL-RPA-LOG', tipoControl: 'Otros', descripcion: 'Log de ejecución', estado: 'ACTIVO', log: 'INACTIVO', orden: 1, createdAt: iso(55) },
];

// --- Configuración: Niveles de Segregación ----------------------------------
export const nivelesSegregacion: NivelSegregacion[] = [
  { id: 'niv_emp', codigo: 'EMP', nombre: 'Empresa', orden: 1, estado: 'ACTIVO', createdAt: iso(100) },
  { id: 'niv_suc', codigo: 'SUC', nombre: 'Sucursal', orden: 2, estado: 'ACTIVO', createdAt: iso(100) },
  { id: 'niv_pv', codigo: 'PV', nombre: 'Punto de Venta', orden: 3, estado: 'ACTIVO', createdAt: iso(100) },
];

// --- Configuración: Nodos de Segregación (árbol Empresa → Sucursal → PV) ----
export const nodosSegregacion: NodoSegregacion[] = [
  // Empresas
  { id: 'nod_emp_1', codigo: 'EMP-001', nombre: 'Reybanpac', nivelId: 'niv_emp', padreId: null, estado: 'ACTIVO', createdAt: iso(100) },
  { id: 'nod_emp_2', codigo: 'EMP-002', nombre: 'Favorita Fruit', nivelId: 'niv_emp', padreId: null, estado: 'ACTIVO', createdAt: iso(95) },
  // Sucursales
  { id: 'nod_suc_1', codigo: 'SUC-GYE-01', nombre: 'Matriz Guayaquil', nivelId: 'niv_suc', padreId: 'nod_emp_1', estado: 'ACTIVO', createdAt: iso(90) },
  { id: 'nod_suc_2', codigo: 'SUC-GYE-02', nombre: 'Sucursal Aeropuerto', nivelId: 'niv_suc', padreId: 'nod_emp_1', estado: 'ACTIVO', createdAt: iso(85) },
  { id: 'nod_suc_3', codigo: 'SUC-UIO-01', nombre: 'Matriz Quito', nivelId: 'niv_suc', padreId: 'nod_emp_2', estado: 'ACTIVO', createdAt: iso(88) },
  { id: 'nod_suc_4', codigo: 'SUC-UIO-02', nombre: 'Sucursal Cumbayá', nivelId: 'niv_suc', padreId: 'nod_emp_2', estado: 'ACTIVO', createdAt: iso(80) },
  // Puntos de Venta
  { id: 'nod_pv_1', codigo: 'PV-001', nombre: 'Caja Principal', nivelId: 'niv_pv', padreId: 'nod_suc_1', estado: 'ACTIVO', createdAt: iso(88) },
  { id: 'nod_pv_2', codigo: 'PV-002', nombre: 'Caja Secundaria', nivelId: 'niv_pv', padreId: 'nod_suc_1', estado: 'ACTIVO', createdAt: iso(87) },
  { id: 'nod_pv_3', codigo: 'PV-003', nombre: 'Caja Aeropuerto', nivelId: 'niv_pv', padreId: 'nod_suc_2', estado: 'ACTIVO', createdAt: iso(84) },
  { id: 'nod_pv_4', codigo: 'PV-004', nombre: 'Caja Matriz', nivelId: 'niv_pv', padreId: 'nod_suc_3', estado: 'ACTIVO', createdAt: iso(86) },
  { id: 'nod_pv_5', codigo: 'PV-005', nombre: 'Caja Cumbayá', nivelId: 'niv_pv', padreId: 'nod_suc_4', estado: 'ACTIVO', createdAt: iso(78) },
];

// --- Configuración: Atributos por Nivel --------------------------------------
export const nivelesAtributos: NivelAtributo[] = [
  // Empresa
  { id: 'attr_emp_ruc', nivelId: 'niv_emp', codigo: 'ruc', nombre: 'R.U.C.', tipo: 'texto', obligatorio: false, orden: 0, estado: 'ACTIVO', createdAt: iso(100) },
  { id: 'attr_emp_razon', nivelId: 'niv_emp', codigo: 'razonSocial', nombre: 'Razón Social', tipo: 'texto', obligatorio: false, orden: 1, estado: 'ACTIVO', createdAt: iso(100) },
  { id: 'attr_emp_nomcom', nivelId: 'niv_emp', codigo: 'nombreComercial', nombre: 'Nombre Comercial', tipo: 'texto', obligatorio: false, orden: 2, estado: 'ACTIVO', createdAt: iso(100) },
  { id: 'attr_emp_dir', nivelId: 'niv_emp', codigo: 'direccion', nombre: 'Dirección', tipo: 'texto', obligatorio: false, orden: 3, estado: 'ACTIVO', createdAt: iso(100) },
  { id: 'attr_emp_tel', nivelId: 'niv_emp', codigo: 'telefono', nombre: 'Teléfono', tipo: 'telefono', obligatorio: false, orden: 4, estado: 'ACTIVO', createdAt: iso(100) },
  // Sucursal
  { id: 'attr_suc_dir', nivelId: 'niv_suc', codigo: 'direccion', nombre: 'Dirección', tipo: 'texto', obligatorio: false, orden: 0, estado: 'ACTIVO', createdAt: iso(90) },
  { id: 'attr_suc_tel', nivelId: 'niv_suc', codigo: 'telefono', nombre: 'Teléfono', tipo: 'telefono', obligatorio: false, orden: 1, estado: 'ACTIVO', createdAt: iso(90) },
  // Punto de Venta
  { id: 'attr_pv_dir', nivelId: 'niv_pv', codigo: 'direccion', nombre: 'Dirección', tipo: 'texto', obligatorio: false, orden: 0, estado: 'ACTIVO', createdAt: iso(88) },
];

// --- Configuración: Valores de Atributos por Nodo ----------------------------
export const nodosAtributosValores: NodoAtributoValor[] = [
  // Reybanpac
  { id: 'val_1', nodoId: 'nod_emp_1', atributoId: 'attr_emp_ruc', valor: '0992345678001', createdAt: iso(100) },
  { id: 'val_2', nodoId: 'nod_emp_1', atributoId: 'attr_emp_razon', valor: 'Reybanpac S.A.', createdAt: iso(100) },
  { id: 'val_3', nodoId: 'nod_emp_1', atributoId: 'attr_emp_nomcom', valor: 'Reybanpac', createdAt: iso(100) },
  { id: 'val_4', nodoId: 'nod_emp_1', atributoId: 'attr_emp_dir', valor: 'Av. Carlos Luis Sáenz, Guayaquil', createdAt: iso(100) },
  { id: 'val_5', nodoId: 'nod_emp_1', atributoId: 'attr_emp_tel', valor: '04-600-1234', createdAt: iso(100) },
  // Favorita Fruit
  { id: 'val_6', nodoId: 'nod_emp_2', atributoId: 'attr_emp_ruc', valor: '0998765432001', createdAt: iso(95) },
  { id: 'val_7', nodoId: 'nod_emp_2', atributoId: 'attr_emp_razon', valor: 'Favorita Fruit Company C.A.', createdAt: iso(95) },
  { id: 'val_8', nodoId: 'nod_emp_2', atributoId: 'attr_emp_nomcom', valor: 'Favorita Fruit', createdAt: iso(95) },
  { id: 'val_9', nodoId: 'nod_emp_2', atributoId: 'attr_emp_dir', valor: 'Av. Quito 1234, Quito', createdAt: iso(95) },
  { id: 'val_10', nodoId: 'nod_emp_2', atributoId: 'attr_emp_tel', valor: '02-600-5678', createdAt: iso(95) },
  // Sucursales
  { id: 'val_11', nodoId: 'nod_suc_1', atributoId: 'attr_suc_dir', valor: 'Av. Carlos Luis Sáenz y 9 de Octubre, Guayaquil', createdAt: iso(90) },
  { id: 'val_12', nodoId: 'nod_suc_1', atributoId: 'attr_suc_tel', valor: '04-600-1234', createdAt: iso(90) },
  { id: 'val_13', nodoId: 'nod_suc_2', atributoId: 'attr_suc_dir', valor: 'Av. Francisco de Orellana, Guayaquil', createdAt: iso(85) },
  { id: 'val_14', nodoId: 'nod_suc_2', atributoId: 'attr_suc_tel', valor: '04-600-5678', createdAt: iso(85) },
  { id: 'val_15', nodoId: 'nod_suc_3', atributoId: 'attr_suc_dir', valor: 'Av. Quito 1234, Quito', createdAt: iso(88) },
  { id: 'val_16', nodoId: 'nod_suc_3', atributoId: 'attr_suc_tel', valor: '02-600-5678', createdAt: iso(88) },
  { id: 'val_17', nodoId: 'nod_suc_4', atributoId: 'attr_suc_dir', valor: 'Av. Interoceánica y Cumbayá, Quito', createdAt: iso(80) },
  { id: 'val_18', nodoId: 'nod_suc_4', atributoId: 'attr_suc_tel', valor: '02-600-9012', createdAt: iso(80) },
  // Puntos de Venta
  { id: 'val_19', nodoId: 'nod_pv_1', atributoId: 'attr_pv_dir', valor: 'Av. Carlos Luis Sáenz y 9 de Octubre', createdAt: iso(88) },
  { id: 'val_20', nodoId: 'nod_pv_2', atributoId: 'attr_pv_dir', valor: 'Av. Carlos Luis Sáenz y 9 de Octubre', createdAt: iso(87) },
  { id: 'val_21', nodoId: 'nod_pv_3', atributoId: 'attr_pv_dir', valor: 'Av. Francisco de Orellana', createdAt: iso(84) },
  { id: 'val_22', nodoId: 'nod_pv_4', atributoId: 'attr_pv_dir', valor: 'Av. Quito 1234', createdAt: iso(86) },
  { id: 'val_23', nodoId: 'nod_pv_5', atributoId: 'attr_pv_dir', valor: 'Av. Interoceánica y Cumbayá', createdAt: iso(78) },
];

// --- Parámetros y Configuración: Países ----------------------------------------
export const paises: Pais[] = [
  { id: 'param_pais_1', codigo: 'ECU', descripcion: 'Ecuador', estado: 'ACTIVO', createdAt: iso(120) },
  { id: 'param_pais_2', codigo: 'PER', descripcion: 'Perú', estado: 'ACTIVO', createdAt: iso(110) },
  { id: 'param_pais_3', codigo: 'COL', descripcion: 'Colombia', estado: 'ACTIVO', createdAt: iso(100) },
  { id: 'param_pais_4', codigo: 'CHL', descripcion: 'Chile', estado: 'INACTIVO', createdAt: iso(90) },
];

// --- Parámetros y Configuración: Provincias ------------------------------------
export const provincias: Provincia[] = [
  { id: 'param_prov_1', codigo: 'GYE', descripcion: 'Guayas', paisId: 'param_pais_1', paisDescripcion: 'Ecuador', estado: 'ACTIVO', createdAt: iso(115) },
  { id: 'param_prov_2', codigo: 'UIO', descripcion: 'Pichincha', paisId: 'param_pais_1', paisDescripcion: 'Ecuador', estado: 'ACTIVO', createdAt: iso(115) },
  { id: 'param_prov_3', codigo: 'CUE', descripcion: 'Azuay', paisId: 'param_pais_1', paisDescripcion: 'Ecuador', estado: 'ACTIVO', createdAt: iso(105) },
  { id: 'param_prov_4', codigo: 'LIM', descripcion: 'Lima', paisId: 'param_pais_2', paisDescripcion: 'Perú', estado: 'ACTIVO', createdAt: iso(95) },
  { id: 'param_prov_5', codigo: 'CAL', descripcion: 'Cali', paisId: 'param_pais_3', paisDescripcion: 'Colombia', estado: 'ACTIVO', createdAt: iso(85) },
];

// --- Parámetros y Configuración: Ciudades -------------------------------------
export const ciudades: Ciudad[] = [
  { id: 'param_ciu_1', codigo: 'GYE-C', descripcion: 'Guayaquil Centro', provinciaId: 'param_prov_1', provinciaDescripcion: 'Guayas', paisId: 'param_pais_1', paisDescripcion: 'Ecuador', estado: 'ACTIVO', createdAt: iso(110) },
  { id: 'param_ciu_2', codigo: 'GYE-N', descripcion: 'Guayaquil Norte', provinciaId: 'param_prov_1', provinciaDescripcion: 'Guayas', paisId: 'param_pais_1', paisDescripcion: 'Ecuador', estado: 'ACTIVO', createdAt: iso(110) },
  { id: 'param_ciu_3', codigo: 'UIO-C', descripcion: 'Quito Centro', provinciaId: 'param_prov_2', provinciaDescripcion: 'Pichincha', paisId: 'param_pais_1', paisDescripcion: 'Ecuador', estado: 'ACTIVO', createdAt: iso(108) },
  { id: 'param_ciu_4', codigo: 'CUE-C', descripcion: 'Cuenca', provinciaId: 'param_prov_3', provinciaDescripcion: 'Azuay', paisId: 'param_pais_1', paisDescripcion: 'Ecuador', estado: 'ACTIVO', createdAt: iso(100) },
  { id: 'param_ciu_5', codigo: 'LIM-C', descripcion: 'Lima Centro', provinciaId: 'param_prov_4', provinciaDescripcion: 'Lima', paisId: 'param_pais_2', paisDescripcion: 'Perú', estado: 'ACTIVO', createdAt: iso(90) },
];

// --- Parámetros y Configuración: Dispositivos Móviles ---------------------------
export const dispositivosMoviles: DispositivoMovil[] = [
  { id: 'param_disp_1', codigo: 'DM-001', estado: 'ACTIVO', createdAt: iso(100) },
  { id: 'param_disp_2', codigo: 'DM-002', estado: 'ACTIVO', createdAt: iso(95) },
  { id: 'param_disp_3', codigo: 'DM-003', estado: 'INACTIVO', createdAt: iso(90) },
];
