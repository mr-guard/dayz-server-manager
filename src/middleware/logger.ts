import { Request, Response } from 'express';
import { Logger, LogLevel } from '../util/logger';

const logger = new Logger('HTTP API');

export const loggerMiddleware = (req: Request, resp: Response, next: any): void => {
    logger.log(
        LogLevel.DEBUG,
        'Request:',
        req.method,
        req.path,
        typeof req.body === 'object' ? JSON.stringify(req.body) : req.body,
    );
    next();
};
