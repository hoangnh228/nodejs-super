import { NextFunction, Request, RequestHandler, Response } from 'express'

export const wrapRequestHandler = (callback: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await callback(req, res, next)
    } catch (error) {
      next(error)
    }
  }
}
