import * as fs from 'fs';
import * as path from 'path';
import * as extractzip from 'extract-zip';
import { Manager } from '../control/manager';
import { Paths } from '../util/paths';
import { Processes } from '../util/processes';
import { download } from '../util/download';
import { Logger, LogLevel } from '../util/logger';
import { sameDirHash } from '../util/compare-folders';

export class SteamCMD {

    private static log = new Logger('SteamCMD');

    private static readonly DAYZ_APP_ID = '221100';
    private static readonly DAYZ_SERVER_APP_ID = '223350';
    private static readonly DAYZ_EXPERIMENTAL_SERVER_APP_ID = '1042420';

    private progressLog: boolean = true;

    public constructor(
        public manager: Manager,
    ) {}

    private getCmdPath(): string {
        let cmdFolder = this.manager.config?.steamCmdPath ?? '';
        if (!path.isAbsolute(cmdFolder)) {
            cmdFolder = path.join(Paths.cwd(), cmdFolder);
        }
        return path.join(
            cmdFolder,
            'steamcmd.exe',
        );
    }

    private async downloadSteamCmd(): Promise<boolean> {

        const cmdPath = this.manager.config!.steamCmdPath;
        const zipPath = path.join(cmdPath, 'steamcmd.zip');

        try {
            await download(
                'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip',
                zipPath,
            );
            SteamCMD.log.log(LogLevel.IMPORTANT, 'Download of SteamCMD done');
        } catch (e) {
            SteamCMD.log.log(LogLevel.ERROR, 'Failed to download SteamCMD', e);
            if (fs.existsSync(zipPath)) {
                fs.unlinkSync(zipPath);
            }
            return false;
        }

        try {
            await extractzip(zipPath, { dir: path.resolve(cmdPath) });
            SteamCMD.log.log(LogLevel.IMPORTANT, 'Extraction of SteamCMD done');
        } catch (e) {
            SteamCMD.log.log(LogLevel.ERROR, 'Failed to extract SteamCMD', e);
            if (fs.existsSync(zipPath)) {
                fs.unlinkSync(zipPath);
            }
            return false;
        }

        if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
        }

        // wait for the exe not to be 'busy'
        await new Promise((r) => setTimeout(r, 5000));

        return true;
    }

    private async installSteamCmd(): Promise<boolean> {
        SteamCMD.log.log(LogLevel.IMPORTANT, 'Checking/Installing SteamCMD');
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
                await Processes.spawnForOutput(
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
                    SteamCMD.log.log(LogLevel.INFO, `Retrying "${argsStr}" because of timeout`);
                } else {
                    SteamCMD.log.log(LogLevel.ERROR, `SteamCMD "${argsStr}" failed`, e);
                    if (!this.progressLog) {
                        SteamCMD.log.log(LogLevel.INFO, e.stdout);
                        SteamCMD.log.log(LogLevel.ERROR, e.stderr);
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
        if (!fs.existsSync(serverPath)) {
            SteamCMD.log.log(LogLevel.DEBUG, `Creating Serverfolder @ ${serverPath}`);
            fs.mkdirSync(serverPath);
        }

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
            SteamCMD.log.log(LogLevel.ERROR, 'Failed to update server');
            return false;
        }

        return this.checkServer();

    }

    private getWsBasePath(): string {
        let wsPath = this.manager.config!.steamWorkshopPath;
        if (!path.isAbsolute(wsPath)) {
            wsPath = path.join(Paths.cwd(), wsPath);
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
            return `@${modName
                .replace(/"/g, '')
                .replace(/;/g, '')
                .replace(/\//g, '-')
                .replace(/\\/g, '-')
                .replace(/ /g, '-')}`;
        }
        return '';
    }

    public buildWsModParams(): string[] {
        return (this.manager.config?.steamWsMods ?? [])
            .map((x) => this.getWsModName(x));
    }

    public async updateMod(modId: string): Promise<boolean> {

        const wsBasePath = this.getWsBasePath();
        if (!fs.existsSync(wsBasePath)) {
            SteamCMD.log.log(LogLevel.DEBUG, `Creating Workshop Folder @ ${wsBasePath}`);
            fs.mkdirSync(wsBasePath);
        }

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
            SteamCMD.log.log(LogLevel.ERROR, `Failed to update mod: ${modId}`);
            return false;
        }

        const modName = this.getWsModName(modId);
        return !!modName;
    }

    public async updateMods(): Promise<boolean> {
        const modIds = (this.manager.config?.steamWsMods ?? []);
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

    public async installMod(modId: string): Promise<boolean> {
        const modName = this.getWsModName(modId);
        if (!modName) {
            return false;
        }

        const modDir = path.join(this.getWsPath(), modId);
        const serverDir = path.join(this.manager.getServerPath(), modName);
        if (this.manager.config.linkModDirs) {
            SteamCMD.log.log(LogLevel.INFO, `Linking mod (${modId}) dir`);
            if (!Paths.linkDirsFromTo(
                modDir,
                serverDir,
            )) {
                SteamCMD.log.log(LogLevel.ERROR, `Linking mod (${modId}) dir failed`);
                return false;
            }
        } else {

            // eslint-disable-next-line no-lonely-if
            if (await sameDirHash(modDir, serverDir)) {
                SteamCMD.log.log(LogLevel.INFO, `Skipping copy of mod (${modId}) dir because its already up to date`);
            } else {
                SteamCMD.log.log(LogLevel.INFO, `Copying mod (${modId}) dir`);
                // eslint-disable-next-line no-lonely-if
                if (!await Paths.copyDirFromTo(
                    modDir,
                    serverDir,
                )) {
                    SteamCMD.log.log(LogLevel.ERROR, `Copying mod (${modId}) dir failed`);
                    return false;
                }
            }

        }

        return this.copyModKeys(modId);
    }

    public async installMods(): Promise<boolean> {
        const modIds = (this.manager.config?.steamWsMods ?? []);
        return (await Promise.all(modIds.map((modId) => {
            return this.installMod(modId);
        }))).every((x) => x);
    }

    private async copyModKeys(modId: string): Promise<boolean> {
        const keysFolder = path.join(this.manager.getServerPath(), 'keys');
        const modName = this.getWsModName(modId);
        const modDir = path.join(this.getWsPath(), modId);
        SteamCMD.log.log(LogLevel.DEBUG, `Searching keys for ${modName}`);
        const keys = await Paths.findFilesInDir(modDir, /.*\.bikey/g);
        for (const key of keys) {
            const keyName = path.basename(key);
            SteamCMD.log.log(LogLevel.INFO, `Copying ${modName} key ${keyName}`);
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
        return (this.manager.config?.steamWsMods ?? [])
            .every((modId) => {
                const modDir = path.join(wsPath, modId);
                if (!fs.existsSync(modDir)) {
                    SteamCMD.log.log(LogLevel.ERROR, `Mod ${modId} was not found`);
                    return false;
                }

                const modName = this.getWsModName(modId);
                if (!modName) {
                    SteamCMD.log.log(LogLevel.ERROR, `Modname for ${modId} was not found`);
                    return false;
                }

                const modServerDir = path.join(this.manager.getServerPath(), modName);
                if (!fs.existsSync(modServerDir)) {
                    SteamCMD.log.log(LogLevel.ERROR, `Mod Link for ${modName} was not found`);
                    return false;
                }

                return true;
            });
    }

}
