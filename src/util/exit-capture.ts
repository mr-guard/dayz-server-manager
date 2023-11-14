/* istanbul ignore file */

import * as fs from 'fs';

export const origExit = process.exit;

process.exit = (code?: number): never => {
    console.error('Unplanned exit');
    console.trace();

    fs.writeFileSync('manager-crash-dump.log', `Unplanned exit - ${code} - ${new Error().stack}`);

    return origExit(code);
};

process['origExit'] = origExit;
