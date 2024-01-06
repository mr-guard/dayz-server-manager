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

}
