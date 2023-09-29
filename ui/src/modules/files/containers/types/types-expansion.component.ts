/* eslint-disable @typescript-eslint/naming-convention */
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { AppCommonService } from '../../../app-common/services/app-common.service';
import { MaintenanceService } from '../../../maintenance/services/maintenance.service';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ColDef, ICellRendererParams } from 'ag-grid-community';

import * as xml from 'xml2js';
import { AttributeOperation, CategoryRenderer, TypesComponent, TypesXml } from './types.component';

interface TraderItem {
    ClassName: string,
    MaxPriceThreshold: number,
    MinPriceThreshold: number,
    SellPricePercent: number,
    MaxStockThreshold: number,
    MinStockThreshold: number,
    QuantityPercent: number,
    SpawnAttachments: string[],
    Variants: string[],
};

interface TraderFile {
    file: string;
    shortname: string;
    content: {
        Items: TraderItem[]
    } & Record<string, any>;
};

@Component({
    selector: 'rarity-renderer',
    template: `
        <select [(ngModel)]="value"
                (ngModelChange)="checkedHandler($event)"
        >
            <option *ngFor="let rarity of RARITY_LIST; let i = index"
                    [ngValue]="i"
            >
                {{ rarity }}
            </option>
        </select>
    `,
})
export class RarityRenderer implements ICellRendererAngularComp {

    public static RARITY_LIST = [
        'NONE',
        'Poor',
        'Common',
        'Uncommon',
        'Rare',
        'Epic',
        'Legendary',
        'Mythic',
        'Exotic',
        'Quest'
    ];
    public RARITY_LIST = RarityRenderer.RARITY_LIST;

    public params: any;

    public value = 0;

    public agInit(params: any): void {
        this.params = params;
        this.value = Number(params.value);
    }

