import { Logger, LogLevel } from './logger';
import { Paths } from './paths';
import { Processes } from './processes';

export class NetSH {

    private log = new Logger('NetSH');

    private processes = new Processes();

    private paths = new Paths();

    public async addRule(path: string): Promise<void> {
        await this.processes.spawnForOutput(
            'netsh',
            [
                'firewall',
                'add',
                'allowedprogram',
                path,
                'DayZ',
                'ENABLE',
            ],
        );
    }

    public async getAllRules(): Promise<{ [k: string]: string }[]> {

        try {
            const result = await this.processes.spawnForOutput(
                'netsh',
                [
                    'advfirewall',
                    'firewall',
                    'show',
                    'rule',
                    'name=all',
                    'verbose',
                ],
            );

            return result.stdout
                .replace(/\r\n/gm, '\n')
                .split(/\n\n/gm)
                .filter((x) => x.length > 1)
                .map((entry) => {
                    const rule: { [k: string]: string } = {};
                    entry.split('\n')
                        .filter((x) => !!x && !(/^[-]+$/g).test(x))
                        .map((x) => {
                            const splitPoint = x.indexOf(':');
                            const parts = [
                                x.slice(0, splitPoint).trim(),
                                x.slice(splitPoint + 1).trim(),
                            ];
                            return parts;
                        })
                        // eslint-disable-next-line prefer-destructuring
                        .forEach((x) => rule[x[0]] = x[1]);
                    return rule;
                });
        } catch (e) {
            this.log.log(LogLevel.ERROR, 'Fetching firewall rules failed', e);
            return [];
        }
    }

    public async getRulesByPath(path: string): Promise<{ [k: string]: string }[]> {

        try {
            const result = await this.getAllRules();

            return result.filter((rule) => {
                for (const key of Object.keys(rule)) {
                    if (
                        !!rule[key]
                        && this.paths.samePath(path, rule[key])
                    ) return true;
                }
                return false;
            });

        } catch (e) {
            this.log.log(LogLevel.ERROR, 'Fetching firewall rules failed', e);
            return [];
        }
    }

}
