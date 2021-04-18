import * as fs from 'fs';
import * as folderHash from 'folder-hash';

export const sameDirHash = async (dir1: string, dir2: string): Promise<boolean> => {
    if (!fs.existsSync(dir1) || !fs.existsSync(dir2)) {
        return false;
    }

    const hashes = await Promise.all([
        folderHash.hashElement(dir1, { folders: { ignoreRootName: true } }),
        folderHash.hashElement(dir2, { folders: { ignoreRootName: true } }),
    ]);
    return hashes[0]?.hash && (hashes[0]?.hash === hashes[1]?.hash);
};
