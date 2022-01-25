import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import { Manager } from '../control/manager';
import { Paths } from '../util/paths';
import { Processes } from '../util/processes';
import { download, extractZip } from '../util/download';
import { Logger, LogLevel } from '../util/logger';
import { sameDirHash } from '../util/compare-folders';
import { IService } from '../types/service';

export class SteamCMD implements IService {

    private static readonly DAYZ_APP_ID = '221100';
    private static readonly DAYZ_SERVER_APP_ID = '223350';
    private static readonly DAYZ_EXPERIMENTAL_SERVER_APP_ID = '1042420';

    // time to wait after the zip has been extracted (to avoid errors)
    private extractDelay = 5000;

    private log = new Logger('SteamCMD');

    private paths = new Paths();

    private processes = new Processes();

    private progressLog: boolean = true;

    public constructor(
        public manager: Manager,
    ) {}

    private getCmdPath(): string {
        let cmdFolder = this.manager.config?.steamCmdPath ?? '';
        if (!path.isAbsolute(cmdFolder)) {
            cmdFolder = path.join(this.paths.cwd(), cmdFolder);
        }
        return path.join(
            cmdFolder,
            'steamcmd.exe',
        );
    }

    private async downloadSteamCmd(): Promise<boolean> {

        const cmdPath = path.dirname(this.getCmdPath());
        const zipPath = path.join(cmdPath, 'steamcmd.zip');

        try {
            await download(
                'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip',
                zipPath,
            );
            this.log.log(LogLevel.IMPORTANT, 'Download of SteamCMD done');
        } catch (e) {
            this.log.log(LogLevel.ERROR, 'Failed to download SteamCMD', e);
            if (fs.existsSync(zipPath)) {
                fs.unlinkSync(zipPath);
            }
            return false;
        }

        try {
            await extractZip(zipPath, { dir: path.resolve(cmdPath) });
            this.log.log(LogLevel.IMPORTANT, 'Extraction of SteamCMD done');
        } catch (e) {
            this.log.log(LogLevel.ERROR, 'Failed to extract SteamCMD', e);
            if (fs.existsSync(zipPath)) {
                fs.unlinkSync(zipPath);
            }
            return false;
        }

        if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
        }

        // wait for the exe not to be 'busy'
        await new Promise((r) => setTimeout(r, this.extractDelay));

