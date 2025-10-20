import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/api-key-service';

export interface ApiAuthRequest extends Request {
  apiKey?: any;
  apiUser?: any;
}

export async function verifyApiKey(req: ApiAuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'API key required. Use Authorization: Bearer sk_xxx' 
    });
  }

  const key = authHeader.substring(7);

  try {
    const apiKey = await apiKeyService.verifyApiKey(key);

    if (!apiKey) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid or expired API key' 
      });
    }

    const canProceed = await apiKeyService.checkRateLimit(apiKey);

    if (!canProceed) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        message: 'Too many requests. Please try again later.' 
      });
    }

    await apiKeyService.logApiRequest(apiKey, {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    req.apiKey = apiKey;
    req.apiUser = { id: apiKey.user_id };

    next();
  } catch (error) {
    console.error('API key verification error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: 'Failed to verify API key' 
    });
  }
}

export function requireScope(requiredScope: string) {
  return (req: ApiAuthRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const scopes = typeof req.apiKey.scopes === 'string' 
      ? JSON.parse(req.apiKey.scopes) 
      : req.apiKey.scopes;

    if (!scopes.includes(requiredScope) && !scopes.includes('admin')) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: `This operation requires the '${requiredScope}' scope` 
      });
    }

    next();
  };
}
