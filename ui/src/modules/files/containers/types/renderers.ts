import { Component } from "@angular/core";
import { ICellRendererAngularComp } from "ag-grid-angular";
import { ICellRendererParams } from "ag-grid-community";
import { ColBase } from "./columns";

@Component({
    selector: 'generic-list-renderer',
    template: `
        <ng-select
               placeholder="Select item"
               appendTo="body"
               [searchable]="false"
               [multiple]="true"
               [disabled]="false"
               [closeOnSelect]="false"
               [(ngModel)]="selectedItems"
               [compareWith]="compareWith"
               (ngModelChange)="checkedHandler($event)"
               style="height: 100%;"
        >
            <ng-option *ngFor="let item of dropdownList"
                       [value]="item.value"
            >
                {{item.label}}
            </ng-option>
        </ng-select>
    `,
})
export class GenericListRenderer implements ICellRendererAngularComp {

    public params!: ICellRendererParams<string>;

    public dropdownList: {label: string, value: any}[] = [];

    public selectedItems: any[] = [];

    public agInit(params: ICellRendererParams<string>): void {
        this.params = params;
        this.selectedItems = [...(params.value || [])];

        this.dropdownList = this.mapLabels([
            ...this.dropdownList.map((x) => x.value),
            ...((params.colDef as ColBase).extraDropdownEntries || []),
            ...(params.value || [])
        ].reduce((prev, x) => {
            if (!prev.includes(x)) {
                prev.push(x);
            }
            return prev;
        }, [] as any[]));
    }

    private mapLabels(values: any[]): {label: string, value: any}[] {
        const labels = (this.params.colDef as ColBase).valueLabels || {};
        return values.map((x) => ({
            label: labels[x] ? `${x} (${labels[x]})` : x,
            value: x,
        }));
    }

    public checkedHandler(change: any): void {
        const colId = this.params.colDef?.colId!;
        this.params.node.setDataValue(colId, [...change]);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public refresh(params: ICellRendererParams): boolean {
        return true;
    }

    public isPopup(): boolean {
        return false;
    }

    public compareWith = (a, b) => a === b;

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
        this.selectedItems = params.value.map((x: string) => {
            if (!this.dropdownList.find((listed) => listed.name === x)) {
                this.dropdownList.push({
                    name: x,
                    label: `${x}*`,
                });
            }
            return x;
        });
    }

    public checkedHandler(): void {
        const { colId } = this.params.column;
        this.params.node.setDataValue(colId, [...this.selectedItems]);
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
        for (let i = 1; i <= 17; i++) {
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


@Component({
    selector: 'rarity-renderer',
    template: `
        <select [(ngModel)]="value"
                (ngModelChange)="checkedHandler($event)"
        >
            <option *ngFor="let rarity of RARITY_LIST; let i = index"
                    [ngValue]="i"
            >
                {{i}} ({{ rarity }})
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
        // console.warn(newValue)
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
