// ===========================================================================
// API Gateway — Admin routes for client management (requires admin:gateway)
// ===========================================================================

import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { db, newId, nowIso } from '../store.js';
import { requireGatewayAuth, requireGatewayScope, type GatewayRequest } from './auth.js';
import { GATEWAY_SCOPES } from '../store.js';
import type { GatewayClient, GatewayScope } from '../types.js';

const router = Router();

router.use(requireGatewayAuth);

const clientSchema = z.object({
  name: z.string().min(1).max(128),
  scopes: z.array(z.string()).min(1),
  allowedIps: z.array(z.string()).default([]),
  rateLimit: z.number().int().min(1).max(1000000).default(1000),
  isActive: z.boolean().default(true),
});

router.get('/clients', requireGatewayScope('admin:gateway'), (req: GatewayRequest, res) => {
  res.json(
    db.gatewayClients.map((c) => ({
      id: c.id,
      name: c.name,
      clientId: c.clientId,
      scopes: c.scopes,
      allowedIps: c.allowedIps,
      rateLimit: c.rateLimit,
      isActive: c.isActive,
      createdAt: c.createdAt,
      lastUsedAt: c.lastUsedAt,
    })),
  );
});

router.post('/clients', requireGatewayScope('admin:gateway'), (req: GatewayRequest, res) => {
  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos.', details: parsed.error.flatten() });
  }
  const { name, scopes, allowedIps, rateLimit, isActive } = parsed.data;
  const validScopes = scopes.filter((s): s is GatewayScope => GATEWAY_SCOPES.includes(s as any));
  if (validScopes.length === 0) {
    return res.status(400).json({ error: 'Al menos un scope válido es requerido.', validScopes: GATEWAY_SCOPES });
  }
  const clientSecret = randomBytes(32).toString('hex');
  const clientId = `client_${randomBytes(8).toString('hex')}`;
  const client: GatewayClient = {
    id: newId('gw_client'),
    name,
    clientId,
    clientSecretHash: bcrypt.hashSync(clientSecret, 12),
    scopes: validScopes,
    allowedIps,
    rateLimit,
    isActive,
    createdAt: nowIso(),
    lastUsedAt: null,
  };
  db.gatewayClients.push(client);
  res.status(201).json({
    id: client.id,
    name: client.name,
    clientId: client.clientId,
    clientSecret, // Only returned once
    scopes: client.scopes,
    allowedIps: client.allowedIps,
    rateLimit: client.rateLimit,
    isActive: client.isActive,
    createdAt: client.createdAt,
  });
});

router.delete('/clients/:id', requireGatewayScope('admin:gateway'), (req: GatewayRequest, res) => {
  const idx = db.gatewayClients.findIndex((c) => c.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Cliente no encontrado.' });
  db.gatewayClients.splice(idx, 1);
  res.json({ ok: true });
});

router.post('/clients/:id/rotate-secret', requireGatewayScope('admin:gateway'), (req: GatewayRequest, res) => {
  const client = db.gatewayClients.find((c) => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado.' });
  const clientSecret = randomBytes(32).toString('hex');
  client.clientSecretHash = bcrypt.hashSync(clientSecret, 12);
  res.json({
    id: client.id,
    clientId: client.clientId,
    clientSecret, // Only returned once
  });
});

export default router;
