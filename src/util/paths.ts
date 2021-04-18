
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { Logger, LogLevel } from './logger';

export class Paths {

    private static log = new Logger('Paths');

    public static cwd(): string {
        return process.cwd();
    }

    public static samePath(p1: string, p2: string): boolean {

        if (!p1 || !p2) return false;

        const p1Norm = p1
            .replace(/\\/g, '/')
            .toLowerCase()
            .split('/')
            .filter((x) => !!x);
        const p2Norm = p2
            .replace(/\\/g, '/')
            .toLowerCase()
            .split('/')
            .filter((x) => !!x);

        return (
            (p1Norm.length === p2Norm.length)
            && p1Norm.every((val, i) => val === p2Norm[i])
        );
    }

    public static findFilesInDir(dir: string, filter: RegExp): string[] {
        const results: string[] = [];

        if (!fs.existsSync(dir)) {
            return results;
        }

        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filename = path.join(dir, file);
            const stat = fs.lstatSync(filename);
            if (stat.isDirectory()) {
                results.push(...Paths.findFilesInDir(filename, filter));
            } else if (filter.test(filename)) {
                results.push(filename);
            }
        }
        return results;
    }

    public static removeLink(target: string): boolean {
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

    public static linkDirsFromTo(source: string, target: string): boolean {
        // cmd //c mklink //j "$__TARGET_DIR" "$__SOURCE_DIR"
        try {
            if (fs.existsSync(target)) {
                if (!Paths.removeLink(target)) {
                    Paths.log.log(LogLevel.ERROR, 'Could not remove link before creating new one');
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
            Paths.log.log(LogLevel.ERROR, `Error linking ${source} to ${target}`, e);
            return false;
        }
    }

    public static copyDirFromTo(source: string, target: string): boolean {
        try {
            if (fs.existsSync(target)) {
                if (!Paths.removeLink(target)) {
                    Paths.log.log(LogLevel.ERROR, 'Could not remove dir before creating new one');
                    return false;
                }
            }

            fse.ensureDirSync(target);

            try {
                fse.copySync(source, target);
                return true;
            } catch {
                return false;
            }
        } catch (e) {
            Paths.log.log(LogLevel.ERROR, `Error linking ${source} to ${target}`, e);
            return false;
        }
    }

}
