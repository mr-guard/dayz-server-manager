/* istanbul ignore file */

import { IncomingMessage, OutgoingHttpHeaders } from 'http';
import { HTTPSAPI } from './apis';

export const request = (
    https: HTTPSAPI,
    url: string | URL,
    opts?: {
        method?: string;
        headers?: OutgoingHttpHeaders;
        body?: string;
    },
): Promise<IncomingMessage & { body: string }> => {
    return new Promise<IncomingMessage & { body: string }>(
        (resolve, reject) => {
            const req = https.request(
                typeof url === 'string' ? new URL(url) : url,
                {
                    method: opts?.method || 'GET',
                    headers: opts?.headers,
                },
                (res) => {
                    const chunks = [];
                    res.on('data', (chunk) => {
                        if (chunk?.length) chunks.push(chunk);
                    });
                    res.on('end', (chunk) => {
                        if (chunk?.length) chunks.push(chunk);
                        (res as any).body = Buffer.concat(chunks).toString();
                        resolve(res as any);
                    });
                    res.on('error', (error) => {
                        reject(error);
                    });
                },
            );

            if (opts?.body) {
                req.write(opts.body);
            }
            req.end();
        },
    );
};
