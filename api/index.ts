import type { Request, Response } from 'express';
import { createApp } from '../server.ts';

let cachedAppPromise: Promise<any> | null = null;

export default async function handler(req: Request, res: Response) {
  if (!cachedAppPromise) {
    cachedAppPromise = createApp();
  }
  const app = await cachedAppPromise;
  return app(req, res);
}
