import * as crypto from 'crypto';
import * as chokidarModule from 'chokidar';
import { injectable, inject, singleton, registry } from 'tsyringe';
import { ConfigFileHelper } from '../config/config-file-helper';
import { LogLevel } from '../util/logger';
import { Config } from '../config/config';
import { IService } from '../types/service';
import { LoggerFactory } from './loggerfactory';
import { CHOKIDAR, InjectionTokens } from '../util/apis';

export type ConfigCallback = (config: Config) => any;

@singleton()
@registry([{
    token: InjectionTokens.chokidar,
    useValue: chokidarModule,
}]) // eslint-disable-line @typescript-eslint/indent
@injectable()
export class ConfigWatcher extends IService {

    private changeDetectionDelay = 1000;

    private configFileWatcher: chokidarModule.FSWatcher | undefined;
    private configFileHash: string | undefined;

    public constructor(
        loggerFactory: LoggerFactory,
        @inject(InjectionTokens.chokidar) private chokidar: CHOKIDAR,
        private configFileHelper: ConfigFileHelper,
    ) {
        super(loggerFactory.createLogger('ConfigWatcher'));
    }

    public watch(cb: ConfigCallback): Config {
        const cfgPath = this.configFileHelper.getConfigFilePath();

        const config = this.configFileHelper.readConfig();
        if (!config) {
            throw new Error(`Config missing or invalid`);
        }

        this.configFileHash = crypto.createHash('md5')
            .update(JSON.stringify(config))
            .digest('hex');

        this.configFileWatcher = this.chokidar.watch(
            cfgPath,
        ).on(
            'change',
            /* istanbul ignore next */
            async () => { // NOSONAR

                // usually file "headers" are saved before content is done
                // waiting a small amount of time prevents reading RBW errors
                await new Promise((r) => setTimeout(r, this.changeDetectionDelay));

                this.checkForChange(cb);
            },
        );

        return config;
    }

    public checkForChange(cb: ConfigCallback): void {
        this.log.log(LogLevel.INFO, 'Detected config file change...');

        const updatedConfig = this.configFileHelper.readConfig();
        if (!updatedConfig) {
            this.log.log(LogLevel.ERROR, 'Cannot reload config because config is missing or contains errors');
            return;
        }

        const newHash = crypto.createHash('md5')
            .update(JSON.stringify(updatedConfig))
            .digest('hex');

        if (newHash === this.configFileHash) {
            this.log.log(LogLevel.WARN, 'Skipping config reload because no changes were found');
            return;
        }

        cb(updatedConfig);
    }

    public async stopWatching(): Promise<void> {
        if (this.configFileWatcher) {
            await this.configFileWatcher.close();
            this.configFileWatcher = undefined;
        }
    }

}
