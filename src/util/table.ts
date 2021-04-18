export const makeTable = (data: string[][]): string[] => {
    const cols: number[] = [];
    for (let i = 0; i < data[0].length; i++) {
        cols.push(0);
    }
    for (const line of data) {
        for (let i = 0; i < data[0].length; i++) {
            cols[i] = Math.max(cols[i], line[i]?.length ?? 0);
        }
    }
    return data.map((x) => {
        return x.map((y, i) => {
            // in discord each char is roughly 2 spaces
            return y.padEnd(y.length + ((cols[i] - y.length) * 2));
        }).join('  ');
    });
};
