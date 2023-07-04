import * as path from 'path';
import * as extract from 'extract-zip';
import * as tar from 'tar';
import { FSAPI, HTTPSAPI, InjectionTokens } from '../util/apis';
import { inject, injectable, singleton } from 'tsyringe';

@singleton()
@injectable()
export class Downloader {

    public constructor(
        @inject(InjectionTokens.fs) private fs: FSAPI,
        @inject(InjectionTokens.https) private http: HTTPSAPI,
    ) {}

    public download(
        url: string,
        target: string,
    ): Promise<void> {
        return new Promise<void>((res, rej) => {
            try {
                const dirname = path.dirname(target);
                this.fs.mkdirSync(dirname, { recursive: true });

                const file = this.fs.createWriteStream(target);
                this.http.get(
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
    }

    /* istanbul ignore next */
    public extractZip(zip: string, toDir: string): Promise<void> {
        return extract(zip, { dir: toDir });
    }

    /* istanbul ignore next */
    public extractTar(tarPath: string, toDir: string): Promise<void> {
        return tar.extract(
            {
                file: tarPath,
                cwd: toDir,
            },
        );
    }

}
