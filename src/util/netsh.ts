import { Logger, LogLevel } from './logger';
import { Paths } from './paths';
import { Processes } from './processes';

export class NetSH {

    private static log = new Logger('NetSH');

    public static async addRule(path: string): Promise<void> {
        await Processes.spawnForOutput(
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

    public static async getAllRules(): Promise<{ [k: string]: string }[]> {

        try {
            const result = await Processes.spawnForOutput(
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
            NetSH.log.log(LogLevel.ERROR, 'Fetching firewall rules failed', e);
            return [];
        }
    }

    public static async getRulesByPath(path: string): Promise<{ [k: string]: string }[]> {

        try {
            const result = await NetSH.getAllRules();

            return result.filter((rule) => {
                for (const key of Object.keys(rule)) {
                    if (
                        !!rule[key]
                        && Paths.samePath(path, rule[key])
                    ) return true;
                }
                return false;
            });

        } catch (e) {
            NetSH.log.log(LogLevel.ERROR, 'Fetching firewall rules failed', e);
            return [];
        }
    }

}
