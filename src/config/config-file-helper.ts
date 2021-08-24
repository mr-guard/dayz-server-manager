import * as fs from 'fs';
import * as path from 'path';
import { Logger, LogLevel } from '../util/logger';
import { merge } from '../util/merge';
import { Paths } from '../util/paths';
import { Config } from './config';
import { generateConfigTemplate } from './config-template';
import { parseConfigFileContent, validateConfig } from './config-validate';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const configschema = require('./config.schema.json');

export class ConfigFileHelper {

    private log = new Logger('Config');

    private paths = new Paths();

    public getConfigFilePath(): string {
        return path.join(this.paths.cwd(), 'server-manager.json');
    }

    private getConfigFileContent(cfgPath: string): string {
        if (fs.existsSync(cfgPath)) {
            return fs.readFileSync(cfgPath)?.toString();
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
        try {
            const cfgPath = this.getConfigFilePath();
            this.log.log(LogLevel.IMPORTANT, `Trying to read config at: ${cfgPath}`);
            const fileContent = this.getConfigFileContent(cfgPath);

            // apply defaults
            const parsed = merge(
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

    public writeConfig(config: Config): void {
        // apply defaults
        config = merge(
            new Config(),
            config,
        );

        const configErrors = validateConfig(config);
        if (configErrors?.length) {
            throw ['New config contains errors. Cannot replace config.', ...configErrors];
        }

        try {
            this.writeConfigFile(
                generateConfigTemplate(configschema, config),
            );
        } catch (e) {
            throw [`Error generating / writing config (${e?.message ?? 'Unknown'}). Cannot replace config.`];
        }
    }

    private writeConfigFile(content: string): void {
        fs.writeFileSync(
            this.getConfigFilePath(),
            content,
        );
    }

}
