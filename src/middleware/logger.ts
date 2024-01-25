import { Request, Response } from 'express';
import { Logger, LogLevel } from '../util/logger';

const logger = new Logger('HTTP API');

/* istanbul ignore next */
export const loggerMiddleware = (req: Request, resp: Response, next: any): void => {
    if (process.env['DZSM_DEBUG_HTTP'] === 'true') {
        logger.log(
            LogLevel.DEBUG,
            'Request:',
            req.method,
            req.path,
            req.query,
            typeof req.body === 'object' ? JSON.stringify(req.body) : req.body,
            req.headers,
        );
        resp.on(
            'finish',
            () => {
                logger.log(
                    LogLevel.DEBUG,
                    'Response:',
                    resp.statusCode,
                );
            },
        );
    }
    next();
};
