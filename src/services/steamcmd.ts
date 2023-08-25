import * as path from 'path';
import { Manager } from '../control/manager';
import { Paths } from '../services/paths';
import { Processes, SpawnOutput } from '../services/processes';
import { LogLevel } from '../util/logger';
import { sameDirHash } from '../util/compare-folders';
import { IService } from '../types/service';
import { detectOS } from '../util/detect-os';
import { inject, injectable, singleton } from 'tsyringe';
import { LoggerFactory } from './loggerfactory';
import { FSAPI, HTTPSAPI, InjectionTokens } from '../util/apis';
import { Downloader } from './download';
import { merge } from '../util/merge';
import { request } from '../util/request';
import { DAYZ_APP_ID, DAYZ_EXPERIMENTAL_SERVER_APP_ID, DAYZ_SERVER_APP_ID, LocalMetaData, PublishedFileDetail, SteamApiWorkshopItemDetailsResponse, SteamCmdAppUpdateProgressEvent, SteamCmdEvent, SteamCmdEventListener, SteamCmdExitEvent, SteamCmdModUpdateProgressEvent, SteamCmdOutputEvent, SteamCmdRetryEvent, SteamExitCodes } from '../types/steamcmd';
import { EventBus } from '../control/event-bus';
import { InternalEventTypes } from '../types/events';
import { RichEmbed } from 'discord.js';



@singleton()
@injectable()
export class SteamMetaData extends IService {

    private gameLastCheck: number;
    private gameMetaData: PublishedFileDetail[];

    private workshopMetaData: Map<string, { lastCheck: number; data: PublishedFileDetail }> = new Map();

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private paths: Paths,
        @inject(InjectionTokens.fs) private fs: FSAPI,
        @inject(InjectionTokens.https) private https: HTTPSAPI,
    ) {
        super(loggerFactory.createLogger('SteamAPI'));
    }

    private getMetaDataPath(): string {
        let metaFolder = this.manager.config?.steamMetaPath ?? '';
        if (!this.paths.isAbsolute(metaFolder)) {
            metaFolder = path.join(this.paths.cwd(), metaFolder);
        }
        return metaFolder;
    }

    public readLocalMeta(modId: string): LocalMetaData {
        const metaPath = path.join(this.getMetaDataPath(), `${modId}.json`);
        if (!this.fs.existsSync(metaPath)) {
            return {};
        }
        try {
            return JSON.parse(
                this.fs.readFileSync(metaPath, { encoding: 'utf-8' }),
            );
        } catch {}
        return {};
    }

    public writeLocalMeta(modId: string, data: LocalMetaData): void {
        this.fs.mkdirSync(this.getMetaDataPath(), { recursive: true });
        const modMetaPath = path.join(this.getMetaDataPath(), `${modId}.json`);
        this.fs.writeFileSync(modMetaPath, JSON.stringify(data));
    }

    public updateLocalModMeta(modId: string, update: LocalMetaData): void {
        this.writeLocalMeta(
            modId,
            merge(
                this.readLocalMeta(modId),
                update,
            ),
        );
    }

    public async modNeedsUpdate(modIds: string[]): Promise<string[]> {
        const remoteList = await this.getModsMetaData(modIds);
        return modIds.filter((modId) => {
            const local = this.readLocalMeta(modId)?.lastDownloaded;
            if (!local || !Number(local)) {
                return true;
            }
            const remote = remoteList.find((x) => x.publishedfileid === modId);
            const remoteTime = Number(remote?.time_updated || remote?.time_created || 0);
            const localTime = Math.round(Number(local) / 1000);
            return !remoteTime || localTime <= remoteTime;
        });
    }

    public async getModsMetaData(modIds: string[]): Promise<PublishedFileDetail[]> {
        if (!modIds?.length) {
            return [];
        }

        const modInfos: PublishedFileDetail[] = [];
        const requireUpdate: string[] = [];

        for (const modId of modIds) {
            const cache = this.workshopMetaData.get(modId);
            if (cache?.lastCheck && (new Date().valueOf() - cache.lastCheck) < 60000) {
                modInfos.push(cache.data);
            } else {
                requireUpdate.push(modId);
            }
        }

        if (requireUpdate?.length) {
            const response = (await this.requestWorkshopItemDetails(requireUpdate))?.response?.publishedfiledetails || [];
            for (const responseItem of response) {
                this.workshopMetaData.set(
                    responseItem.publishedfileid,
                    {
                        lastCheck: new Date().valueOf(),
                        data: responseItem,
                    },
                );
                modInfos.push(responseItem);
            }
        }

        return [...modInfos];
    }

    public async requestWorkshopItemDetails(ids: string[]): Promise<SteamApiWorkshopItemDetailsResponse | null> {
        try {

            const formData = new URLSearchParams();
            formData.append('format', 'json');
            formData.append('itemcount', `${ids.length}`);
            ids.forEach((x, i) => {
                formData.append(`publishedfileids[${i}]`, `${x}`);
            });

            const response = await request(
                this.https,
                'https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/',
                {
                    method: 'POST',
                    body: formData.toString(),
                    headers: {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                },
            );

            if (response.statusCode !== 200) {
                this.log.log(
                    LogLevel.WARN,
                    `Failed to request workshop details of ${ids}, because of http error: ${response.statusCode} (${response.statusMessage})`,
                );
                return null;
            }

            return JSON.parse(response.body);
        } catch (e) {
            this.log.log(LogLevel.WARN, `Failed to request workshop details of ${ids}`, e);
            return null;
        }
    }

}