    public checkedHandler(newValue: any): void {
        console.warn(newValue)
        const { colId } = this.params.column;
        this.params.node.setDataValue(colId, this.value = Number(newValue));
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public refresh(params: ICellRendererParams): boolean {
        return true;
    }

    public isPopup(): boolean {
        return false;
    }

}

@Component({
    selector: 'sb-types-expansion',
    templateUrl: './types.component.html',
    styleUrls: ['types.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class TypesExpansionComponent extends TypesComponent implements OnInit {

    // refs to all used files
    public expansionMissionFiles: { file: string; content: any }[] = [];
    public expansionTraderFiles: TraderFile[] = [];

    // shortcurts
    public hardlineFileIndex = -1;

    public expansionAttrs = [
        // "TraderCategory",
        // "Variants",
        "MaxPriceThreshold",
        "MinPriceThreshold",
        "SellPricePercent",
        "MaxStockThreshold",
        "MinStockThreshold",
        "QuantityPercent",
        // "SpawnAttachments",
        "Rarity",
    ];

    public expansionAttrOperations: Record<string, AttributeOperation> = {
        multiply: {
            numericOperation: true,
            operation: (attr, value, node) => {
                const detail = this.findItemInTraderfiles(node.data?.$.name!);
                if (!detail) return;
                try {
                    const num = Number(detail[attr]);
                    if (num && num > 0) {
                        detail[attr] = Math.round(num * (value as number));
                    }
                } catch (e) {
                    console.error(e);
                }
            },
        },
        "multiply-percent": {
            numericOperation: true,
            operation: (attr, value, node) => {
                const detail = this.findItemInTraderfiles(node.data?.$.name!);
                if (!detail) return;
                try {
                    const num = Number(detail[attr]);
                    if (num && num > 0) {
                        detail[attr] = Math.round(num * (value as number));
                    }
                } catch (e) {
                    console.error(e);
                }
            },
        },
        set: {
            operation: (attr, value, node) => {
                if ('Rarity' === attr) {
                    let num = Number(value);
                    if (!num && num !== 0) {
                        const rarityIdx = RarityRenderer.RARITY_LIST.findIndex((x) => x.toLowerCase() === (value as string)?.toLowerCase());
                        if (rarityIdx > -1) {
                            num = rarityIdx
                        };
                    };
                    if ((num || num === 0) && num >= 0 && num < 100) {
                        const key = this.findItemRarityKey(node.data?.$.name!);
                        if (key) {
                            this.expansionMissionFiles[this.hardlineFileIndex].content.ItemRarity[key] = num;
                        }
                    }
                } else {
                    const detail = this.findItemInTraderfiles(node.data?.$.name!);
                    if (!detail) return;
                    detail[attr] = value;
                }

            },
        },
        add: {
            numericOperation: true,
            listOperation: true,
            operation: (attr, value, node) => {
                if (this.numericAttrs.includes(attr)) {
                    const detail = this.findItemInTraderfiles(node.data?.$.name!);
                    if (!detail) return;
                    detail[attr] = (Number(detail[attr]) || 0) + (Number(value) || 0);
                }
            },
        },
        remove: {
            numericOperation: true,
            listOperation: true,
            operation: (attr, value, node) => {
                if (this.numericAttrs.includes(attr)) {
                    const detail = this.findItemInTraderfiles(node.data?.$.name!);
                    if (!detail) return;
                    detail[attr] = (Number(detail[attr]) || 0) - (Number(value) || 0);
                }
            },
        },
    };

    public constructor(
        appCommon: AppCommonService,
        maintenance: MaintenanceService,
    ) {
        super(appCommon, maintenance);

        this.numericAttrs.push(
            "MaxPriceThreshold",
            "MinPriceThreshold",
            "SellPricePercent",
            "MaxStockThreshold",
            "MinStockThreshold",
            "QuantityPercent",
        );

        for (const attr of this.expansionAttrs) {
            this.attrs.push({ value: attr, label: attr });
        }

        for (const op in this.attrOperations) {
            (this.attrOperations[op] as any).origOperation = this.attrOperations[op].operation;
            this.attrOperations[op].operation = (attr, value, node) => {
                if (!this.expansionAttrs.includes(attr)) {
                    (this.attrOperations[op] as any).origOperation(attr, value, node);
                    return;
                }
                this.expansionAttrOperations[op].operation(attr, value, node);
            }
        }
    }

    protected findItemInTraderfiles(classname: string): { traderFile: TraderFile, item: TraderItem } {
        if (!classname) return null!;
        for (const traderFile of this.expansionTraderFiles) {
            const item = traderFile.content.Items.find((x) => x.ClassName?.toLowerCase() === classname.toLowerCase());
            if (item) {
                return {
                    traderFile,
                    item
                };
            }
        }
        return null!;
    }

    protected findItemVariantParent(classname: string): { traderFile: TraderFile, item: TraderItem } {
        if (!classname) return null!;
        for (const traderFile of this.expansionTraderFiles) {
            const item = traderFile.content.Items
                .find((x) => x.Variants?.some((variant) => variant.toLowerCase() === classname.toLowerCase()));
            if (item) {
                return {
                    traderFile,
                    item
                };
            }
        }
        return null!;
    }

    protected findItemRarityKey(classname: string): string {
        if (!classname || this.hardlineFileIndex < 0) {
            return null!;
        }
        for (const key in this.expansionMissionFiles[this.hardlineFileIndex]?.content?.ItemRarity || {}) {
            if (key?.toLowerCase() === classname.toLowerCase()) {
                return key;
            }
        }
        return classname.toLowerCase();
    }

    protected override setCols(): void {
        super.setCols();

        this.typesColumnDefs.push(
            {
                headerName: 'Trader Category',
                valueGetter: (params) => {
                    const detail = this.findItemInTraderfiles(params.data?.$.name!);
                    return detail?.traderFile?.shortname || '';
                },
                valueSetter: (params) => {
                    const classname = params.data.$.name;
                    if (!classname) return false;

                    // variants cant be top level entries
                    if (!!this.findItemVariantParent(params.data?.$.name!)) return false;

                    const detail = this.findItemInTraderfiles(classname);
                    if (detail) {
                        detail.traderFile.content.Items.splice(
                            detail.traderFile.content.Items.findIndex((x) => x?.ClassName?.toLowerCase() === classname?.toLowerCase()),
                            1,
                        );
                    }
                    const newCategory = this.expansionTraderFiles.find((x) => x.shortname?.toLowerCase() === params?.newValue?.toLowerCase());
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
                },
                editable: true,
                minWidth: this.minWidth(150),
                headerTooltip: 'Trader Category (mutually exclusive with variant of)',
                // onCellContextMenu: (event) => {
                //     console.warn('cm', event)
                // }
            },
            {
                headerName: 'Variant Of',
                valueGetter: (params) => {
                    const detail = this.findItemVariantParent(params.data?.$.name!);
                    return detail?.item?.ClassName || '';
                },
                valueSetter: (params) => {
                    const classname = params.data.$.name;
                    if (!classname) return false;

                    // top level classes can be variants
                    if (!!this.findItemInTraderfiles(params.data?.$.name!)) return false;

                    const detail = this.findItemInTraderfiles(params.oldValue);
                    if (detail) {
                        detail.item.Variants.splice(
                            detail.item.Variants.findIndex((x) => x?.toLowerCase() === classname?.toLowerCase()),
                            1,
                        );
                    }
                    const newParent = this.findItemInTraderfiles(params.newValue);
                    if (newParent) {
                        newParent.item?.Variants?.push(classname);
                    }
                    return true;
                },
                editable: true,
                minWidth: this.minWidth(150),
                headerTooltip: 'The class this item is a variant of in the traders (mutually exclusive with trader category)',
            },
            {
                headerName: 'Max Price',
                valueGetter: (params) => {
                    const detail = this.findItemInTraderfiles(params.data?.$.name!);
                    return detail?.item?.MaxPriceThreshold || -1;
                },
                valueSetter: (params) => {
                    const detail = this.findItemInTraderfiles(params.data?.$.name!);
                    if (detail) {
                        detail.item.MaxPriceThreshold = Number(params.newValue);
                        return true;
                    }
                    return false;
                },
                editable: true,
                minWidth: this.minWidth(75),
                headerTooltip: 'Max price',
            },
            {
                headerName: 'Min Price',
                valueGetter: (params) => {
                    const detail = this.findItemInTraderfiles(params.data?.$.name!);
                    return detail?.item?.MinPriceThreshold || -1;
                },
                valueSetter: (params) => {
                    const detail = this.findItemInTraderfiles(params.data?.$.name!);
                    if (detail) {
                        detail.item.MinPriceThreshold = Number(params.newValue);
                        return true;
                    }
                    return false;
                },
                editable: true,
                minWidth: this.minWidth(75),
                headerTooltip: 'Min price',
            },
            {
                headerName: 'SellPrice%',
                valueGetter: (params) => {
                    const detail = this.findItemInTraderfiles(params.data?.$.name!);
                    return detail?.item?.SellPricePercent || -1;
                },
                valueSetter: (params) => {
                    const detail = this.findItemInTraderfiles(params.data?.$.name!);
                    if (detail) {
                        detail.item.SellPricePercent = Number(params.newValue);
                        return true;
                    }
                    return false;
                },
                editable: true,
                minWidth: this.minWidth(75),
                headerTooltip: 'SellPrice%',
            },
            {
                headerName: 'MaxStock',
                valueGetter: (params) => {
                    const detail = this.findItemInTraderfiles(params.data?.$.name!);
                    return detail?.item?.MaxStockThreshold || -1;
                },
                valueSetter: (params) => {
                    const detail = this.findItemInTraderfiles(params.data?.$.name!);
                    if (detail) {
                        detail.item.MaxStockThreshold = Number(params.newValue);
                        return true;
                    }
                    return false;
                },
                editable: true,
                minWidth: this.minWidth(75),
                headerTooltip: 'MaxStock',
            },
            {
                headerName: 'MinStock',
                valueGetter: (params) => {
                    const detail = this.findItemInTraderfiles(params.data?.$.name!);
                    return detail?.item?.MinStockThreshold || -1;
                },
                valueSetter: (params) => {
                    const detail = this.findItemInTraderfiles(params.data?.$.name!);
                    if (detail) {
                        detail.item.MinStockThreshold = Number(params.newValue);
                        return true;
                    }
                    return false;
                },
                editable: true,
                minWidth: this.minWidth(75),
                headerTooltip: 'MinStock',
            },
            {
                headerName: 'Quantity%',
                valueGetter: (params) => {
                    const detail = this.findItemInTraderfiles(params.data?.$.name!);
                    return detail?.item?.QuantityPercent || -1;
                },
                valueSetter: (params) => {
                    const detail = this.findItemInTraderfiles(params.data?.$.name!);
                    if (detail) {
                        detail.item.QuantityPercent = Number(params.newValue);
                        return true;
                    }
                    return false;
                },
                editable: true,
                minWidth: this.minWidth(75),
                headerTooltip: 'Quantity%',
            },
            {
                headerName: 'Rarity',
                cellRenderer: RarityRenderer,
                valueGetter: (params) => {
                    const key = this.findItemRarityKey(params.data?.$.name!);
                    if (key && this.hardlineFileIndex >= 0) {
                        return this.expansionMissionFiles[this.hardlineFileIndex].content.ItemRarity[key] || 0;
                    }
                    return 0;
                },
                valueSetter: (params) => {
                    if (params.newValue === null || params.newValue === undefined) return false;
                    try {
                        const rarity = Number(params.newValue);
                        if (rarity < 0 || rarity > 100) return false;
                        if (this.hardlineFileIndex >= 0) {
                            const key = this.findItemRarityKey(params.data.$.name!);
                            if (key) {
                                this.expansionMissionFiles[this.hardlineFileIndex].content.ItemRarity[key] = rarity;
                            }
                            return true;
                        }
                    } catch (e) {
                        console.error(e);
                    }
                    return false;
                },
                editable: true,
                minWidth: this.minWidth(150),
                headerTooltip: 'The rarity of this item used in expansion hardline',
            },
        );
    }

    public override async saveFiles(): Promise<void> {
        await super.saveFiles()

        for (const file of this.expansionMissionFiles) {
            if (file.content) {
                const jsonContent = JSON.stringify(file.content);
                await this.appCommon.updateMissionFile(
                    file.file,
                    jsonContent,
                    this.withBackup,
                ).toPromise();
            }
        }
    }

    public override ngOnInit(): void {
        void this.reset();
    }

    public override async reset(): Promise<void> {
        await super.reset()

        if (this.loading) return;
        this.loading = true;

        try {

            const hardlinePath = 'expansion/settings/HardlineSettings.json';
            const hardlineContent = await this.appCommon.fetchMissionFile(hardlinePath).toPromise().catch();

            this.hardlineFileIndex = this.expansionMissionFiles.push({
                file: hardlinePath,
                content: hardlineContent ? JSON.parse(hardlineContent) : undefined,
            }) - 1;

            const traderFilesPath = 'ExpansionMod/Market';
            const traderFiles = await this.appCommon.fetchProfileDir(traderFilesPath).toPromise().catch();
            if (traderFiles) {
                this.expansionTraderFiles = (await Promise.all(traderFiles.map(async (x) => {
                    try {
                        const filePath = `${traderFilesPath}/${x}`;
                        const fileContent = await this.appCommon.fetchProfileFile(filePath).toPromise();
                        return {
                            file: filePath,
                            shortname: x.slice(0, x.lastIndexOf('.')),
                            content: JSON.parse(fileContent),
                        };
                    } catch (e) {
                        console.error(`Failed to load file: ${x}`, e);
                        this.outcomeBadge = {
                            success: false,
                            message: `Failed to load file: ${x}`,
                        };
                        return null!;
                    }
                }))).filter((x) => !!x);
            }
        } catch (e) {
            console.error(e);
        }

        this.loading = false;
    }

}
