import type { Request, Response, NextFunction } from 'express';
export const ah = <T extends (req: Request, res: Response, next: NextFunction) => Promise<any>>(fn: T) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
