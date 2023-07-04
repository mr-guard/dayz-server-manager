import * as path from 'path';
import { LogLevel } from '../util/logger';
import { detectOS } from '../util/detect-os';
import { inject, injectable, singleton } from 'tsyringe';
import { CHILDPROCESSAPI, FSAPI, InjectionTokens } from '../util/apis';
import { IService } from '../types/service';
import { LoggerFactory } from './loggerfactory';

export const copySync = (fs: FSAPI, source: string, target: string): void => {

    // src=somedir/test target=tmp -> tmp/test
    if (fs.lstatSync(source).isDirectory()) {
        if (!fs.existsSync(target)) {
            fs.mkdirSync(target, { recursive: true });
        }
        fs.readdirSync(source).forEach((file) => {
            const curSource = path.join(source, file);
            const curTarget = path.join(target, file);
            if (fs.lstatSync(curSource).isDirectory()) {
                copySync(fs, curSource, curTarget);
            } else {
                fs.copyFileSync(curSource, curTarget);
            }
        });
    } else {
        if (!fs.existsSync(target)) {
            fs.mkdirSync(target, { recursive: true });
        }
        fs.copyFileSync(source, path.join(target, path.basename(source)));
    }
};

@singleton()
@injectable()
export class Paths extends IService {

    private workingDir: string = process.cwd();

    public constructor(
        loggerFactory: LoggerFactory,
        @inject(InjectionTokens.fs) private fs: FSAPI,
        @inject(InjectionTokens.childProcess) private childProcess: CHILDPROCESSAPI,
    ) {
        super(loggerFactory.createLogger('Paths'));
    }

    /* istanbul ignore next */
    public setCwd(workingDir: string): void {
        this.workingDir = workingDir;
    }

    /* istanbul ignore next */
    public cwd(): string {
        return this.workingDir;
    }

    public samePath(p1: string, p2: string): boolean {

        if (!p1 || !p2) return false;

        const p1Norm = p1
            .replace(/\\/g, '/')
            .toLowerCase()
            .split('/');
        const p2Norm = p2
            .replace(/\\/g, '/')
            .toLowerCase()
            .split('/');

        return (
            (p1Norm.length === p2Norm.length)
            && p1Norm.every((val, i) => val === p2Norm[i])
        );
    }

    public async findFilesInDir(dir: string, filter?: RegExp): Promise<string[]> {
        const results: string[] = [];

        if (!this.fs.existsSync(dir)) {
            return results;
        }

        const files = await this.fs.promises.readdir(dir);
        for (const file of files) {
            const filename = path.join(dir, file);
            const stat = await this.fs.promises.lstat(filename);
            if (stat.isDirectory()) {
                results.push(...(await this.findFilesInDir(filename, filter)));
            } else if (!filter || filter.test(filename)) {
                results.push(filename);
            }
        }
        return results;
    }

    // https://github.com/vercel/pkg/issues/420
    public copyFromPkg(src: string, dest: string): void {
        const stat = this.fs.lstatSync(src);
        if (stat.isDirectory()) {
            const files = this.fs.readdirSync(src);
            for (const file of files) {
                const fullPath = path.join(src, file);
                const fullDest = path.join(dest, file);
                this.copyFromPkg(fullPath, fullDest);
            }
        } else {
            this.fs.mkdirSync(path.dirname(dest), { recursive: true });
            const buff = this.fs.readFileSync(src);
            this.fs.writeFileSync(dest, buff);
        }
    }

    public removeLink(target: string): boolean {
        if (detectOS() === 'windows') {
            // cmd //c rmdir "$__TARGET_DIR"
            return (this.childProcess.spawnSync(
                'cmd',
                [
                    '/c',
                    'rmdir',
                    '/S',
                    '/Q',
                    target,
                ],
            ).status === 0);
        }

        if (detectOS() === 'linux') {

            try {
                const stats = this.fs.statSync(target);
                if (stats.isSymbolicLink()) {
                    this.fs.unlinkSync(target);
                } else if (stats.isDirectory()) {
                    this.fs.rmSync(
                        target,
                        {
                            recursive: true,
                        },
                    );
                } else {
                    this.fs.rmSync(target);
                }
            } catch {
                return false;
            }

            return true;
        }

        return false;
    }

    public linkDirsFromTo(source: string, target: string): boolean {
        if (detectOS() === 'windows') {
            // cmd //c mklink //j "$__TARGET_DIR" "$__SOURCE_DIR"
            try {
                if (this.fs.existsSync(target)) {
                    if (!this.removeLink(target)) {
                        this.log.log(LogLevel.ERROR, 'Could not remove link before creating new one');
                        return false;
                    }
                }
                return (this.childProcess.spawnSync(
                    'cmd',
                    [
                        '/c',
                        'mklink',
                        '/j',
                        target,
                        source,
                    ],
                ).status === 0);
            } catch (e) {
                this.log.log(LogLevel.ERROR, `Error linking ${source} to ${target}`, e);
                return false;
            }
        }

        if (detectOS() === 'linux') {
            try {
                if (this.fs.existsSync(target)) {
                    if (!this.removeLink(target)) {
                        this.log.log(LogLevel.ERROR, 'Could not remove link before creating new one');
                        return false;
                    }
                }
                this.fs.symlinkSync(source, target);
                return true;
            } catch (e) {
                this.log.log(LogLevel.ERROR, `Error linking ${source} to ${target}`, e);
                return false;
            }
        }

        return false;
    }

    public async copyDirFromTo(source: string, target: string): Promise<boolean> {
        try {
            if (this.fs.existsSync(target)) {
                if (!this.removeLink(target)) {
                    this.log.log(LogLevel.ERROR, 'Could not remove dir before creating new one');
                    return false;
                }
            }

            copySync(this.fs, source, target);

            return true;
        } catch (e) {
            this.log.log(LogLevel.ERROR, `Error copying ${source} to ${target}`, e);
            return false;
        }
    }

}

