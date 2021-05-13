import { Manager } from '../control/manager';
import { Logger, LogLevel } from '../util/logger';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import { Paths } from '../util/paths';
import { FileDescriptor } from '../types/log-reader';

export class Backups {

    private log = new Logger('Backups');

    private paths = new Paths();

    public constructor(
        public manager: Manager,
    ) {}

    public async createBackup(): Promise<void> {
        const backups = this.getBackupDir();

        await fse.ensureDir(backups);

        const mpmissions = path.resolve(path.join(this.manager.getServerPath(), 'mpmissions'));
        if (!fs.existsSync(mpmissions)) {
            this.log.log(LogLevel.WARN, 'Skipping backup because mpmissions folder does not exist');
            return;
        }

        const now = new Date();
        const curMarker = `mpmissions_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;

        this.log.log(LogLevel.IMPORTANT, `Creating backup ${curMarker}`);

        const curBackup = path.join(backups, curMarker);
        await fse.ensureDir(curBackup);
        await fse.copy(mpmissions, curBackup);

        void this.cleanup();
    }

    private getBackupDir(): string {
        if (path.isAbsolute(this.manager.config.backupPath)) {
            return this.manager.config.backupPath;
        }
        return path.resolve(path.join(this.paths.cwd(), this.manager.config.backupPath));
    }

    public async getBackups(): Promise<FileDescriptor[]> {
        const backups = this.getBackupDir();
        const files = await fs.promises.readdir(backups);
        const foundBackups: FileDescriptor[] = [];
        for (const file of files) {
            const fullPath = path.join(backups, file);
            const stats = await fs.promises.stat(fullPath);
            if (file.startsWith('mpmissions_') && stats.isDirectory()) {
                foundBackups.push({
                    file,
                    mtime: stats.mtime.getTime(),
                });
            }
        }
        return foundBackups;
    }

    private async cleanup(): Promise<void> {
        const now = new Date().valueOf();
        const backups = await this.getBackups();
        for (const backup of backups) {
            if ((now - backup.mtime) > (this.manager.config.backupMaxAge * 24 * 60 * 60 * 1000)) {
                await fs.promises.rm(
                    backup.file,
                    {
                        force: true,
                        recursive: true,
                    },
                );
            }
        }
    }

}
