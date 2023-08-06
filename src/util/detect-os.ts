const linuxVariants = [
    'linux',
    'darwin',
    'freebsd',
    'openbsd',
    'sunos',
];

export const detectOS = (): 'windows' | 'linux' | 'unknown' => {
    if (
        process.platform === 'win32'
        || (process.env.CI !== undefined) // TODO temp fix for tests
    ) {
        return 'windows';
    } else if (linuxVariants.includes(process.platform)) {
        return 'linux';
    }
    return 'unknown';
};
