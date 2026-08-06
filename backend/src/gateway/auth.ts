// ===========================================================================
// API Gateway — OAuth2 Client Credentials + JWT access tokens
// ===========================================================================

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { db } from '../store.js';
import type { GatewayClient, GatewayScope, GatewayTokenPayload } from '../types.js';

export interface GatewayRequest extends Request {
  gatewayClient?: GatewayClient;
  gatewayClientId?: string;
  gatewayScopes?: GatewayScope[];
}

const JWT_PRIVATE_KEY = process.env.GATEWAY_JWT_PRIVATE_KEY || '';
const JWT_PUBLIC_KEY = process.env.GATEWAY_JWT_PUBLIC_KEY || '';
const JWT_ISSUER = process.env.GATEWAY_JWT_ISSUER || 'cam-gateway';
const JWT_AUDIENCE = process.env.GATEWAY_JWT_AUDIENCE || 'cam-external-clients';
const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.GATEWAY_ACCESS_TOKEN_TTL_SECONDS || 600);

export function hasJwtKeysConfigured(): boolean {
  return !!(JWT_PRIVATE_KEY && JWT_PUBLIC_KEY);
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (typeof forwarded === 'object' && forwarded?.[0]) {
    return forwarded[0].trim();
  }
  return req.socket.remoteAddress || '';
}

function isIpAllowed(client: GatewayClient, ip: string): boolean {
  if (!client.allowedIps || client.allowedIps.length === 0) return true;
  return client.allowedIps.some((allowed) => {
    if (allowed.includes('/')) {
      // CIDR support is basic; for a robust solution use a library like ip-range-check.
      const [subnet, prefix] = allowed.split('/');
      const bits = Number(prefix) || 32;
      const ipNum = ipToInt(ip);
      const mask = bits === 32 ? 0xffffffff : (0xffffffff << (32 - bits)) >>> 0;
      const subnetNum = ipToInt(subnet);
      return (ipNum & mask) === (subnetNum & mask);
    }
    return allowed === ip;
  });
}

function ipToInt(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet, idx) => acc + (Number(octet) << (8 * (3 - idx))), 0);
}

export async function authenticateClient(
  clientId: string,
  clientSecret: string,
  ip: string,
  requestedScopes?: string[],
): Promise<{ client: GatewayClient; token: string } | null> {
  const client = db.gatewayClients.find((c) => c.clientId === clientId && c.isActive);
  if (!client) return null;

  if (!isIpAllowed(client, ip)) return null;

  const match = await bcrypt.compare(clientSecret, client.clientSecretHash);
  if (!match) return null;

  // Restrict issued scopes to the intersection of requested and allowed scopes.
  let scopes: GatewayScope[] = client.scopes;
  if (requestedScopes && requestedScopes.length > 0) {
    const allowed = new Set(client.scopes);
    scopes = requestedScopes.filter((s) => allowed.has(s as GatewayScope)) as GatewayScope[];
    if (scopes.length === 0) return null;
  }

  const jti = randomBytes(16).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  const payload: GatewayTokenPayload = {
    sub: client.id,
    clientId: client.clientId,
    scopes,
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SECONDS,
    jti,
  };

  if (!hasJwtKeysConfigured()) {
    // Fallback: use an HS256 token only for development. Never use this in production.
    const fallbackSecret = process.env.GATEWAY_JWT_FALLBACK_SECRET || 'insecure-fallback-secret';
    const token = jwt.sign(payload, fallbackSecret, { algorithm: 'HS256', issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
    return { client, token };
  }

  const token = jwt.sign(payload, JWT_PRIVATE_KEY, {
    algorithm: 'RS256',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
  return { client, token };
}

export function requireGatewayAuth(req: GatewayRequest, res: Response, next: NextFunction): void {
  const auth = req.header('authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'invalid_token', error_description: 'Missing or invalid Authorization header.' });
    return;
  }
  const token = auth.slice(7);

  let payload: GatewayTokenPayload;
  try {
    if (hasJwtKeysConfigured()) {
      payload = jwt.verify(token, JWT_PUBLIC_KEY, {
        algorithms: ['RS256'],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }) as GatewayTokenPayload;
    } else {
      const fallbackSecret = process.env.GATEWAY_JWT_FALLBACK_SECRET || 'insecure-fallback-secret';
      payload = jwt.verify(token, fallbackSecret, {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }) as GatewayTokenPayload;
    }
  } catch {
    res.status(401).json({ error: 'invalid_token', error_description: 'Token expired or signature invalid.' });
    return;
  }

  const client = db.gatewayClients.find((c) => c.id === payload.sub && c.isActive);
  if (!client) {
    res.status(401).json({ error: 'invalid_token', error_description: 'Client inactive or revoked.' });
    return;
  }

  const ip = getClientIp(req);
  if (!isIpAllowed(client, ip)) {
    res.status(403).json({ error: 'access_denied', error_description: 'Request origin IP not allowed.' });
    return;
  }

  client.lastUsedAt = new Date().toISOString();
  req.gatewayClient = client;
  req.gatewayClientId = client.clientId;
  req.gatewayScopes = payload.scopes;
  next();
}

export function requireGatewayScope(...required: GatewayScope[]) {
  return (req: GatewayRequest, res: Response, next: NextFunction): void => {
    const scopes: GatewayScope[] = req.gatewayScopes || [];
    const hasAll = required.every((s) => scopes.includes(s));
    if (!hasAll) {
      res.status(403).json({ error: 'insufficient_scope', error_description: `Required scope(s): ${required.join(', ')}.` });
      return;
    }
    next();
  };
}

export function gatewayTokenTtl(): number {
  return ACCESS_TOKEN_TTL_SECONDS;
}
