import { ColBase } from "./columns";

const contains = (col: ColBase, filter: string, cellValue: string[]) => {
    if (!filter) return false;
    if (!cellValue?.length) return false;
    return cellValue.some(
        (x) => (x?.toLowerCase() === filter?.toLowerCase())
            || (col.valueLabels?.[x]?.toLowerCase() === filter?.toLowerCase())
    );
}

const containsPartial = (col: ColBase, filter: string, cellValue: string[]) => {
    if (!filter) return false;
    if (!cellValue?.length) return false;
    return cellValue.some(
        (x: string) => (x?.toLowerCase()?.includes(filter?.toLowerCase()))
            || (col.valueLabels?.[x]?.toLowerCase()?.includes(filter?.toLowerCase()))
    );
}

export const IncludesFilter = (col: ColBase) => {
    return {
        displayKey: 'includes',
        displayName: 'includes',
        predicate: ([filter], cellValue) => {
            return contains(col, filter, cellValue);
        },
    };
};

export const IncludesPartialFilter = (col: ColBase) => {
    return {
        displayKey: 'includes (partial)',
        displayName: 'includes (partial)',
        predicate: ([filter], cellValue) => {
            return containsPartial(col, filter, cellValue);
        },
    };
};

export const ExcludesFilter = (col: ColBase) => {
    return {
        displayKey: 'excludes',
        displayName: 'excludes',
        predicate: ([filter], cellValue) => {
            return !contains(col, filter, cellValue);
        },
    };
};

export const ExcludesPartialFilter = (col: ColBase) => {
    return {
        displayKey: 'excludes (partial)',
        displayName: 'excludes (partial)',
        predicate: ([filter], cellValue) => {
            return !containsPartial(col, filter, cellValue);
        },
    };
};
