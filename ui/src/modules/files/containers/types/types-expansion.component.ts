/* eslint-disable @typescript-eslint/naming-convention */
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { AppCommonService } from '../../../app-common/services/app-common.service';
import { MaintenanceService } from '../../../maintenance/services/maintenance.service';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ColDef, ICellRendererParams } from 'ag-grid-community';

import * as xml from 'xml2js';
import { TypesComponent, TypesXml } from './types.component';

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


    public constructor(
        appCommon: AppCommonService,
        maintenance: MaintenanceService,
    ) {
        super(appCommon, maintenance);
    }

    protected findItemInTraderfiles(classname: string): { traderFile: TraderFile, item: TraderItem } {
        if (!classname) return null!;
        for (const traderFile of this.expansionTraderFiles) {
            const item = traderFile.content.Items.find((x) => x.ClassName?.toLowerCase() === classname?.toLowerCase());
            if (item) {
                return {
                    traderFile,
                    item
                };
            }
        }
        return null!;
    }

    protected override setCols(): void {
        super.setCols();

        /**
         * "MaxPriceThreshold": 3200,
            "MinPriceThreshold": 1600,
            "SellPricePercent": -1.0,
            "MaxStockThreshold": 100,
            "MinStockThreshold": 1,
            "QuantityPercent": -1,
            ItemRarity
         */

        this.typesColumnDefs.push(
            {
                headerName: 'Trader Category',
                valueGetter: (params) => {
                    const detail = this.findItemInTraderfiles(params.data?.$.name!);
                    return detail?.traderFile?.shortname || '';
                },
                valueSetter: (params) => {
                    const classname = params.data.$.name;
                    console.warn(params)
                    // = params.newValue;
                    return true;
                },
                editable: true,
                minWidth: this.minWidth(150),
                headerTooltip: 'Trader Category',
                onCellContextMenu: (event) => {
                    console.warn('cm', event)
                }
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

            this.hardlineFileIndex = this.files.push({
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
            console.log(this.expansionTraderFiles)

        } catch (e) {
            console.error(e);
        }

        this.loading = false;
    }

    public override setAttr(attr: string, value: string | number): void {
        super.setAttr(attr, value);
    }

    public override changeAttrInPercent(attr: string, percent: string | number): void {
        super.changeAttrInPercent(attr, percent);
    }

    public override validate(showSuccess: boolean): boolean {
        return super.validate(showSuccess);
    }

}
