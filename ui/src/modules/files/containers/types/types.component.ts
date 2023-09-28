/* eslint-disable @typescript-eslint/naming-convention */
import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { AppCommonService } from '../../../app-common/services/app-common.service';
import { MaintenanceService } from '../../../maintenance/services/maintenance.service';
import { AgGridAngular, ICellRendererAngularComp } from 'ag-grid-angular';
import { ColDef, ICellRendererParams } from 'ag-grid-community';

import * as xml from 'xml2js';

export interface TypesName {
    $: {name: string};
}

export interface TypesFlags {
    $: {
        count_in_cargo: '0' | '1';
        count_in_hoarder: '0' | '1';
        count_in_map: '0' | '1';
        count_in_player: '0' | '1';
        crafted: '0' | '1';
        deloot: '0' | '1';
    };
}

export interface TypesXmlEntry extends TypesName {
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

export interface TypesXml {
    types: { type: TypesXmlEntry[] };
}

@Component({
    selector: 'category-renderer',
    template: `
        <ng-select [items]="dropdownList"
               bindLabel="label"
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
        'weapons',
        'explosives',
        'clothes',
        'containers',
        'tools',
        'vehicleparts',
        'food',
    ];

    public params: any;

    public dropdownList = CategoryRenderer.CATEGORY_LIST.map((x) => ({
        name: x,
        label: x,
    }));

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
               bindLabel="label"
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

    public constructor() {
        super();
        this.dropdownList = [];
        for (let i = 1; i <= 15; i++) {
            this.dropdownList.push({
                name: `Tier${i}`,
                label: (i <= 4 ? `Tier${i}` : `Tier${i}*`),
            });
        }
    }

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
        'Coast',
        'Farm',
        'Firefighter',
        'Hunting',
        'Industrial',
        'Medic',
        'Military',
        'Office',
        'Police',
        'Prison',
        'School',
        'Town',
        'Village',
    ];

    public constructor() {
        super();
        this.dropdownList = UsageRenderer.USAGE_LIST.map((x) => ({
            name: x,
            label: x,
        }));
    }

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

export const IncludesFilter = {
    displayKey: 'includes',
    displayName: 'includes',
    predicate: ([filter], cellValue) => {
        if (!filter) return false;
        if (!cellValue?.length) return false;
        return cellValue.some((x) => x?.name?.toLowerCase() === filter?.toLowerCase());
    },
};

export const ExcludesFilter = {
    displayKey: 'excludes',
    displayName: 'excludes',
    predicate: ([filter], cellValue) => {
        if (!filter) return true;
        if (!cellValue?.length) return true;
        return !cellValue.some((x) => x?.name?.toLowerCase() === filter?.toLowerCase());
    },
};

@Component({
    selector: 'sb-types',
    templateUrl: './types.component.html',
    styleUrls: ['types.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class TypesComponent implements OnInit {

    @ViewChild(AgGridAngular) agGrid!: AgGridAngular;

    public _lockedWidth = false;

    public set lockedWidth(locked: boolean) {
        this._lockedWidth = locked;
        this.setCols();
    }
    public get lockedWidth(): boolean {
        return this._lockedWidth;
    }

    public loading = false;
    public submitting = false;

    public withBackup = false;
    public withRestart = false;

    public test: string = '';

    public outcomeBadge?: {
        message: string;
        success: boolean;
    };

    protected coreXml: any;
    public files: { file: string; content: TypesXml }[] = [];

    public activeTab = 0;
    public validationErrors: string[] = [];

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

    public typesColumnDefs: ColDef<TypesXmlEntry, any>[] = [];

    public absoluteAttrs = [
        { value: "nominal", label: "Nominal" },
        { value: "lifetime", label: "Lifetime" },
        { value: "restock", label: "Restock" },
        { value: "min", label: "Min" },
        { value: "quantmin", label: "Quant Min" },
        { value: "quantmax", label: "Quant Max" },
        { value: "cost", label: "Cost" },
    ];

    public percentAttrs = [
        { value: "nominal", label: "Nominal" },
        { value: "lifetime", label: "Lifetime" },
        { value: "restock", label: "Restock" },
        { value: "min", label: "Min" },
        { value: "quantmin", label: "Quant Min" },
        { value: "quantmax", label: "Quant Max" },
        { value: "cost", label: "Cost" },
    ];

    public constructor(
        public appCommon: AppCommonService,
        public maintenance: MaintenanceService,
    ) {
        this.setCols();
    }

    protected setCols(): void {
        this.typesColumnDefs = [
            {
                headerName: 'Name',
                valueGetter: (params) => {
                    return params.data?.$.name;
                },
                valueSetter: (params) => {
                    params.data.$.name = params.newValue;
                    return true;
                },
                minWidth: this.minWidth(150),
                headerTooltip: 'Class Name of the item',
            },
            {
                headerName: 'Categories',
                valueGetter: (params) => {
                    return params.data?.category?.map((x) => ({
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
                cellRenderer: CategoryRenderer,
                editable: false,
                filter: true,
                filterParams: {
                    filterOptions: [
                        IncludesFilter,
                        ExcludesFilter,
                    ],
                    trimInput: true,
                    debounceMs: 1000,
                },
                minWidth: this.minWidth(175),
                headerTooltip: 'Categories of this item. Used to determine general usage (Must exist in area map)',
            },
            {
                headerName: 'Values',
                valueGetter: (params) => {
                    return params.data?.value?.map((x) => ({
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
                cellRenderer: ValueRenderer,
                editable: false,
                filter: true,
                filterParams: {
                    filterOptions: [
                        IncludesFilter,
                        ExcludesFilter,
                    ],
                    trimInput: true,
                    debounceMs: 1000,
                },
                minWidth: this.minWidth(175),
                headerTooltip: 'Tiers of the item (defines the quality that places new to have to spawn this item). Must exist in area map. * = custom maps only.',
            },
            {
                headerName: 'Usages',
                valueGetter: (params) => {
                    return params.data?.usage?.map((x) => ({
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
                cellRenderer: UsageRenderer,
                editable: false,
                filter: true,
                filterParams: {
                    filterOptions: [
                        IncludesFilter,
                        ExcludesFilter,
                    ],
                    trimInput: true,
                    debounceMs: 1000,
                },
                minWidth: this.minWidth(175),
                headerTooltip: 'The categories of places to spawn this item (Must exist in area map)',
            },
            {
                headerName: 'Nominal',
                valueGetter: (params) => Number(params.data?.nominal[0]),
                valueSetter: (params) => {
                    params.data.nominal[0] = String(params.newValue);

                    // auto validate min <= nominal
                    if (Number(params.data.min[0]) > Number(params.data.nominal[0])) {
                        // eslint-disable-next-line prefer-destructuring
                        params.data.min[0] = params.data.nominal[0];
                    }

                    return true;
                },
                minWidth: this.minWidth(75),
                headerTooltip: 'The targeted amount of items to be spawned in world/inventories/players (must be higher or equal to min)',
            },
            {
                headerName: 'LifeTime',
                valueGetter: (params) => Number(params.data?.lifetime[0]),
                valueSetter: (params) => {
                    params.data.lifetime[0] = String(params.newValue);
                    return true;
                },
                minWidth: this.minWidth(100),
                headerTooltip: 'Despawn time of this item',
            },
            {
                headerName: 'Restock',
                valueGetter: (params) => Number(params.data?.restock[0]),
                valueSetter: (params) => {
                    params.data.restock[0] = String(params.newValue);
                    return true;
                },
                minWidth: this.minWidth(75),
                headerTooltip: 'If the minimum amount of this item is reached, the CE will wait this amount of time until its respawning again.',
            },
            {
                headerName: 'Min',
                valueGetter: (params) => Number(params.data?.min[0]),
                valueSetter: (params) => {
                    params.data.min[0] = String(params.newValue);

                    // auto validate min <= nominal
                    if (Number(params.data.min[0]) > Number(params.data.nominal[0])) {
                        // eslint-disable-next-line prefer-destructuring
                        params.data.nominal[0] = params.data.min[0];
                    }

                    return true;
                },
                minWidth: this.minWidth(50),
                headerTooltip: 'Minimum amount of this item in the world',
            },
            {
                headerName: 'QuantMin',
                valueGetter: (params) => Number(params.data?.quantmin[0]),
                valueSetter: (params) => {
                    params.data.quantmin[0] = String(params.newValue);

                    // auto validate both min and max either -1 or some value
                    if (params.data.quantmin[0] === '-1' && params.data.quantmax[0] !== '-1') {
                        params.data.quantmax[0] = '-1';
                    // auto validate min <= max
                    } else if (params.data.quantmin[0] !== '-1' && Number(params.data.quantmin[0]) > Number(params.data.quantmax[0])) {
                        // eslint-disable-next-line prefer-destructuring
                        params.data.quantmax[0] = params.data.quantmin[0];
                    }

                    return true;
                },
                minWidth: this.minWidth(75),
                headerTooltip: 'Quantmin and Quantmax must either both be -1 or some value between 1 and 100 (Percents). The minimum percent this item is filled with items (i.e. bullets in a mag)',
            },
            {
                headerName: 'QuantMax',
                valueGetter: (params) => Number(params.data?.quantmax[0]),
                valueSetter: (params) => {
                    params.data.quantmax[0] = String(params.newValue);

                    // auto validate both min and max either -1 or some value
                    if (params.data.quantmax[0] === '-1' && params.data.quantmin[0] !== '-1') {
                        params.data.quantmin[0] = '-1';
                    // auto validate min <= max
                    } else if (params.data.quantmax[0] !== '-1' && Number(params.data.quantmin[0]) > Number(params.data.quantmax[0])) {
                        // eslint-disable-next-line prefer-destructuring
                        params.data.quantmin[0] = params.data.quantmax[0];
                    }

                    return true;
                },
                minWidth: this.minWidth(75),
                headerTooltip: 'Quantmin and Quantmax must either both be -1 or some value between 1 and 100 (Percents). The maximum percent this item is filled with items (i.e. bullets in a mag)',
            },
            {
                headerName: 'Cost',
                valueGetter: (params) => Number(params.data?.cost[0]),
                valueSetter: (params) => {
                    params.data.cost[0] = String(params.newValue);
                    return true;
                },
                minWidth: this.minWidth(50),
                headerTooltip: 'Priority in the spawn queue. Pretty much always 100 unless you want to make items less likely to spawn',
            },
            {
                headerName: 'Count in Cargo',
                valueGetter: (params) => params.data?.flags[0].$.count_in_cargo === '1',
                valueSetter: (params) => {
                    params.data.flags[0].$.count_in_cargo = params.newValue ? '1' : '0';
                    return true;
                },
                minWidth: this.minWidth(75),
                sortable: false,
                filter: false,
                cellRenderer: CheckboxRenderer,
                headerTooltip: 'Wether the total amount of this item includes items in crates, containers, vehicles, backpacks etc',
            },
            {
                headerName: 'Count in Hoarder',
                valueGetter: (params) => params.data?.flags[0].$.count_in_hoarder === '1',
                valueSetter: (params) => {
                    params.data.flags[0].$.count_in_hoarder = params.newValue ? '1' : '0';
                    return true;
                },
                minWidth: this.minWidth(75),
                sortable: false,
                filter: false,
                cellRenderer: CheckboxRenderer,
                headerTooltip: 'Wether the total amount of this item includes items in stashes, tents, barrels etc',
            },
            {
                headerName: 'Count in Map',
                valueGetter: (params) => params.data?.flags[0].$.count_in_map === '1',
                valueSetter: (params) => {
                    params.data.flags[0].$.count_in_map = params.newValue ? '1' : '0';
                    return true;
                },
                minWidth: this.minWidth(75),
                sortable: false,
                filter: false,
                cellRenderer: CheckboxRenderer,
                headerTooltip: 'Wether the total amount of this item includes items in buildings',
            },
            {
                headerName: 'Count in Player',
                valueGetter: (params) => params.data?.flags[0].$.count_in_player === '1',
                valueSetter: (params) => {
                    params.data.flags[0].$.count_in_player = params.newValue ? '1' : '0';
                    return true;
                },
                minWidth: this.minWidth(75),
                sortable: false,
                filter: false,
                cellRenderer: CheckboxRenderer,
                headerTooltip: 'Wether the total amount of this item includes items in player inventories',
            },
            {
                headerName: 'crafted',
                valueGetter: (params) => params.data?.flags[0].$.crafted === '1',
                valueSetter: (params) => {
                    params.data.flags[0].$.crafted = params.newValue ? '1' : '0';
                    return true;
                },
                minWidth: this.minWidth(50),
                sortable: false,
                filter: false,
                cellRenderer: CheckboxRenderer,
                headerTooltip: 'Wether this item is made by crafting',
            },
            {
                headerName: 'deloot',
                valueGetter: (params) => params.data?.flags[0].$.deloot === '1',
                valueSetter: (params) => {
                    params.data.flags[0].$.deloot = params.newValue ? '1' : '0';
                    return true;
                },
                minWidth: this.minWidth(50),
                sortable: false,
                filter: false,
                cellRenderer: CheckboxRenderer,
                headerTooltip: 'Wether this item is spawned at dynamic events',
            },
        ];
    }

    protected async saveFiles(): Promise<void> {
        for (const file of this.files) {
            const xmlContent = new xml.Builder().buildObject(file.content);
            await this.appCommon.updateMissionFile(
                file.file,
                xmlContent,
                this.withBackup,
            ).toPromise();
        }
    }

    public async onSubmit(): Promise<void> {
        if (this.loading || this.submitting) return;
        this.submitting = true;
        this.outcomeBadge = undefined;

        if (this.validate(false)) {
            try {
                await this.saveFiles();
                if (this.withRestart) {
                    await this.maintenance.restartServer();
                }
                this.outcomeBadge = {
                    success: true,
                    message: 'Submitted successfully',
                };
            } catch (e: any) {
                console.error(e);
                this.outcomeBadge = {
                    success: false,
                    message: `Failed to submit: ${e.message}`,
                };
            }
        } else {
            this.outcomeBadge = {
                success: false,
                message: `Failed to submit: Validation Errors`,
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
            this.coreXml = await xml.parseStringPromise(core);
            const ceEntries = this.coreXml.economycore.ce || [];
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

            this.files = ((await Promise.all(typesFiles.map(async (x) => {
                try {
                    const fileContent = await this.appCommon.fetchMissionFile(x).toPromise();
                    return {
                        file: x,
                        content: await xml.parseStringPromise(fileContent),
                    };
                } catch (e) {
                    console.error(`Failed to load file: ${x}`, e);
                    this.outcomeBadge = {
                        success: false,
                        message: `Failed to load file: ${x}`,
                    };
                    return {
                        file: x,
                        content: {
                            types: { type: [] },
                        },
                    };
                }
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
        } catch (e) {
            console.error(e);
        }

        this.loading = false;
    }

    public setAttr(attr: string, value: string | number): void {
        if (!this.files?.length || this.activeTab > this.files.length || this.activeTab < 0) {
            return;
        }

        for (const type of this.files[this.activeTab].content.types.type) {
            try {
                type[attr][0] = String(value);
            } catch (e) {}
        }

        // trigger change detection
        this.files[this.activeTab].content.types.type = [...this.files[this.activeTab].content.types.type];
    }

    public changeAttrInPercent(attr: string, percent: string | number): void {
        if (!this.files?.length || this.activeTab > this.files.length || this.activeTab < 0) {
            return;
        }
        const multiplier = Number(percent) / 100.0;
        this.agGrid.api.forEachNodeAfterFilter((x) => {
            console.warn(x, x.data, attr, x.data[attr])
            try {
                const num = Number(x.data[attr][0]);
                if (num && num > 0) {
                    x.data[attr][0] = String(num * multiplier);
                }
            } catch (e) {
                console.error(e);
            }
        });
        // this.agGrid.api.redrawRows();

        // trigger change detection
        this.files[this.activeTab].content.types.type = [...this.files[this.activeTab].content.types.type];
    }

    public validate(showSuccess: boolean): boolean {
        let result = true;
        this.validationErrors = [];
        for (const type of this.files[this.activeTab].content.types.type) {
            if (Number(type.min[0]) > Number(type.nominal[0])) {
                result = false;
                this.validationErrors.push(`${type.$.name}: Min > Nominal`);
            }
            if ((type.quantmin[0] === '-1' || type.quantmax[0] === '-1') && (type.quantmin[0] !== '-1' || type.quantmax[0] !== '-1')) {
                result = false;
                this.validationErrors.push(`${type.$.name}: QuantMin & QuantMax must be both -1 or both != -1`);
            }
            if (Number(type.quantmin[0]) > Number(type.quantmax[0])) {
                result = false;
                this.validationErrors.push(`${type.$.name}: QuantMin > QuantMax`);
            }
        }

        if (result && showSuccess) {
            this.outcomeBadge = {
                success: true,
                message: 'No errors found',
            };
        }

        return result;
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
            (window.navigator as any).msSaveBlob(blob, filename);
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

    protected minWidth(width: number): number {
        return this.lockedWidth ? width * 2 : width;
    }

}
