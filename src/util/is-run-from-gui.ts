import * as childProcess from 'child_process';

/* istanbul ignore next */
export const isRunFromWindowsGUI = (): boolean => {
    if (process.platform !== 'win32') {
        return false;
    }

    // eslint-disable-next-line prefer-template
    const stdout = (childProcess.spawnSync(
        'cmd',
        [
            '/c',
            [
                'wmic',
                'process',
                'get',
                'Name,ProcessId',
                '/VALUE',
            ].join(' '),
        ],
    ).stdout + '')
        .replace(/\r/g, '')
        .split('\n\n')
        .filter((x) => !!x)
        .map(
            (x) => x
                .split('\n')
                .filter((y) => !!y)
                .map((y) => {
                    const equalIdx = y.indexOf('=');
                    return [y.slice(0, equalIdx).trim(), y.slice(equalIdx + 1).trim()];
                }),
        )
        .filter((x) => x[1][1] === `${process.ppid}`);

    if (!stdout?.length) {
        return false;
    }

    const parentName = stdout[0]?.[0]?.[1]?.toLowerCase();
    return (
        parentName === 'ApplicationFrameHost.exe'.toLowerCase()
        || parentName === 'explorer.exe'
    );
};
