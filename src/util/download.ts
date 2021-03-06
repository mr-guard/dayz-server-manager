import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import * as extract from 'extract-zip';

export const download = (url: string, target: string): Promise<void> => {
    return new Promise<void>((res, rej) => {
        try {
            const dirname = path.dirname(target);
            fse.ensureDirSync(dirname);

            const file = fs.createWriteStream(target);
            (url.startsWith('https') ? https : http).get(
                url,
                (response) => {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        res();
                    });
                },
            );
        } catch (e) {
            rej(e);
        }
    });
};

export const extractZip = (zip: string, opts: extract.Options): Promise<void> => {
    return extract(zip, opts);
};
