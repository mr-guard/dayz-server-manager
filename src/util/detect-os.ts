const linuxVariants = [
    'linux',
    'darwin',
    'freebsd',
    'openbsd',
    'sunos',
];

export const detectOS = (): 'windows' | 'linux' | 'unknown' => {
    if (process.platform === 'win32') {
        return 'windows';
    } else if (linuxVariants.includes(process.platform)) {
        return 'linux';
    }
    return 'unknown';
};
