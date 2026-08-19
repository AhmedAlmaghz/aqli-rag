import type { Request, Response } from 'express';
import { createApp } from '../server.ts';

let cachedApp: any = null;

export default async function handler(req: Request, res: Response) {
  try {
    if (!cachedApp) {
      cachedApp = await createApp();
    }

    // Ensure URL has /api prefix for Express routing if stripped by Vercel
    if (req.url && !req.url.startsWith('/api')) {
      req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
    }

    return cachedApp(req, res);
  } catch (err: any) {
    console.error('Vercel Serverless Function Execution Error:', err);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'فشل في تشغيل الدالة السحابية على الخادم.',
        details: err?.message || 'Serverless initialization error',
        code: 'SERVERLESS_FUNCTION_ERROR'
      });
    }
  }
}