@singleton()
@injectable()
export class SteamCMD extends IService {

    // time to wait after the zip has been extracted (to avoid errors)
    private extractDelay = 5000;

    private progressLog: boolean = true;

    private execMode: 'child_process' | 'pty' = 'pty';

    private progressRegex = /Update state \(0x\d+\) \w+, progress: (\d+.\d+) \((\d+) \/ (\d+)\)$/;

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private paths: Paths,
        private processes: Processes,
        private downloader: Downloader,
        private metaData: SteamMetaData,
        private eventBus: EventBus,
        @inject(InjectionTokens.fs) private fs: FSAPI,
    ) {
        super(loggerFactory.createLogger('SteamCMD'));
    }

    private getCmdPath(): string {
        let cmdFolder = this.manager.config?.steamCmdPath ?? '';
        if (!this.paths.isAbsolute(cmdFolder)) {
            cmdFolder = path.join(this.paths.cwd(), cmdFolder);
        }
        return path.join(
            cmdFolder,
            detectOS() === 'windows' ? 'steamcmd.exe' : 'steamcmd.sh',
        );
    }

    private async downloadSteamCmd(): Promise<boolean> {

        const cmdPath = path.dirname(this.getCmdPath());

        const isWindows = detectOS() === 'windows';
        const dlPath = isWindows
            ? path.join(cmdPath, 'steamcmd.zip')
            : path.join(cmdPath, 'steamcmd.tar.gz');
        const url = isWindows
            ? 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip'
            : 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz';

        try {
            await this.downloader.download(
                url,
                dlPath,
            );
            this.log.log(LogLevel.IMPORTANT, 'Download of SteamCMD done');
        } catch (e) {
            this.log.log(LogLevel.ERROR, 'Failed to download SteamCMD', e);
            if (this.fs.existsSync(dlPath)) {
                this.fs.unlinkSync(dlPath);
            }
            return false;
        }

        try {
            if (isWindows) {
                await this.downloader.extractZip(dlPath, cmdPath);
            } else {
                await this.downloader.extractTar(dlPath, cmdPath);
            }
            this.log.log(LogLevel.IMPORTANT, 'Extraction of SteamCMD done');
        } catch (e) {
            this.log.log(LogLevel.ERROR, 'Failed to extract SteamCMD', e);
            if (this.fs.existsSync(dlPath)) {
                this.fs.unlinkSync(dlPath);
            }
            return false;
        }

        if (this.fs.existsSync(dlPath)) {
            this.fs.unlinkSync(dlPath);
        }

        // wait for the exe not to be 'busy'
        await new Promise((r) => setTimeout(r, this.extractDelay));

        return true;
    }

    private async installSteamCmd(): Promise<boolean> {
        this.log.log(LogLevel.IMPORTANT, 'Checking/Installing SteamCMD');
        let lastProgress = '';
        return this.execute(
            ['validate', '+quit'],
            {
                listener: (event) => {
                    if (event.type === 'output') {
                        const output = (event as SteamCmdOutputEvent).text;
                        if (!output) {
                            return;
                        }
                        const matched = output.match(/\[([\s\d-]{3}[%-])\]\s(.*)$/);
                        if (matched?.[1]) {
                            const progress = `${matched[1]} - ${matched[2]}`;
                            if (progress !== lastProgress) {
                                lastProgress = progress;
                                this.log.log(LogLevel.INFO, `Progress: ${progress}`);
                            }
                        }
                    }
                },
            },
        );
    }

    public async checkSteamCmd(): Promise<boolean> {

        const cmdFolder = this.manager.config?.steamCmdPath;
        if (!cmdFolder) {
            return false;
        }

        if (!this.fs.existsSync(this.getCmdPath())) {
            if (!await this.downloadSteamCmd()) {
                return false;
            }
        }

        return this.installSteamCmd();

    }

    private getLoginArgs(): string[] {
        return [
            '+login',
            this.manager.config.steamUsername,
            this.manager.config.steamPassword ?? '',
        ];
    }

    private async spawnCommand(
        args: string[],
        opts?: {
            listener: (data: string) => any,
        },
    ): Promise<SpawnOutput> {
        const defaultCommands = [
            '@ShutdownOnFailedCommand 1',
            '@NoPromptForPassword 1',
        ];
        return this.processes.spawnForOutput(
            this.getCmdPath(),
            [...defaultCommands, ...args],
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
                pty: this.execMode === 'pty',
                stdOutHandler: opts?.listener ? opts.listener : undefined,
            },
        );
    }

    private async execute(
        args: string[],
        opts?: {
            listener: SteamCmdEventListener,
        },
    ): Promise<boolean> {

        let retries = 3;
        while (retries >= 0) {
            try {
                const output = await this.spawnCommand(
                    args,
                    {
                        listener: opts?.listener ? /* istanbul ignore next */ (data: string) => {
                            opts.listener({
                                type: 'output',
                                text: data,
                            } as SteamCmdOutputEvent);
                        } : undefined,
                    },
                );
                opts?.listener?.({
                    type: 'exit',
                    success: true,
                    status: output.status,
                } as SteamCmdExitEvent);
                return true;
            } catch (e) {
                const argsStr = args.map((x) => ((x === this.manager.config!.steamPassword) ? '******' : x)).join(' ');
                if (e.status === 10 && retries > 1) {
                    // timeout && some retries left
                    retries--;
                    this.log.log(LogLevel.INFO, `Retrying "${argsStr}" because of timeout`);
                    opts?.listener?.({
                        type: 'retry',
                    } as SteamCmdRetryEvent);
                } else {
                    this.log.log(LogLevel.ERROR, `SteamCMD "${argsStr}" failed`, e);
                    if (!this.progressLog) {
                        this.log.log(LogLevel.INFO, e.stdout);
                        this.log.log(LogLevel.ERROR, e.stderr);
                    }
                    opts?.listener?.({
                        type: 'exit',
                        success: false,
                        status: e.status,
                    } as SteamCmdExitEvent);
                    return false;
                }
            }
        }
        opts?.listener?.({
            type: 'exit',
            success: false,
            status: 1,
        } as SteamCmdExitEvent);
        return false;
    }

    public async checkServer(): Promise<boolean> {

        const serverFolder = this.manager.getServerPath();
        const serverExe = this.manager.config?.serverExe;

        return !!serverFolder && !!serverExe
        && this.fs.existsSync(path.join(serverFolder, serverExe));

    }

    public async updateServer(
        opts?: {
            listener?: SteamCmdEventListener,
            validate?: boolean,
        },
    ): Promise<boolean> {

        const serverPath = this.manager.getServerPath();
        this.fs.mkdirSync(serverPath, { recursive: true });

        const success = await this.execute([
            '+force_install_dir',
            serverPath,
            ...this.getLoginArgs(),
            '+app_update',
            (this.manager.config?.experimentalServer ? DAYZ_EXPERIMENTAL_SERVER_APP_ID : DAYZ_SERVER_APP_ID),
            ...((opts?.validate ?? this.manager.config?.validateServerAfterUpdate ?? true) ? ['validate'] : []),
            '+quit',
        ], {
            listener: (event: SteamCmdEvent) => {
                if (event.type === 'exit') {
                    if (!(event as SteamCmdExitEvent).success) {
                        this.eventBus.emit(
                            InternalEventTypes.DISCORD_MESSAGE,
                            {
                                type: 'admin',
                                message: 'Failed to update server!',
                            },
                        );
                    } else if ((event as SteamCmdExitEvent).status !== SteamExitCodes.UP2DATE) {
                        this.eventBus.emit(
                            InternalEventTypes.DISCORD_MESSAGE,
                            {
                                type: 'notification',
                                message: 'Successfully updated server!',
                            },
                        );
                    }
                }

                if (!opts?.listener) {
                    return;
                }

                if (event.type === 'output') {
                    const progress = this.progressRegex.exec((event as SteamCmdOutputEvent).text);
                    if (progress?.length) {
                        this.log.log(LogLevel.INFO, `Progress: ${progress[0]}`);
                        opts.listener({
                            type: 'app-progress',
                            progress: progress[0],
                            progressAmount: progress[1],
                            progressTotalAmount: progress[2],
                        } as SteamCmdAppUpdateProgressEvent);
                        return;
                    }
                }
                opts.listener(event);
            },
        });

        if (!success) {
            this.log.log(LogLevel.ERROR, 'Failed to update server');
            return false;
        }

        return this.checkServer();

    }

    private getWsBasePath(): string {
        let wsPath = this.manager.config.steamWorkshopPath;
        if (!path.isAbsolute(wsPath)) {
            wsPath = path.join(this.paths.cwd(), wsPath);
        }
        return wsPath;
    }

    private getWsPath(): string {
        return path.join(this.getWsBasePath(), 'steamapps/workshop/content', DAYZ_APP_ID);
    }

    public getWsModName(modId: string): string {
        const wsPath = this.getWsPath();
        const modMeta = path.join(wsPath, modId, 'meta.cpp');
        if (!this.fs.existsSync(modMeta)) {
            return '';
        }
        const metaContent = this.fs.readFileSync(modMeta).toString();
        const names = metaContent.match(/name\s*=.*/g) ?? [];
        const modName = names
            .pop()
            ?.split('=')[1]
            ?.trim()
            ?.replace(/\//g, '-')
            ?.replace(/\\/g, '-')
            ?.replace(/ /g, '-')
            ?.replace(/[^a-zA-Z0-9\-_]/g, '')
            || '';
        return modName ? `@${modName}` : '';
    }

    public buildWsModParams(): string[] {
        return this.manager.getModIdList()
            .map((x) => this.getWsModName(x));
    }

    public async updateMod(
        modIds: string[],
        opts?: {
            validate?: boolean,
            listener?: SteamCmdEventListener,
        },
    ): Promise<boolean> {

        if (!modIds?.length) {
            return true;
        }

        const wsBasePath = this.getWsBasePath();
        this.fs.mkdirSync(wsBasePath, { recursive: true });

        let lastDetectedMod: string;
        let success = await this.execute([
            '+force_install_dir',
            wsBasePath,
            ...this.getLoginArgs(),
            ...modIds.reduce(
                (acc, modId) => {
                    acc.push(
                        '+workshop_download_item',
                        DAYZ_APP_ID,
                        modId,
                        ...((opts?.validate ?? this.manager.config?.validateModsAfterUpdate ?? true) ? ['validate'] : []),
                    );
                    return acc;
                },
                [],
            ),
            '+quit',
        ], {
            listener: (event: SteamCmdEvent) => {

                if (event.type === 'exit') {
                    void (async () => {
                        let isSuccess = null;
                        if (!(event as SteamCmdExitEvent).success) {
                            isSuccess = false;
                        } else if ((event as SteamCmdExitEvent).status !== SteamExitCodes.UP2DATE) {
                            isSuccess = true;
                        }
                        if (isSuccess !== null) {
                            if (isSuccess) {
                                const modInfos = await this.metaData.getModsMetaData(modIds);
                                this.eventBus.emit(
                                    InternalEventTypes.DISCORD_MESSAGE,
                                    {
                                        type: 'notification',
                                        message: `Successfully updated mods:`,
                                        embeds: modInfos.map((modInfo) => {
                                            const embed = new RichEmbed({
                                                color: 0x0099FF,
                                                title: modInfo.title,
                                                url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${modInfo.publishedfileid}`,
                                                fields: [
                                                    {
                                                        name: 'Uploaded at',
                                                        value: new Date((modInfo.time_updated || modInfo.time_created) * 1000)
                                                            .toISOString()
                                                            .split(/[T\.]/)
                                                            .slice(0, 2)
                                                            .join(' ')
                                                            + ' UTC',
                                                        inline: true,
                                                    },
                                                ],
                                                thumbnail: { url: modInfo.preview_url },
                                                image: { url: modInfo.preview_url },
                                                footer: {
                                                    text: 'Powered by DayZ Server Manager',
                                                },
                                            });
                                            return embed;
                                        }),
                                    },
                                );
                            } else {
                                this.eventBus.emit(
                                    InternalEventTypes.DISCORD_MESSAGE,
                                    {
                                        type: 'admin',
                                        message: `Failed to update mods: ${modIds.join('\n')}`,
                                    },
                                );
                            }
                        }
                    })();
                }

                if (!opts?.listener) {
                    return;
                }

                if (event.type === 'output') {
                    const progress = this.progressRegex.exec((event as SteamCmdOutputEvent).text);
                    if (progress?.length) {
                        this.log.log(LogLevel.INFO, `Progress: ${progress[1]}`);
                        opts.listener({
                            type: 'mod-progress',
                            mod: lastDetectedMod,
                            progress: progress[0],
                            progressAmount: progress[1],
                            progressTotalAmount: progress[2],
                        } as SteamCmdModUpdateProgressEvent);
                        return;
                    }
                }
                if (event.type === 'exit') {
                    (event as SteamCmdExitEvent).mods = [...modIds];
                }
                if (event.type === 'retry') {
                    (event as SteamCmdRetryEvent).mods = [...modIds];
                }
                opts.listener(event);
            },
        });

        success = success && modIds.every((modId) => !!this.getWsModName(modId));
        if (!success) {
            this.log.log(LogLevel.ERROR, `Failed to update mods: ${modIds}`);
            for (const modId of modIds) {
                this.metaData.updateLocalModMeta(modId, { lastDownloaded: 0 });
            }
            if (opts?.listener) {
                opts.listener({
                    type: 'exit',
                    mods: modIds,
                    success: false,
                } as SteamCmdExitEvent);
            }
            return false;
        }

        for (const modId of modIds) {
            this.metaData.updateLocalModMeta(modId, { lastDownloaded: new Date().valueOf() });
        }

        if (opts?.listener) {
            opts.listener({
                type: 'exit',
                mods: modIds,
                success: true,
            } as SteamCmdExitEvent);
        }

        return true;
    }

    public async updateAllMods(opts?: {
        force?: boolean,
        validate?: boolean,
        listener?: SteamCmdEventListener,
    }): Promise<boolean> {
        const modIds = opts?.force
            ?  this.manager.getModIdList()
            : await this.metaData.modNeedsUpdate(
                this.manager.getModIdList(),
            );

        const modsMeta = (await this.metaData.getModsMetaData(modIds)) || [];

        // sort descending by size
        const bySize: Partial<PublishedFileDetail>[] = modsMeta
            .sort(
                /* istanbul ignore next */
                (a, b) => (b.file_size || 0) - (a.file_size || 0),
            );

        // add possibly missing mods with size 0 as its unknown
        bySize.push(...modIds
            .filter((x) => !modsMeta.find((meta) => x === meta.publishedfileid))
            .map(/* istanbul ignore next */ (x) => ({
                publishedfileid: x,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                file_size: 0,
            }) as Partial<PublishedFileDetail>));

        const maxBatchSize = this.manager.config.updateModsMaxBatchSize || 5;
        const maxDownloadSize = this.manager.config.updateModsMaxBatchFileSize || 1_000_000_000; // ~1 GB
        let curBatch: Partial<PublishedFileDetail>[] = [];
        for (const mod of bySize) {
            const curBatchFileSize = curBatch.reduce((acc, x) => acc + (x.file_size || 0), 0);

            // if this mod would exceed the download limit, then execute the batch first
            if (curBatch.length && (curBatchFileSize + (mod.file_size || 0)) >= maxDownloadSize) {
                if (!await this.updateMod(curBatch.map((x) => x.publishedfileid))) {
                    return false;
                }
                curBatch = [];
            }

            curBatch.push(mod);

            // check if batch is full or exceeds size limit
            if (curBatchFileSize >= maxDownloadSize || curBatch.length >= maxBatchSize) {
                if (!await this.updateMod(
                    curBatch.map((x) => x.publishedfileid),
                    {
                        validate: opts?.validate,
                        listener: opts?.listener,
                    },
                )) {
                    return false;
                }
                curBatch = [];
            }
        }
        // update the rest
        if (curBatch.length) {
            if (!await this.updateMod(curBatch.map((x) => x.publishedfileid))) {
                return false;
            }
        }
        return true;
    }

    private async sameModMeta(modDir: string, serverDir: string): Promise<boolean> {
        const modMeta = path.join(modDir, 'meta.cpp');
        const serverMeta = path.join(serverDir, 'meta.cpp');
        if (
            !this.fs.existsSync(modMeta)
            || !this.fs.existsSync(serverMeta)
        ) {
            return false;
        }

        return `${this.fs.readFileSync(modMeta)}` === `${this.fs.readFileSync(serverMeta)}`;
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
                && await sameDirHash(this.fs, modDir, serverDir)
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

        return true;
    }

    public async installMods(): Promise<boolean> {
        const modIds = this.manager.getModIdList();

        const installed = Promise.all(modIds.map((modId) => this.installMod(modId)));
        if (!await installed) {
            return false;
        }

        this.fs.mkdirSync(
            path.join(this.manager.getServerPath(), 'keys'),
            { recursive: true },
        );
        let success = true;
        for (const modId of modIds) {
            success = success && (await this.copyModKeys(modId));
        }
        return success;
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
            if (this.fs.existsSync(target)) {
                this.fs.unlinkSync(target);
            }
            await this.fs.promises.copyFile(key, target);
        }
        return true;
    }

    public async checkMods(): Promise<boolean> {
        const wsPath = this.getWsPath();
        return this.manager.getModIdList()
            .every((modId) => {
                const modDir = path.join(wsPath, modId);
                if (!this.fs.existsSync(modDir)) {
                    this.log.log(LogLevel.ERROR, `Mod ${modId} was not found`);
                    return false;
                }

                const modName = this.getWsModName(modId);
                if (!modName) {
                    this.log.log(LogLevel.ERROR, `Modname for ${modId} was not found`);
                    return false;
                }

                const modServerDir = path.join(this.manager.getServerPath(), modName);
                if (!this.fs.existsSync(modServerDir)) {
                    this.log.log(LogLevel.ERROR, `Mod Link/Folder for ${modName} in serverfolder was not found`);
                    return false;
                }

                return true;
            });
    }

}
