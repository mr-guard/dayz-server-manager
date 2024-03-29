import * as path from 'path';
import * as commentJson from 'comment-json';
import { LogLevel } from '../util/logger';
import { Paths } from '../services/paths';
import { Config } from './config';
import { generateConfigTemplate } from './config-template';
import { parseConfigFileContent, validateConfig } from './config-validate';
import { inject, injectable, singleton } from 'tsyringe';
import { FSAPI, InjectionTokens } from '../util/apis';
import { IService } from '../types/service';
import { LoggerFactory } from '../services/loggerfactory';
import { origExit } from '../util/exit-capture';
import { randomUUID } from 'crypto';
import { detectOS } from '../util/detect-os';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const configschema = require('./config.schema.json');

@singleton()
@injectable()
export class ConfigFileHelper extends IService {

    public static readonly CFG_NAME = 'server-manager.json';

    public constructor(
        loggerFactory: LoggerFactory,
        private paths: Paths,
        @inject(InjectionTokens.fs) private fs: FSAPI,
    ) {
        super(loggerFactory.createLogger('Config'));
    }

    public getConfigFilePath(): string {
        return path.join(this.paths.cwd(), ConfigFileHelper.CFG_NAME);
    }

    public getConfigFileContent(cfgPath: string): string {
        if (this.fs.existsSync(cfgPath)) {
            return this.fs.readFileSync(cfgPath, { encoding: 'utf-8' });
        }
        throw new Error('Config file does not exist');
    }

    private logConfigErrors(errors: string[]): void {
        this.log.log(LogLevel.ERROR, 'Config has errors:');

        for (const configError of errors) {
            this.log.log(LogLevel.ERROR, configError);
        }
    }

    public readConfig(): Config | null {
        let fileContent: string;
        try {
            const cfgPath = this.getConfigFilePath();
            this.log.log(LogLevel.IMPORTANT, `Trying to read config at: ${cfgPath}`);
            fileContent = this.getConfigFileContent(cfgPath);

            // apply defaults
            const parsed = commentJson.assign(
                new Config(),
                parseConfigFileContent(fileContent),
            );
            const configErrors = validateConfig(parsed);
            if (configErrors?.length) {
                this.logConfigErrors(configErrors);

                return null;
            }

            this.log.log(LogLevel.IMPORTANT, 'Successfully read config');

            return parsed;
        } catch (e) {
            this.log.log(LogLevel.ERROR, `Error reading config: ${e.message}`, e);
            return null;
        }
    }

    public writeConfig(newConfig: string): void {
        // apply defaults
        const config = commentJson.assign(
            this.readConfig() || commentJson.parse(generateConfigTemplate(configschema)) as any as Config,
            commentJson.parse(newConfig) as any as Config,
        );

        const configErrors = validateConfig(config);
        if (configErrors?.length) {
            throw ['New config contains errors. Cannot replace config.', ...configErrors];
        }

        try {
            this.fs.writeFileSync(
                this.getConfigFilePath(),
                commentJson.stringify(config, null, 2),
            );
        } catch (e) {
            throw [`Error generating / writing config (${e?.message ?? 'Unknown'}). Cannot replace config.`];
        }
    }

    public createDefaultConfig(): void {

        const cfgPath = this.getConfigFilePath();

        if (!this.fs.existsSync(cfgPath)) {
            const defaultConfig = commentJson.parse(generateConfigTemplate(configschema)) as any as Config;

            // apply safe defaults
            defaultConfig.admins[0].password = randomUUID();
            defaultConfig.ingameApiKey = randomUUID();
            defaultConfig.rconPassword = randomUUID();
            defaultConfig.serverCfg.passwordAdmin = randomUUID();

            // linux specifics
            if (detectOS() !== 'windows') {
                defaultConfig.serverExe = 'DayZServer';
            }

            this.fs.writeFileSync(
                cfgPath,
                commentJson.stringify(defaultConfig, null, 2),
            );

            console.log('\n\n\n');
            console.log('Did not find a server manager config!');
            console.log(`Created a new config with default values at: ${cfgPath}`);
            console.log('Adjust the config to fit your needs and restart the manager!');
            console.log('\n\n');

            if (typeof global.it === 'function') {
                return;
            }
            origExit(0); // end process
        }

    }

}
