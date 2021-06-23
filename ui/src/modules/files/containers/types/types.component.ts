/* eslint-disable @typescript-eslint/naming-convention */
import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { AppCommonService } from '@common/services';
import { MaintenanceService } from '@modules/maintenance/services';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

import * as xml from 'xml2js';

interface TypesName {
    $: {name: string};
}

interface TypesFlags {
    $: {
        count_in_cargo: '0' | '1';
        count_in_hoarder: '0' | '1';
        count_in_map: '0' | '1';
        count_in_player: '0' | '1';
        crafted: '0' | '1';
        deloot: '0' | '1';
    };
}

interface TypesXmlEntry extends TypesName {
    category: TypesName[];
    usage: TypesName[];
    value: TypesName[];
    flags: [TypesFlags];

    nominal: [string];
    lifetime: [string];
    restock: [string];
    min: [string];
    quantmin: [string];
    quantmax: [string];
    cost: [string];
}

interface TypesXml {
    types: { type: TypesXmlEntry[] };
}

@Component({
    selector: 'category-renderer',
    template: `
        <ng-select [items]="dropdownList"
               bindLabel="name"
               bindValue="name"
               placeholder="Select item"
               appendTo="body"
               [searchable]="false"
               [multiple]="true"
               [(ngModel)]="selectedItems"
               (change)="checkedHandler()"
        >
        </ng-select>
    `,
})
export class CategoryRenderer implements ICellRendererAngularComp {

    public static CATEGORY_LIST = [
        { name: 'weapons' },
        { name: 'explosives' },
        { name: 'clothes' },
        { name: 'containers' },
        { name: 'tools' },
        { name: 'vehicleparts' },
        { name: 'food' },
    ];

    public params: any;

    public dropdownList = CategoryRenderer.CATEGORY_LIST;

    public selectedItems = [];

    public agInit(params: any): void {
        this.params = params;
        this.selectedItems = params.value.map((x) => x.name);
    }

    public checkedHandler(): void {
        const { colId } = this.params.column;
        this.params.node.setDataValue(colId, this.selectedItems.map((x) => ({ name: x })));
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
    selector: 'value-renderer',
    template: `
        <ng-select [items]="dropdownList"
               bindLabel="name"
               bindValue="name"
               placeholder="Select item"
               appendTo="body"
               [searchable]="false"
               [multiple]="true"
               [(ngModel)]="selectedItems"
               (change)="checkedHandler()"
        >
        </ng-select>
    `,
})
export class ValueRenderer extends CategoryRenderer implements ICellRendererAngularComp {

    public static VALUE_LIST = [
        { name: 'Tier1' },
        { name: 'Tier2' },
        { name: 'Tier3' },
        { name: 'Tier4' },
    ];

    public dropdownList = ValueRenderer.VALUE_LIST;

}

@Component({
    selector: 'usage-renderer',
    template: `
        <ng-select [items]="dropdownList"
               bindLabel="name"
               bindValue="name"
               placeholder="Select item"
               appendTo="body"
               [searchable]="false"
               [multiple]="true"
               [(ngModel)]="selectedItems"
               (change)="checkedHandler()"
        >
        </ng-select>
    `,
})
export class UsageRenderer extends CategoryRenderer implements ICellRendererAngularComp {

    public static USAGE_LIST = [
        { name: 'Coast ' },
        { name: 'Farm ' },
        { name: 'Firefighter ' },
        { name: 'Hunting ' },
        { name: 'Industrial ' },
        { name: 'Medic ' },
        { name: 'Military ' },
        { name: 'Office ' },
        { name: 'Police ' },
        { name: 'Prison ' },
        { name: 'School ' },
        { name: 'Town ' },
        { name: 'Village' },
    ];

    public dropdownList = UsageRenderer.USAGE_LIST;

}

@Component({
    selector: 'checkbox-renderer',
    template: `
      <input
        type="checkbox"
        (click)="checkedHandler($event)"
        [checked]="params.value"
      />
    `,
})
export class CheckboxRenderer implements ICellRendererAngularComp {

    public params: any;

    public agInit(params: any): void {
        this.params = params;
    }

