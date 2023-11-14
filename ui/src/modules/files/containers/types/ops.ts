import { ColDef, GridApi, IRowNode } from "ag-grid-community";
import { ColBase } from "./columns";

export interface AttributeOperation {
    label: string;
    title?: string;
    operation: (api: GridApi, node: IRowNode<any>, col: ColBase, value: string | number) => void;
    valueModifier?: (value: string | number, col: ColBase) => any;
}

export const MULTIPLY_OP: AttributeOperation = {
    label: 'Multiply',
    operation: (api, node, col, value) => {
        const currentValue = api.getValue(col.colId, node);
        if (currentValue === null || currentValue === undefined) return;
        node.setDataValue(col.colId, Math.round(currentValue * (value as number)));
    },
    valueModifier: (value) => {
        return Number(value);
    },
}

export const MULTIPLY_PERCENT_OP: AttributeOperation = {
    ...MULTIPLY_OP,
    label: 'Multiply %',
    valueModifier: (value) => {
        return Number(value) / 100.0;
    },
}

export const SET_NUMBER_OP: AttributeOperation = {
    label: 'Set',
    operation: (api, node, col, value) => {
        node.setDataValue(col.colId, value);
    },
    valueModifier: (value, col) => {
        return Number(value);
    },
}

export const SET_STRING_OP: AttributeOperation = {
    ...SET_NUMBER_OP,
    valueModifier: (value, col) => {
        return String(value);
    },
}

export const ADD_OP: AttributeOperation = {
    label: 'Add',
    operation: (api, node, col, value) => {
        const currentValue = api.getValue(col.colId, node);
        if (currentValue === null || currentValue === undefined) return;
        node.setDataValue(col.colId, (currentValue || 0) + (value as number || 0));
    },
    valueModifier: (value, col) => {
        return Number(value);
    },
}

export const SUBSTRACT_OP: AttributeOperation = {
    label: 'Substract',
    operation:(api, node, col, value) => {
        const currentValue = api.getValue(col.colId, node);
        if (currentValue === null || currentValue === undefined) return;
        node.setDataValue(col.colId, (currentValue || 0) - (value as number || 0));
    },
    valueModifier: (value, col) => {
        return Number(value);
    },
}

export const REMOVE_ITEM_OP: AttributeOperation = {
    label: 'Remove Item',
    operation: (api, node, col, value) => {
        const currentValue = api.getValue(col.colId, node);
        if (currentValue === null || currentValue === undefined) return;
        const idx = currentValue.findIndex((x) => x?.toLowerCase() === String(value).toLowerCase());
        if (idx > -1) {
            currentValue.splice(idx, 1);
            node.setDataValue(
                col.colId,
                [...currentValue]
            );
        }

    },
};

export const ADD_ITEM_OP: AttributeOperation = {
    label: 'Add Item',
    operation: (api, node, col, value) => {
        const currentValue = api.getValue(col.colId, node);
        if (currentValue === null || currentValue === undefined) return;
        const idx = currentValue.findIndex((x) => x?.toLowerCase() === String(value).toLowerCase());
        if (idx === -1) {
            currentValue.push(value);
            node.setDataValue(
                col.colId,
                [...currentValue]
            );
        }
    },
}

export const SET_ITEMS_OP: AttributeOperation = {
    label: 'Set Items',
    operation: (api, node, col, value) => {
        const currentValue = api.getValue(col.colId, node);
        if (currentValue === null || currentValue === undefined) return;
        node.setDataValue(
            col.colId,
            (value as string).split(',').map((x) => x.trim()).filter((x) => !!x),
        );
    },
}

export const LIST_OPS: AttributeOperation[] = [
    ADD_ITEM_OP,
    REMOVE_ITEM_OP,
];
export const NUMBER_OPS: AttributeOperation[] = [
    SET_NUMBER_OP,
    ADD_OP,
    SUBSTRACT_OP,
    MULTIPLY_OP,
    MULTIPLY_PERCENT_OP,
];
