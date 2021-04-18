import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';

export const download = (url: string, target: string): Promise<void> => {
    return new Promise<void>((r) => {

        const dirname = path.dirname(target);
        if (!fs.existsSync(dirname)) {
            fs.mkdirSync(dirname);
        }

        const file = fs.createWriteStream(target);
        (url.startsWith('https') ? https : http).get(
            url,
            (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    r();
                });
            },
        );

    });
};
