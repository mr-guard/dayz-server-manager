import * as folderHashModule from 'folder-hash';
import { FSAPI } from './apis';

export const sameDirHash = async (
    fs: FSAPI,
    dir1: string,
    dir2: string,
): Promise<boolean> => {
    if (!fs.existsSync(dir1) || !fs.existsSync(dir2)) {
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/dot-notation
    const folderHash = folderHashModule['prep'](fs) as typeof folderHashModule.hashElement;

    const hashes = await Promise.all([
        folderHash(dir1, { folders: { ignoreRootName: true } }),
        folderHash(dir2, { folders: { ignoreRootName: true } }),
    ]);
    return hashes[0]?.hash && (hashes[0]?.hash === hashes[1]?.hash);
};
