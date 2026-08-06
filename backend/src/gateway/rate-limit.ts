// ===========================================================================
// API Gateway — Rate limiting per client + IP allowlist helpers
// ===========================================================================

import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import type { GatewayRequest } from './auth.js';

export function createGatewayRateLimiter() {
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: (req: Request) => {
      const client = (req as GatewayRequest).gatewayClient;
      return client?.rateLimit || 1000;
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const client = (req as GatewayRequest).gatewayClient;
      return client?.id || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'rate_limit_exceeded',
        error_description: 'Hourly request quota exceeded for this client.',
      });
    },
  });
}

export function createTokenRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const clientId = (req.body?.client_id as string) || req.ip || 'unknown';
      return clientId;
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'rate_limit_exceeded',
        error_description: 'Too many token requests. Try again later.',
      });
    },
  });
}
