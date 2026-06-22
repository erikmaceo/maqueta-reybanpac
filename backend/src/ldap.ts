// ===========================================================================
// Integración LDAP — fuente EXCLUSIVA de los usuarios "cliente final".
// Si el servidor LDAP no está disponible (p.ej. ejecución local sin Docker),
// se usa una lista de respaldo en memoria (seed.ldapFallbackUsers) para que
// la maqueta siga siendo demostrable.
// ===========================================================================

import { ldapFallbackUsers } from './seed.js';
import type { LdapPerson, LdapResponse } from './types.js';

export type { LdapPerson, LdapResponse } from './types.js';

const LDAP_URL = process.env.LDAP_URL || 'ldap://ldap:389';
const LDAP_BIND_DN = process.env.LDAP_BIND_DN || 'cn=admin,dc=reybanpac,dc=com';
const LDAP_BIND_PW = process.env.LDAP_BIND_PW || 'admin123';
const LDAP_SEARCH_BASE = process.env.LDAP_SEARCH_BASE || 'ou=people,dc=reybanpac,dc=com';
const LDAP_TIMEOUT = Number(process.env.LDAP_TIMEOUT_MS || 3500);

function attr(entry: any, name: string): string {
  // ldapjs v3 expone entry.attributes (array) o pojo según versión.
  if (entry?.attributes) {
    const a = entry.attributes.find((x: any) => x.type === name);
    if (a) return Array.isArray(a.values) ? a.values[0] : a.vals?.[0] ?? '';
  }
  const v = entry?.[name];
  return Array.isArray(v) ? v[0] : v ?? '';
}

export async function fetchLdapPeople(): Promise<LdapResponse> {
  let ldap: any;
  try {
    ldap = await import('ldapjs');
  } catch {
    return fallback('Módulo ldapjs no disponible — usando directorio de respaldo.');
  }

  return new Promise<LdapResponse>((resolve) => {
    let settled = false;
    const done = (r: LdapResponse) => {
      if (settled) return;
      settled = true;
      try { client?.unbind(); } catch { /* ignore */ }
      resolve(r);
    };

    const client = (ldap.default?.createClient || ldap.createClient)({
      url: LDAP_URL,
      timeout: LDAP_TIMEOUT,
      connectTimeout: LDAP_TIMEOUT,
      reconnect: false,
    });

    const safetyTimer = setTimeout(
      () => done(fallback(`Tiempo de espera agotado conectando a ${LDAP_URL}.`)),
      LDAP_TIMEOUT + 500,
    );

    client.on('error', (err: any) =>
      done(fallback(`No se pudo conectar a LDAP (${LDAP_URL}): ${err?.code || err?.message}.`)),
    );

    client.bind(LDAP_BIND_DN, LDAP_BIND_PW, (bindErr: any) => {
      if (bindErr) {
        clearTimeout(safetyTimer);
        return done(fallback(`Bind LDAP falló: ${bindErr?.message}.`));
      }
      const people: LdapPerson[] = [];
      client.search(
        LDAP_SEARCH_BASE,
        { scope: 'sub', filter: '(objectClass=inetOrgPerson)' },
        (searchErr: any, res: any) => {
          if (searchErr) {
            clearTimeout(safetyTimer);
            return done(fallback(`Búsqueda LDAP falló: ${searchErr?.message}.`));
          }
          res.on('searchEntry', (entry: any) => {
            const uid = attr(entry, 'uid') || attr(entry, 'cn');
            people.push({
              username: uid,
              firstName: attr(entry, 'givenName'),
              lastName: attr(entry, 'sn'),
              email: attr(entry, 'mail') || `${uid}@reybanpac.com`,
              cargo: attr(entry, 'title'),
              department: attr(entry, 'ou') || attr(entry, 'departmentNumber'),
              dn: entry?.objectName?.toString?.() || entry?.dn?.toString?.() || `uid=${uid},${LDAP_SEARCH_BASE}`,
            });
          });
          res.on('error', (e: any) => {
            clearTimeout(safetyTimer);
            done(fallback(`Error leyendo entradas LDAP: ${e?.message}.`));
          });
          res.on('end', () => {
            clearTimeout(safetyTimer);
            if (!people.length) {
              return done(fallback('LDAP respondió sin usuarios — usando respaldo.'));
            }
            done({
              source: 'LDAP',
              people,
              message: `Conectado a ${LDAP_URL} — ${people.length} usuarios en ${LDAP_SEARCH_BASE}.`,
            });
          });
        },
      );
    });
  });
}

function fallback(message: string): LdapResponse {
  return { source: 'FALLBACK', people: ldapFallbackUsers, message };
}