        return true;
    }

    private async installSteamCmd(): Promise<boolean> {
        this.log.log(LogLevel.IMPORTANT, 'Checking/Installing SteamCMD');
        return this.execute(['validate', '+quit']);
    }

    public async checkSteamCmd(): Promise<boolean> {

        const cmdFolder = this.manager.config?.steamCmdPath;
        if (!cmdFolder) {
            return false;
        }

        if (!fs.existsSync(this.getCmdPath())) {
            if (!await this.downloadSteamCmd()) {
                return false;
            }
        }

        return this.installSteamCmd();

    }

    private getLoginArgs(): string[] {
        return [
            '+login',
            this.manager.config!.steamUsername,
            this.manager.config!.steamPassword ?? '',
        ];
    }

    private async execute(args: string[]): Promise<boolean> {
        let retries = 3;
        while (retries >= 0) {
            try {
                await this.processes.spawnForOutput(
                    this.getCmdPath(),
                    args,
                    {
                        verbose: this.progressLog,
                        ignoreCodes: [
                            6, // on gameupdate when the game was already up2date
                            7, // no command
                        ],
                        spawnOpts: {
                            cwd: this.manager.config?.steamCmdPath,
                            stdio: [
                                'inherit', // inherit stdin to enable input of password / steam guard code
                                'inherit',
                                'inherit',
                            ],
                        },
                    },
                );
                return true;
            } catch (e) {
                const argsStr = args.map((x) => ((x === this.manager.config!.steamPassword) ? '******' : x)).join(' ');
                if (e.status === 10 && retries > 1) {
                    // timeout && some retries left
                    retries--;
                    this.log.log(LogLevel.INFO, `Retrying "${argsStr}" because of timeout`);
                } else {
                    this.log.log(LogLevel.ERROR, `SteamCMD "${argsStr}" failed`, e);
                    if (!this.progressLog) {
                        this.log.log(LogLevel.INFO, e.stdout);
                        this.log.log(LogLevel.ERROR, e.stderr);
                    }
                    return false;
                }
            }
        }
        return false;
    }

    public async checkServer(): Promise<boolean> {

        const serverFolder = this.manager.getServerPath();
        const serverExe = this.manager.config?.serverExe;

        return !!serverFolder && !!serverExe
        && fs.existsSync(path.join(serverFolder, serverExe));

    }

    public async updateServer(): Promise<boolean> {

        const serverPath = this.manager.getServerPath();
        fse.ensureDirSync(serverPath);

        const success = await this.execute([
            ...this.getLoginArgs(),
            '+force_install_dir',
            serverPath,
            '+app_update',
            (this.manager.config?.experimentalServer ? SteamCMD.DAYZ_EXPERIMENTAL_SERVER_APP_ID : SteamCMD.DAYZ_SERVER_APP_ID),
            'validate',
            '+quit',
        ]);

        if (!success) {
            this.log.log(LogLevel.ERROR, 'Failed to update server');
            return false;
        }

        return this.checkServer();

    }

    private getWsBasePath(): string {
        let wsPath = this.manager.config!.steamWorkshopPath;
        if (!path.isAbsolute(wsPath)) {
            wsPath = path.join(this.paths.cwd(), wsPath);
        }
        return wsPath;
    }

    private getWsPath(): string {
        return path.join(this.getWsBasePath(), 'steamapps/workshop/content', SteamCMD.DAYZ_APP_ID);
    }

    public getWsModName(modId: string): string {
        const wsPath = this.getWsPath();
        const modMeta = path.join(wsPath, modId, 'meta.cpp');
        if (!fs.existsSync(modMeta)) {
            return '';
        }
        const metaContent = fs.readFileSync(modMeta).toString();
        const names = metaContent.match(/name[\s]*=.*/g) ?? [];
        const modName = names.pop()?.split('=')[1]?.trim() ?? '';
        if (modName) {
            return '@' + modName
            .replace(/\//g, '-')
            .replace(/\\/g, '-')
            .replace(/ /g, '-')
            .replace(/[^a-zA-Z0-9\-_]/g, '');
        }
        return '';
    }

    public buildWsModParams(): string[] {
        return this.manager.getModIdList()
            .map((x) => this.getWsModName(x));
    }

    public async updateMod(modId: string): Promise<boolean> {

        const wsBasePath = this.getWsBasePath();
        fse.ensureDirSync(wsBasePath);

        const success = await this.execute([
            ...this.getLoginArgs(),
            '+force_install_dir',
            wsBasePath,
            '+workshop_download_item',
            SteamCMD.DAYZ_APP_ID,
            modId,
            'validate',
            '+quit',
        ]);

        if (!success) {
            this.log.log(LogLevel.ERROR, `Failed to update mod: ${modId}`);
            return false;
        }

        const modName = this.getWsModName(modId);
        return !!modName;
    }

    public async updateMods(): Promise<boolean> {
        const modIds = this.manager.getModIdList();
        // single mod updates must be run synchronously
        // updating multiple mods at once increases the chance of timeouts
        // the retry would then cause the whole process to start all over
        for (const modId of modIds) {
            if (!await this.updateMod(modId)) {
                return false;
            }
        }
        return true;
    }

    private async sameModMeta(modDir: string, serverDir: string): Promise<boolean> {
        const modMeta = path.join(modDir, 'meta.cpp');
        const serverMeta = path.join(serverDir, 'meta.cpp');
        if (
            !fs.existsSync(modMeta)
            || !fs.existsSync(serverMeta)
        ) {
            return false;
        }

        return `${fs.readFileSync(modMeta)}` === `${fs.readFileSync(serverMeta)}`;
    }

    public async installMod(modId: string): Promise<boolean> {
        const modName = this.getWsModName(modId);
        if (!modName) {
            return false;
        }

        const modDir = path.join(this.getWsPath(), modId);
        const serverDir = path.join(this.manager.getServerPath(), modName);
        if (this.manager.config.linkModDirs) {
            this.log.log(LogLevel.INFO, `Linking mod (${modId}) dir`);
            if (!this.paths.linkDirsFromTo(
                modDir,
                serverDir,
            )) {
                this.log.log(LogLevel.ERROR, `Linking mod (${modId}) dir failed`);
                return false;
            }
        } else {

            let isUp2Date = false;

            if (
                !isUp2Date
                && this.manager.config.copyModDeepCompare
                && await sameDirHash(modDir, serverDir)
            ) {
                isUp2Date = true;
            }

            if (
                !isUp2Date
                && !this.manager.config.copyModDeepCompare
            ) {
                isUp2Date = await this.sameModMeta(modDir, serverDir);
            }

            if (isUp2Date) {
                this.log.log(LogLevel.INFO, `Skipping copy of mod (${modId}) dir because its already up to date`);
            } else {
                this.log.log(LogLevel.INFO, `Copying mod (${modId}) dir`);
                if (!await this.paths.copyDirFromTo(
                    modDir,
                    serverDir,
                )) {
                    this.log.log(LogLevel.ERROR, `Copying mod (${modId}) dir failed`);
                    return false;
                }
            }

        }

        return this.copyModKeys(modId);
    }

    public async installMods(): Promise<boolean> {
        const modIds = this.manager.getModIdList();
        return (await Promise.all(modIds.map((modId) => {
            return this.installMod(modId);
        }))).every((x) => x);
    }

    private async copyModKeys(modId: string): Promise<boolean> {
        const keysFolder = path.join(this.manager.getServerPath(), 'keys');
        const modName = this.getWsModName(modId);
        const modDir = path.join(this.getWsPath(), modId);
        this.log.log(LogLevel.DEBUG, `Searching keys for ${modName}`);
        const keys = await this.paths.findFilesInDir(modDir, /.*\.bikey/g);
        for (const key of keys) {
            const keyName = path.basename(key);
            this.log.log(LogLevel.INFO, `Copying ${modName} key ${keyName}`);
            const target = path.join(keysFolder, keyName);
            if (fs.existsSync(target)) {
                fs.unlinkSync(target);
            }
            await fs.promises.copyFile(key, target);
        }
        return true;
    }

    public async checkMods(): Promise<boolean> {
        const wsPath = this.getWsPath();
        return this.manager.getModIdList()
            .every((modId) => {
                const modDir = path.join(wsPath, modId);
                if (!fs.existsSync(modDir)) {
                    this.log.log(LogLevel.ERROR, `Mod ${modId} was not found`);
                    return false;
                }

                const modName = this.getWsModName(modId);
                if (!modName) {
                    this.log.log(LogLevel.ERROR, `Modname for ${modId} was not found`);
                    return false;
                }

                const modServerDir = path.join(this.manager.getServerPath(), modName);
                if (!fs.existsSync(modServerDir)) {
                    this.log.log(LogLevel.ERROR, `Mod Link for ${modName} was not found`);
                    return false;
                }

                return true;
            });
    }

}
