#!/usr/bin/env tsx
// ===========================================================================
// Script CLI para crear un cliente del API Gateway.
// Uso:
//   tsx scripts/create-gateway-client.ts "Nombre del cliente" "scope1,scope2"
//   tsx scripts/create-gateway-client.ts "Mi App" "seguridades:read,accesos:validate"
//
// Salida: base64 JSON listo para usar en la variable de entorno GATEWAY_CLIENTS.
// ===========================================================================

import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

const VALID_SCOPES = [
  'seguridades:read',
  'segregacion:read',
  'usuarios:read',
  'accesos:read',
  'accesos:validate',
  'admin:gateway',
];

function main() {
  const name = process.argv[2] || 'Nuevo cliente';
  const scopesInput = process.argv[3] || 'seguridades:read,segregacion:read,usuarios:read,accesos:read,accesos:validate';
  const allowedIpsInput = process.argv[4] || '';
  const rateLimit = Number(process.argv[5]) || 1000;

  const scopes = scopesInput
    .split(',')
    .map((s) => s.trim())
    .filter((s) => VALID_SCOPES.includes(s));

  if (scopes.length === 0) {
    console.error('Scopes inválidos. Scopes válidos:', VALID_SCOPES.join(', '));
    process.exit(1);
  }

  const allowedIps = allowedIpsInput
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const clientId = `client_${randomBytes(8).toString('hex')}`;
  const clientSecret = randomBytes(32).toString('hex');
  const clientSecretHash = bcrypt.hashSync(clientSecret, 12);
  const createdAt = new Date().toISOString();

  const client = {
    id: `gw_client_${Date.now()}`,
    name,
    clientId,
    clientSecretHash,
    scopes,
    allowedIps,
    rateLimit,
    isActive: true,
    createdAt,
    lastUsedAt: null,
  };

  const envValue = Buffer.from(JSON.stringify([client])).toString('base64');

  console.log('\n=== Cliente del API Gateway creado ===\n');
  console.log('Client ID:', clientId);
  console.log('Client Secret:', clientSecret);
  console.log('Scopes:', scopes.join(', '));
  console.log('Allowed IPs:', allowedIps.length ? allowedIps.join(', ') : 'Cualquiera');
  console.log('Rate Limit:', rateLimit, 'req/hora');
  console.log('\n=== Configuración para GATEWAY_CLIENTS (base64) ===\n');
  console.log(envValue);
  console.log('\n=== Ejemplo de uso ===\n');
  console.log(`GATEWAY_CLIENTS="${envValue}"`);
  console.log(`\nSolicitud de token:`);
  console.log(`curl -X POST http://localhost:4000/api/v1/gateway/oauth/token \\\n  -H "Content-Type: application/json" \\\n  -d '{"grant_type":"client_credentials","client_id":"${clientId}","client_secret":"${clientSecret}","scope":"${scopes.join(' ')}"}'`);
}

main();
