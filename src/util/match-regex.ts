export const matchRegex = (regex: RegExp, data: string): RegExpExecArray[] => {
    const matches: RegExpExecArray[] = [];
    let match = null;
    // eslint-disable-next-line no-cond-assign
    while (match = regex.exec(data)) {
        matches.push(match);
    }
    return matches;
};