    public checkedHandler(event): void {
        const { checked } = event.target;
        const { colId } = this.params.column;
        this.params.node.setDataValue(colId, checked);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public refresh(params: ICellRendererParams): boolean {
        return true;
    }

}


@Component({
    selector: 'sb-types',
    changeDetection: ChangeDetectionStrategy.Default,
    templateUrl: './types.component.html',
    styleUrls: ['types.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class TypesComponent implements OnInit {

    public loading = false;
    public submitting = false;

    public withBackup = false;
    public withRestart = false;

    public test: string = '';

    public outcomeBadge?: {
        message: string;
        success: boolean;
    };

    private coreXml: any;
    public files: { file: string; content: TypesXml }[] = [];

    public activeTab = 0;

    public frameworkComponents = {
        checkboxRenderer: CheckboxRenderer,
        categoryRenderer: CategoryRenderer,
        valueRenderer: ValueRenderer,
        usageRenderer: UsageRenderer,
    };

    public defaultColDef = {
        editable: true,
        sortable: true,
        flex: 1,
        filter: true,
        resizable: true,
    };

    public typesColumnDefs = [
        {
            headerName: 'Name',
            valueGetter: (params) => {
                return params.data.$.name;
            },
            valueSetter: (params) => {
                params.data.$.name = params.newValue;
                return true;
            },
            minWidth: 150,
            headerTooltip: 'Class Name of the item',
        },
        {
            headerName: 'Categories',
            valueGetter: (params) => {
                return params.data.category?.map((x) => ({
                    name: x.$.name,
                })) ?? [];
            },
            valueSetter: (params) => {
                console.log(params);
                params.data.category = params.newValue.map((x) => ({
                    $: {
                        name: x.name,
                    },
                }));
                return true;
            },
            cellRenderer: 'categoryRenderer',
            editable: false,
            filter: false,
            minWidth: 175,
            headerTooltip: 'Categories of this item. Used to determine general usage (Must exist in area map)',
        },
        {
            headerName: 'Values',
            valueGetter: (params) => {
                return params.data.value?.map((x) => ({
                    name: x.$.name,
                })) ?? [];
            },
            valueSetter: (params) => {
                console.log(params);
                params.data.value = params.newValue.map((x) => ({
                    $: {
                        name: x.name,
                    },
                }));
                return true;
            },
            cellRenderer: 'valueRenderer',
            editable: false,
            filter: false,
            minWidth: 175,
            headerTooltip: 'Tiers of the item (defines the quality that places new to have to spawn this item) (Must exist in area map)',
        },
        {
            headerName: 'Usages',
            valueGetter: (params) => {
                return params.data.usage?.map((x) => ({
                    name: x.$.name,
                })) ?? [];
            },
            valueSetter: (params) => {
                console.log(params);
                params.data.usage = params.newValue.map((x) => ({
                    $: {
                        name: x.name,
                    },
                }));
                return true;
            },
            cellRenderer: 'usageRenderer',
            editable: false,
            filter: false,
            minWidth: 175,
            headerTooltip: 'The categories of places to spawn this item (Must exist in area map)',
        },
        {
            headerName: 'Nominal',
            valueGetter: (params) => Number(params.data.nominal[0]),
            valueSetter: (params) => {
                params.data.nominal[0] = String(params.newValue);
                return true;
            },
            minWidth: 75,
            headerTooltip: 'The targeted amount of items to be spawned in world/inventories/players (must be higher or equal to min)',
        },
        {
            headerName: 'LifeTime',
            valueGetter: (params) => Number(params.data.lifetime[0]),
            valueSetter: (params) => {
                params.data.lifetime[0] = String(params.newValue);
                return true;
            },
            minWidth: 100,
            headerTooltip: 'Despawn time of this item',
        },
        {
            headerName: 'Restock',
            valueGetter: (params) => Number(params.data.restock[0]),
            valueSetter: (params) => {
                params.data.restock[0] = String(params.newValue);
                return true;
            },
            minWidth: 75,
            headerTooltip: 'If the minimum amount of this item is reached, the CE will wait this amount of time until its respawning again.',
        },
        {
            headerName: 'Min',
            valueGetter: (params) => Number(params.data.min[0]),
            valueSetter: (params) => {
                params.data.min[0] = String(params.newValue);
                return true;
            },
            minWidth: 50,
            headerTooltip: 'Minimum amount of this item in the world',
        },
        {
            headerName: 'QuantMin',
            valueGetter: (params) => Number(params.data.quantmin[0]),
            valueSetter: (params) => {
                params.data.quantmin[0] = String(params.newValue);
                return true;
            },
            headerTooltip: 'Quantmin and Quantmax must either both be -1 or some value between 1 and 100 (Percents). The minimum percent this item is filled with items (i.e. bullets in a mag)',
        },
        {
            headerName: 'QuantMax',
            valueGetter: (params) => Number(params.data.quantmax[0]),
            valueSetter: (params) => {
                params.data.quantmax[0] = String(params.newValue);
                return true;
            },
            headerTooltip: 'Quantmin and Quantmax must either both be -1 or some value between 1 and 100 (Percents). The maximum percent this item is filled with items (i.e. bullets in a mag)',
        },
        {
            headerName: 'Cost',
            valueGetter: (params) => Number(params.data.cost[0]),
            valueSetter: (params) => {
                params.data.cost[0] = String(params.newValue);
                return true;
            },
            minWidth: 50,
            headerTooltip: 'Priority in the spawn queue. Pretty much always 100 unless you want to make items less likely to spawn',
        },
        {
            headerName: 'Count in Cargo',
            valueGetter: (params) => params.data.flags[0].$.count_in_cargo === '1',
            valueSetter: (params) => {
                params.data.flags[0].$.count_in_cargo = params.newValue ? '1' : '0';
                return true;
            },
            sortable: false,
            filter: false,
            cellRenderer: 'checkboxRenderer',
            headerTooltip: 'Wether the total amount of this item includes items in crates, containers, vehicles, backpacks etc',
        },
        {
            headerName: 'Count in Hoarder',
            valueGetter: (params) => params.data.flags[0].$.count_in_hoarder === '1',
            valueSetter: (params) => {
                params.data.flags[0].$.count_in_hoarder = params.newValue ? '1' : '0';
                return true;
            },
            sortable: false,
            filter: false,
            cellRenderer: 'checkboxRenderer',
            headerTooltip: 'Wether the total amount of this item includes items in stashes, tents, barrels etc',
        },
        {
            headerName: 'Count in Map',
            valueGetter: (params) => params.data.flags[0].$.count_in_map === '1',
            valueSetter: (params) => {
                params.data.flags[0].$.count_in_map = params.newValue ? '1' : '0';
                return true;
            },
            sortable: false,
            filter: false,
            cellRenderer: 'checkboxRenderer',
            headerTooltip: 'Wether the total amount of this item includes items in buildings',
        },
        {
            headerName: 'Count in Player',
            valueGetter: (params) => params.data.flags[0].$.count_in_player === '1',
            valueSetter: (params) => {
                params.data.flags[0].$.count_in_player = params.newValue ? '1' : '0';
                return true;
            },
            sortable: false,
            filter: false,
            cellRenderer: 'checkboxRenderer',
            headerTooltip: 'Wether the total amount of this item includes items in player inventories',
        },
        {
            headerName: 'crafted',
            valueGetter: (params) => params.data.flags[0].$.crafted === '1',
            valueSetter: (params) => {
                params.data.flags[0].$.crafted = params.newValue ? '1' : '0';
                return true;
            },
            sortable: false,
            filter: false,
            cellRenderer: 'checkboxRenderer',
            headerTooltip: 'Wether this item is made by crafting',
        },
        {
            headerName: 'deloot',
            valueGetter: (params) => params.data.flags[0].$.deloot === '1',
            valueSetter: (params) => {
                params.data.flags[0].$.deloot = params.newValue ? '1' : '0';
                return true;
            },
            sortable: false,
            filter: false,
            cellRenderer: 'checkboxRenderer',
            headerTooltip: 'Wether this item is spawned at dynamic events',
        },
    ];

    public constructor(
        public appCommon: AppCommonService,
        public maintenance: MaintenanceService,
    ) {}

    public async onSubmit(): Promise<void> {
        if (this.loading || this.submitting) return;
        this.submitting = true;
        this.outcomeBadge = undefined;

        try {

            for (const file of this.files) {
                const xmlContent = new xml.Builder().buildObject(file.content);
                await this.appCommon.updateMissionFile(
                    file.file,
                    xmlContent,
                    this.withBackup,
                ).toPromise();
            }
            if (this.withRestart) {
                await this.maintenance.restartServer();
            }
            this.outcomeBadge = {
                success: true,
                message: 'Saved successfully',
            };
        } catch (e) {
            console.error(e);
            this.outcomeBadge = {
                success: false,
                message: `Failed to save: ${e.message}`,
            };
        }

        this.submitting = false;
    }

    public ngOnInit(): void {
        void this.reset();
    }

    public async reset(): Promise<void> {

        if (this.loading) return;
        this.loading = true;

        try {
            const core = await this.appCommon.fetchMissionFile('cfgEconomyCore.xml').toPromise();
            // console.log(core);
            this.coreXml = await xml.parseStringPromise(core);
            const ceEntries = this.coreXml.economycore.ce;
            console.log(ceEntries);
            const typesFiles: string[] = ['db/types.xml'];
            for (const ceEntry of ceEntries) {
                const folder = ceEntry.$.folder as string;
                for (const file of ceEntry.file) {
                    const fileName = file.$.name as string;
                    const fileType = file.$.type as string;

                    if (fileType === 'types') {
                        typesFiles.push(`${folder}${folder.endsWith('/') ? '' : '/'}${fileName}`);
                    }
                }
            }
            console.log(typesFiles);

            this.files = ((await Promise.all(typesFiles.map(async (x) => {
                return {
                    file: x,
                    content: await xml.parseStringPromise(
                        await this.appCommon.fetchMissionFile(x).toPromise(),
                    ),
                };
            }))) as {
                file: string;
                content: TypesXml;
            }[]).map((file) => {
                file.content.types.type = file.content.types.type.map((type) => {
                    type.nominal = type.nominal ?? ['0'];
                    type.restock = type.restock ?? ['1800'];
                    type.min = type.min ?? ['0'];
                    type.quantmin = type.quantmin ?? ['-1'];
                    type.quantmax = type.quantmax ?? ['-1'];
                    type.cost = type.cost ?? ['100'];
                    return type;
                });
                return file;
            });

            console.log(this.files);

            // console.log(this.coreXml);
        } catch (e) {
            console.error(e);
        }

        this.loading = false;
    }

    public changeAttrInPercent(attr: string, percent: string | number): void {
        if (!this.files?.length || this.activeTab > this.files.length || this.activeTab < 0) {
            return;
        }

        const multiplier = Number(percent) / 100.0;
        for (const type of this.files[this.activeTab].content.types.type) {
            try {
                const num = Number(type[attr][0]);
                if (num && num > 0) {
                    type[attr][0] = String(num * multiplier);
                }
            } catch (e) {}
        }

        // trigger change detection
        this.files[this.activeTab].content.types.type = [...this.files[this.activeTab].content.types.type];
    }

    public saveCurrentFile(): void {
        if (!this.files?.length || this.activeTab > this.files.length || this.activeTab < 0) {
            return;
        }

        let filename = this.files[this.activeTab].file;
        if (filename.includes('/')) {
            filename = filename.split('/').pop()!;
        }
        const xmlContent = new xml.Builder().buildObject(this.files[this.activeTab].content);

        const blob = new Blob([xmlContent], { type: 'text/xml' });

        /* eslint-disable no-undef */
        // eslint-disable-next-line @typescript-eslint/dot-notation
        if (window.navigator['msSaveOrOpenBlob']) {
            window.navigator.msSaveBlob(blob, filename);
        } else {
            const elem = window.document.createElement('a');
            elem.href = window.URL.createObjectURL(blob);
            elem.download = filename;
            document.body.appendChild(elem);
            elem.click();
            document.body.removeChild(elem);
        }
        /* eslint-enable no-undef */
    }

}
