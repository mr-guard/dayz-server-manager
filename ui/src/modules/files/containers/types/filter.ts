export const IncludesFilter = {
    displayKey: 'includes',
    displayName: 'includes',
    predicate: ([filter], cellValue) => {
        if (!filter) return false;
        if (!cellValue?.length) return false;
        return cellValue.some((x) => x?.toLowerCase() === filter?.toLowerCase());
    },
};

export const ExcludesFilter = {
    displayKey: 'excludes',
    displayName: 'excludes',
    predicate: ([filter], cellValue) => {
        if (!filter) return true;
        if (!cellValue?.length) return true;
        return !cellValue.some((x) => x?.toLowerCase() === filter?.toLowerCase());
    },
};
