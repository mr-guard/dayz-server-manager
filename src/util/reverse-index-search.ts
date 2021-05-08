export const reverseIndexSearch = <T>(list: T[], cond: (x: T, idx?: number, arr?: T[]) => boolean): number => {
    for (let i = list.length - 1; i >= 0; --i) {
        if (cond(list[i], i, list)) {
            return i;
        }
    }
    return -1;
};
