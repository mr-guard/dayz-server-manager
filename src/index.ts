import 'reflect-metadata';
import { ManagerController } from './control/manager-controller';
import { isRunFromWindowsGUI } from './util/is-run-from-gui';
import * as childProcess from 'child_process';
import { container } from 'tsyringe';

void (async () => {

    process.on('unhandledRejection', (reason) => {
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
