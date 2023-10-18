/* eslint-disable @typescript-eslint/naming-convention */
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { AppCommonService } from '../../../app-common/services/app-common.service';
import { MaintenanceService } from '../../../maintenance/services/maintenance.service';
import {
    TypesComponent,
} from './types.component';
import {
    TraderItem
} from './types';
import { HardlineFileWrapper, TraderFileWrapper } from './files';
import { MaxPriceCol, MaxStockCol, MinPriceCol, MinStockCol, QuantityPercentCol, RarityCol, SellPricePercentCol, TraderCategoryCol, TraderVariantOfCol } from './expansion-columns';

@Component({
    selector: 'sb-types-expansion',
    templateUrl: './types.component.html',
    styleUrls: ['types.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class TypesExpansionComponent extends TypesComponent implements OnInit {

    // shortcurts
    public hardlineFileIndex = -1;

    public constructor(
        appCommon: AppCommonService,
        maintenance: MaintenanceService,
    ) {
        super(appCommon, maintenance);
    }

    public findItemInTraderfiles(classname?: string): { traderFile: TraderFileWrapper, item: TraderItem } {
        if (!classname) return null!;
        classname = classname.toLowerCase();
        for (const traderFile of this.files) {
            if (traderFile.type !== 'traderjson') continue;
            const item = traderFile.content.Items.find((x) => x.ClassName?.toLowerCase() === classname);
            if (item) {
                return {
                    traderFile,
                    item
                };
            }
        }
        return null!;
    }

    public findItemVariantParent(classname?: string): { traderFile: TraderFileWrapper, item: TraderItem } {
        if (!classname) return null!;
        classname = classname.toLowerCase();
        for (const traderFile of this.files) {
            if (traderFile.type !== 'traderjson') continue;
            const item = traderFile.content.Items
                .find((x) => x.Variants?.some((variant) => variant.toLowerCase() === classname));
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

        this.typesColumnDefs = [
            ...this.typesColumnDefs,
            new TraderCategoryCol(this),
            new TraderVariantOfCol(this),
            new MaxPriceCol(this),
            new MinPriceCol(this),
            new SellPricePercentCol(this),
            new MaxStockCol(this),
            new MinStockCol(this),
            new QuantityPercentCol(this),
            new RarityCol(this),
        ];
    }

    public override async reset(): Promise<void> {
        await super.reset()

        try {

            const hardlineFile = new HardlineFileWrapper('expansion/settings/HardlineSettings.json');
            const hardlineContent = await this.appCommon.fetchMissionFile(hardlineFile.file).toPromise().catch();
            await hardlineFile.parse(hardlineContent);
            this.hardlineFileIndex = this.files.push(hardlineFile) - 1;

            const traderFilesPath = 'ExpansionMod/Market';
            const traderFiles = ((await this.appCommon.fetchProfileDir(traderFilesPath).toPromise().catch()) || [])
                .map((x) => `${traderFilesPath}/${x}`)
                .map((x) => new TraderFileWrapper(x, x.slice(0, x.lastIndexOf('.'))));

            const traderFilesContents = await this.appCommon.fetchProfileFiles(traderFiles.map((x) => x.file)).toPromise();
            for (let i = 0; i < traderFilesContents.length; i++) {
                await traderFiles[i].parse(traderFilesContents[i]);
                if (traderFiles[i].content) {
                    this.files.push(traderFiles[i]);
                }
            }
        } catch (e) {
            console.error('Failed to load expansion files', e);
        }
    }

}
