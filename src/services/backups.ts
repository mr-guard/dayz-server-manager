import { Manager } from '../control/manager';
import { LogLevel } from '../util/logger';
import * as path from 'path';
import { Paths } from '../services/paths';
import { FileDescriptor } from '../types/log-reader';
import { IService } from '../types/service';
import { LoggerFactory } from './loggerfactory';
import { FSAPI, InjectionTokens } from '../util/apis';
import { inject, injectable, singleton } from 'tsyringe';

@singleton()
@injectable()
export class Backups extends IService {

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private paths: Paths,
        @inject(InjectionTokens.fs) private fs: FSAPI,
    ) {
        super(loggerFactory.createLogger('Backups'));
    }

    public async createBackup(): Promise<void> {
        const backups = this.getBackupDir();

        await this.fs.promises.mkdir(backups, { recursive: true });

        const mpmissions = path.resolve(path.join(this.manager.getServerPath(), 'mpmissions'));
        if (!this.fs.existsSync(mpmissions)) {
            this.log.log(LogLevel.WARN, 'Skipping backup because mpmissions folder does not exist');
            return;
        }

        const now = new Date();
        const curMarker = `mpmissions_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;

        this.log.log(LogLevel.IMPORTANT, `Creating backup ${curMarker}`);

        const curBackup = path.join(backups, curMarker);
        await this.paths.copyDirFromTo(mpmissions, curBackup);

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
        const files = await this.fs.promises.readdir(backups);
        const foundBackups: FileDescriptor[] = [];
        for (const file of files) {
            const fullPath = path.join(backups, file);
            const stats = await this.fs.promises.stat(fullPath);
            if (file.startsWith('mpmissions_') && stats.isDirectory()) {
                foundBackups.push({
                    file,
                    mtime: stats.mtime.getTime(),
                });
            }
        }
        return foundBackups;
    }

    public async cleanup(): Promise<void> {
        const now = new Date().valueOf();
        const backups = await this.getBackups();
        for (const backup of backups) {
            if ((now - backup.mtime) > (this.manager.config.backupMaxAge * 24 * 60 * 60 * 1000)) {
                await this.paths.removeLink(backup.file);
            }
        }
    }

}
