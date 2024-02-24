import 'reflect-metadata';
import './util/exit-capture';
import { ManagerController } from './control/manager-controller';
import { isRunFromWindowsGUI } from './util/is-run-from-gui';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import { container } from 'tsyringe';
import { origExit } from './util/exit-capture';

const helpText = `
    Usage
    $ dayz-server-manager

    Options
        --skip-init       Skip the init process (requirements check, server update, mod update)
        --start-locked    Activates the server restart lock so it does not start the dayz server when the manager starts
        --skip-events     Skips execution of scheduled events
`;

if (process.argv.includes('--help')) {
    console.log(helpText);
    origExit(0);
}


void (async () => {

    process.on('uncaughtException', (reason) => {
        console.error(
            'Unhandled Exception:',
            reason,
        );
        fs.writeFileSync(
            `manager-exception-dump-${new Date().valueOf()}.log`,
            `Unhandled exception - ${reason}`,
        );
        // TODO report

        // uncaught expections are supposed to exit the process
        process.exit(1)
    });

    process.on('unhandledRejection', (reason) => {
        if ((reason as any)?.message?.includes('Config missing or invalid')) {
            console.error((reason as any).message);
            return;
        }

        console.error(
            'Unhandled Rejection:',
            reason,
        );

        // TODO save and report
    });

    process.on('exit', () => {
        // prevent imidiate exit if run in GUI
        if (isRunFromWindowsGUI()) {
            childProcess.spawnSync(
                'pause',
                {
                    shell: true,
                    stdio: [0, 1, 2],
                },
            );
        }
    });

    await container.resolve(ManagerController).start();

})();
