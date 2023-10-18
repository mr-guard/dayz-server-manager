import { ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { ColBase } from "./columns";
import { TypesExpansionComponent } from "./types-expansion.component";
import { HardlineFileWrapper, TraderFileWrapper } from "./files";
import { RarityRenderer } from "./renderers";
import { AttributeOperation, NUMBER_OPS, SET_NUMBER_OP, SET_STRING_OP } from "./ops";

export abstract class ExpansionColBase extends ColBase {
    public override types!: TypesExpansionComponent;
    public constructor(
        types: TypesExpansionComponent,
        headerName: string,
    ) {
        super(types, headerName);
    }
}

export class TraderCategoryCol extends ExpansionColBase {
    constructor(
        types: TypesExpansionComponent,
    ) {
        super(types, 'Trader Category');
        this.minWidth = this.types.minWidth(150);
    }
    editable = true;
    valueGetter = (params: ValueGetterParams<string>) => {
        const detail = this.types.findItemInTraderfiles(params.data);
        return detail?.traderFile?.shortname || '';
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const classname = params.data;
        if (!classname) return false;

        // variants cant be top level entries
        if (!!this.types.findItemVariantParent(params.data)) return false;

        const detail = this.types.findItemInTraderfiles(classname);
        if (detail) {
            detail.traderFile.content.Items.splice(
                detail.traderFile.content.Items.findIndex((x) => x?.ClassName?.toLowerCase() === classname?.toLowerCase()),
                1,
            );
        }
        const newCategory = this.types.files.find((x) => {
            return x.type === 'traderjson'
                && x.shortname?.toLowerCase() === params?.newValue?.toLowerCase();
        }) as TraderFileWrapper;
        if (newCategory) {
            newCategory.content.Items.push(
                detail?.item || {
                    "ClassName": classname,
                    "MaxPriceThreshold": 10000,
                    "MinPriceThreshold": 7500,
                    "SellPricePercent": -1.0,
                    "MaxStockThreshold": 100,
                    "MinStockThreshold": 1,
                    "QuantityPercent": -1,
                    "SpawnAttachments": [],
                    "Variants": [],
                },
            );
        }
        return true;
    };
    headerTooltip = 'Trader Category (mutually exclusive with variant of)';
    override operations = [SET_STRING_OP];
}

export class TraderVariantOfCol extends ExpansionColBase {
    constructor(
        types: TypesExpansionComponent,
    ) {
        super(types, 'Trader Variant Of');
        this.minWidth = this.types.minWidth(150);
    }
    editable = true;
    valueGetter = (params: ValueGetterParams<string>) => {
        const detail = this.types.findItemVariantParent(params.data);
        return detail?.item?.ClassName || '';
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const classname = params.data;
        if (!classname) return false;

        // top level classes can be variants
        if (!!this.types.findItemInTraderfiles(params.data)) return false;

        const detail = this.types.findItemInTraderfiles(params.oldValue);
        if (detail) {
            detail.item.Variants.splice(
                detail.item.Variants.findIndex((x) => x?.toLowerCase() === classname?.toLowerCase()),
                1,
            );
        }
        const newParent = this.types.findItemInTraderfiles(params.newValue);
        if (newParent) {
            newParent.item?.Variants?.push(classname);
        }
        return true;
    };
    headerTooltip = 'The class this item is a variant of in the traders (mutually exclusive with trader category)';
    override operations = [SET_STRING_OP];
}

export class MaxPriceCol extends ExpansionColBase {
    constructor(
        types: TypesExpansionComponent,
    ) {
        super(types, 'Max Price');
        this.minWidth = this.types.minWidth(75);
    }
    editable = true;
    valueGetter = (params: ValueGetterParams<string>) => {
        const detail = this.types.findItemInTraderfiles(params.data);
        return detail?.item?.MaxPriceThreshold || -1;
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const detail = this.types.findItemInTraderfiles(params.data);
        if (detail) {
            detail.item.MaxPriceThreshold = Number(params.newValue);
            return true;
        }
        return false;
    };
    headerTooltip = 'Max price';
    override operations = [...NUMBER_OPS];
}

export class MinPriceCol extends ExpansionColBase {
    constructor(
        types: TypesExpansionComponent,
    ) {
        super(types, 'Min Price');
        this.minWidth = this.types.minWidth(75);
    }
    editable = true;
    valueGetter = (params: ValueGetterParams<string>) => {
        const detail = this.types.findItemInTraderfiles(params.data);
        return detail?.item?.MinPriceThreshold || -1;
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const detail = this.types.findItemInTraderfiles(params.data);
        if (detail) {
            detail.item.MinPriceThreshold = Number(params.newValue);
            return true;
        }
        return false;
    }
    headerTooltip = 'Min price';
    override operations = [...NUMBER_OPS];
}

export class SellPricePercentCol extends ExpansionColBase {
    constructor(
        types: TypesExpansionComponent,
    ) {
        super(types, 'Sell Price %');
        this.minWidth = this.types.minWidth(75);
    }
    editable = true;
    valueGetter = (params: ValueGetterParams<string>) => {
        const detail = this.types.findItemInTraderfiles(params.data);
        return detail?.item?.SellPricePercent || -1;
    };
    valueSetter = (params: ValueSetterParams) => {
        const detail = this.types.findItemInTraderfiles(params.data);
        if (detail) {
            detail.item.SellPricePercent = Number(params.newValue);
            return true;
        }
        return false;
    }
    headerTooltip = 'SellPrice%';
    override operations = [...NUMBER_OPS];
}

export class MaxStockCol extends ExpansionColBase {
    constructor(
        types: TypesExpansionComponent,
    ) {
        super(types, 'Max Stock');
        this.minWidth = this.types.minWidth(75);
    }
    editable = true;
    valueGetter = (params: ValueGetterParams<string>) => {
        const detail = this.types.findItemInTraderfiles(params.data);
        return detail?.item?.MaxStockThreshold || -1;
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const detail = this.types.findItemInTraderfiles(params.data);
        if (detail) {
            detail.item.MaxStockThreshold = Number(params.newValue);
            return true;
        }
        return false;
    };
    headerTooltip = 'MaxStock';
    override operations = [...NUMBER_OPS];
}

export class MinStockCol extends ExpansionColBase {
    constructor(
        types: TypesExpansionComponent,
    ) {
        super(types, 'Min Stock');
        this.minWidth = this.types.minWidth(75);
    }
    editable = true;
    valueGetter = (params: ValueGetterParams<string>) => {
        const detail = this.types.findItemInTraderfiles(params.data);
        return detail?.item?.MinStockThreshold || -1;
    }
    valueSetter = (params: ValueSetterParams<string>) => {
        const detail = this.types.findItemInTraderfiles(params.data);
        if (detail) {
            detail.item.MinStockThreshold = Number(params.newValue);
            return true;
        }
        return false;
    }
    headerTooltip = 'MinStock';
    override operations = [...NUMBER_OPS];
}

export class QuantityPercentCol extends ExpansionColBase {
    constructor(
        types: TypesExpansionComponent,
    ) {
        super(types, 'Quantity %');
        this.minWidth = this.types.minWidth(75);
    }
    editable = true;
    valueGetter = (params: ValueGetterParams<string>) => {
        const detail = this.types.findItemInTraderfiles(params.data);
        return detail?.item?.QuantityPercent || -1;
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const detail = this.types.findItemInTraderfiles(params.data);
        if (detail) {
            detail.item.QuantityPercent = Number(params.newValue);
            return true;
        }
        return false;
    };
    headerTooltip = 'Quantity%';
    override operations = [...NUMBER_OPS];
}

export class RarityCol extends ExpansionColBase {
    constructor(
        types: TypesExpansionComponent,
    ) {
        super(types, 'Rarity');
        this.minWidth = this.types.minWidth(150);
    }
    editable = true;
    cellRenderer = RarityRenderer;
    valueGetter = (params: ValueGetterParams<string>) => {
        if (this.types.hardlineFileIndex >= 0) {
            return (this.types.files[this.types.hardlineFileIndex] as HardlineFileWrapper)
                .content.ItemRarity[params.data?.toLowerCase() || ''] || 0;
        }
        return 0;
    }
    valueSetter = (params: ValueSetterParams<string>) => {
        if (params.newValue === null || params.newValue === undefined) return false;
        try {
            const rarity = Number(params.newValue);
            if (rarity < 0 || rarity > 100) return false;
            if (this.types.hardlineFileIndex >= 0) {
                (this.types.files[this.types.hardlineFileIndex] as HardlineFileWrapper)
                    .content.ItemRarity[params.data.toLowerCase()] = rarity;
                return true;
            }
        } catch (e) {
            console.error(e);
        }
        return false;
    }
    headerTooltip = 'The rarity of this item used in expansion hardline';
    override operations = [SET_NUMBER_OP];
}
