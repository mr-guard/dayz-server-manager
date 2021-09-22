
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { Logger, LogLevel } from './logger';
import { detectOS } from './detect-os';

export class Paths {

    private log = new Logger('Paths');

    public cwd(): string {
        return process.cwd();
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

        if (!fs.existsSync(dir)) {
            return results;
        }

        const files = await fse.readdir(dir);
        for (const file of files) {
            const filename = path.join(dir, file);
            const stat = await fse.lstat(filename);
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
        const stat = fs.lstatSync(src);
        if (stat.isDirectory()) {
            const files = fs.readdirSync(src);
            for (const file of files) {
                const fullPath = path.join(src, file);
                const fullDest = path.join(dest, file);
                this.copyFromPkg(fullPath, fullDest);
            }
        } else {
            fse.ensureDirSync(path.dirname(dest));
            const buff = fs.readFileSync(src);
            fs.writeFileSync(dest, buff);
        }
    }

    public removeLink(target: string): boolean {
        if (detectOS() === 'windows') {
            // cmd //c rmdir "$__TARGET_DIR"
            return (spawnSync(
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
                const stats = fse.statSync(target);
                if (stats.isSymbolicLink()) {
                    fse.unlinkSync(target);
                } else if (stats.isDirectory()) {
                    fse.rmSync(
                        target,
                        {
                            recursive: true,
                        },
                    );
                } else {
                    fse.rmSync(target);
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
                if (fs.existsSync(target)) {
                    if (!this.removeLink(target)) {
                        this.log.log(LogLevel.ERROR, 'Could not remove link before creating new one');
                        return false;
                    }
                }
                return (spawnSync(
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
                if (fs.existsSync(target)) {
                    if (!this.removeLink(target)) {
                        this.log.log(LogLevel.ERROR, 'Could not remove link before creating new one');
                        return false;
                    }
                }
                fs.symlinkSync(source, target);
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
            if (fs.existsSync(target)) {
                if (!this.removeLink(target)) {
                    this.log.log(LogLevel.ERROR, 'Could not remove dir before creating new one');
                    return false;
                }
            }

            await fse.ensureDir(target);
            await fse.copy(source, target);

            return true;
        } catch (e) {
            this.log.log(LogLevel.ERROR, `Error copying ${source} to ${target}`, e);
            return false;
        }
    }

}
