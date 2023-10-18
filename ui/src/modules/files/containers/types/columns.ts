import { ColDef, ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { TypesComponent } from "./types.component";
import { CheckboxRenderer, GenericListRenderer } from "./renderers";
import { ExcludesFilter, IncludesFilter } from "./filter";
import { AttributeOperation, LIST_OPS, NUMBER_OPS } from "./ops";
import { ItemCalculator } from "./calc";

export abstract class ColBase implements ColDef<string> {
    public colId: string;
    public minWidth!: number;
    public operations: AttributeOperation[] = [];
    public extraDropdownEntries: any[] = [];

    public calc: ItemCalculator;
    public constructor(
        public types: TypesComponent,
        public headerName: string,
    ) {
        this.colId = headerName;
        this.calc = ItemCalculator.getInstance(types);
    }

    abstract valueGetter(params: ValueGetterParams<string>): any;
    abstract valueSetter(params: ValueSetterParams<string>): boolean;
}

export class NameCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Name')
        this.minWidth = this.types.minWidth(150);
    }
    headerTooltip = 'Class Name of the item';

    valueGetter = (params: ValueGetterParams<string>) => {
        // console.log(params)
        const type = this.types.getTypeEntry(params.data);
        return type?.$?.name;
    }
    valueSetter = (params: ValueSetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        if (type) {
            type.$.name = params.newValue;
            return true;
        }
        return false;
    }
}

export class CategoryCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super (types, 'Categories')
        this.minWidth = this.types.minWidth(175);
    }
    headerTooltip = 'Categories of this item. Used to determine general usage (Must exist in area map)';

    valueGetter = (params: ValueGetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        return type?.category?.map((x) => x.$.name) ?? [];
    }
    valueSetter = (params: ValueSetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        if (type) {
            type.category = params.newValue.map((x) => ({
                $: {
                    name: x,
                },
            }));
            return true;
        }
        return false;
    }

    cellRenderer = GenericListRenderer;
    editable = true;
    filter = true;
    filterParams = {
        filterOptions: [
            IncludesFilter,
            ExcludesFilter,
        ],
        trimInput: true,
        debounceMs: 1000,
    };

    override extraDropdownEntries: any[] = [
        'weapons',
        'explosives',
        'clothes',
        'containers',
        'tools',
        'vehicleparts',
        'food',
    ];

    override operations = [...LIST_OPS];
}


export class ValuesCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Values')
        this.minWidth = this.types.minWidth(175);
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        return type?.value?.map((x) => x.$.name) ?? [];
    }
    valueSetter = (params: ValueSetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        if (type) {
            type.value = params.newValue.map((x) => ({
                $: {
                    name: x,
                },
            }));
            return true;
        }
        return false;
    };
    cellRenderer = GenericListRenderer;
    editable = false;
    filter = true;
    filterParams = {
        filterOptions: [
            IncludesFilter,
            ExcludesFilter,
        ],
        trimInput: true,
        debounceMs: 1000,
    };
    headerTooltip = 'Tiers of the item (defines the quality that places new to have to spawn this item). Must exist in area map. * = custom maps only.';
    override operations = [...LIST_OPS];
}

export class UsagesCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Usages')
        this.minWidth = this.types.minWidth(175);
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        return type?.usage?.map((x) => x.$.name) ?? [];
    }
    valueSetter = (params: ValueSetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        if (type) {
            type.usage = params.newValue.map((x) => ({
                $: {
                    name: x,
                },
            }));
            return true;
        }
        return false;
    }
    cellRenderer = GenericListRenderer;
    editable = false;
    filter = true;
    filterParams = {
        filterOptions: [
            IncludesFilter,
            ExcludesFilter,
        ],
        trimInput: true,
        debounceMs: 1000,
    };
    headerTooltip = 'The categories of places to spawn this item (Must exist in area map)';
    override operations = [...LIST_OPS];
}

export class NominalCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Nominal')
        this.minWidth = this.types.minWidth(75);
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        return Number(type?.nominal[0])
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data)

        if (type) {
            type.nominal[0] = String(params.newValue);

            // auto validate min <= nominal
            if (Number(type.min[0]) > Number(type.nominal[0])) {
                // eslint-disable-next-line prefer-destructuring
                type.min[0] = type.nominal[0];
            }
            return true;
        }
        return false;
    }
    headerTooltip = 'The targeted amount of items to be spawned in world/inventories/players (must be higher or equal to min)';
    override operations = [...NUMBER_OPS];
}

export class ScoreCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Score')
        this.minWidth = this.types.minWidth(75);
    }
    valueSetter = (params: ValueSetterParams<string>) => {
        return false;
    }
    editable = false;
    valueGetter = (params: ValueGetterParams<string>) => {
        const score = this.calc.calcItemScore(params.data);
        if (score !== null) {
            return Math.ceil(score);
        }
        return undefined;
    };
    headerTooltip = 'The estimated score of this item';
}

export class EstimatedNominalCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Estimated Nominal')
        this.minWidth = this.types.minWidth(75);
    }
    valueSetter = (params: ValueSetterParams<string>) => {
        return false;
    }
    editable = false;
    valueGetter = (params) => {
        const estimated = this.calc.estimateItemNominal(params.data);
        if (estimated !== null) {
            return estimated;
        }
        return undefined;
    }
}

export class LifeTimeCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'LifeTime')
        this.minWidth = this.types.minWidth(100);
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        return Number(type?.lifetime[0])
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data)
        if (type) {
            type.lifetime[0] = String(params.newValue);
            return true;
        }
        return false;
    }
    headerTooltip = 'Despawn time of this item';
    override operations = [...NUMBER_OPS];
}
export class RestockCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Restock')
        this.minWidth = this.types.minWidth(75);
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        return Number(type?.restock[0])
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data)
        if (type) {
            type.restock[0] = String(params.newValue);
            return true;
        }
        return false;
    }
    headerTooltip = 'If the minimum amount of this item is reached, the CE will wait this amount of time until its respawning again.';
    override operations = [...NUMBER_OPS];
}

export class MinCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Min')
        this.minWidth = this.types.minWidth(50);
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        return Number(type?.min[0])
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data)
        if (type) {
            type.min[0] = String(params.newValue);
            // auto validate min <= nominal
            if (Number(type.min[0]) > Number(type.nominal[0])) {
                // eslint-disable-next-line prefer-destructuring
                type.nominal[0] = type.min[0];
            }
            return true;
        }
        return false;
    }
    headerTooltip = 'Minimum amount of this item in the world';
    override operations = [...NUMBER_OPS];
}

export class QuantMinCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'QuantMin')
        this.minWidth = this.types.minWidth(75);
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        return Number(type?.quantmin[0])
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data)
        if (type) {
            type.quantmin[0] = String(params.newValue);
            // auto validate both min and max either -1 or some value
            if (type.quantmin[0] === '-1' && type.quantmax[0] !== '-1') {
                type.quantmax[0] = '-1';
            // auto validate min <= max
            } else if (type.quantmin[0] !== '-1' && Number(type.quantmin[0]) > Number(type.quantmax[0])) {
                // eslint-disable-next-line prefer-destructuring
                type.quantmax[0] = type.quantmin[0];
            }
            return true;
        }
        return false;
    }
    headerTooltip = 'Quantmin and Quantmax must either both be -1 or some value between 1 and 100 (Percents). The minimum percent this item is filled with items (i.e. bullets in a mag)';
    override operations = [...NUMBER_OPS];
}


export class QuantMaxCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'QuantMax')
        this.minWidth = this.types.minWidth(75);
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        return Number(type?.quantmax[0])
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data)
        if (type) {
            type.quantmax[0] = String(params.newValue);
            // auto validate both min and max either -1 or some value
            if (type.quantmax[0] === '-1' && type.quantmin[0] !== '-1') {
                type.quantmin[0] = '-1';
            // auto validate min <= max
            } else if (type.quantmax[0] !== '-1' && Number(type.quantmin[0]) > Number(type.quantmax[0])) {
                // eslint-disable-next-line prefer-destructuring
                type.quantmin[0] = type.quantmax[0];
            }
            return true;
        }
        return false;
    }
    headerTooltip = 'Quantmin and Quantmax must either both be -1 or some value between 1 and 100 (Percents). The maximum percent this item is filled with items (i.e. bullets in a mag)';
    override operations = [...NUMBER_OPS];
}

export class CostCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'CostMax')
        this.minWidth = this.types.minWidth(50);
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        return Number(type?.cost[0])
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data)
        if (type) {
            type.cost[0] = String(params.newValue);
            return true;
        }
        return false;
    }
    headerTooltip = 'Priority in the spawn queue. Pretty much always 100 unless you want to make items less likely to spawn';
    override operations = [...NUMBER_OPS];
}

export class CountInCargoCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Count in Cargo')
        this.minWidth = this.types.minWidth(75);
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        return Number(type?.flags[0].$.count_in_cargo === '1')
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data)
        if (type) {
            type.flags[0].$.count_in_cargo = params.newValue ? '1' : '0';
            return true;
        }
        return false;
    }
    sortable = false;
    filter = false;
    cellRenderer = CheckboxRenderer;
    headerTooltip = 'Wether the total amount of this item includes items in crates, containers, vehicles, backpacks etc';
}

export class CountInHoarderCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Count in Hoarder')
        this.minWidth = this.types.minWidth(75);
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        return Number(type?.flags[0].$.count_in_hoarder === '1')
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data)
        if (type) {
            type.flags[0].$.count_in_hoarder = params.newValue ? '1' : '0';
            return true;
        }
        return false;
    }
    sortable = false;
    filter = false;
    cellRenderer = CheckboxRenderer;
    headerTooltip = 'Wether the total amount of this item includes items in stashes, tents, barrels etc';
}

export class CountInMapCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Count in Map')
        this.minWidth = this.types.minWidth(75);
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        return Number(type?.flags[0].$.count_in_map === '1')
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data)
        if (type) {
            type.flags[0].$.count_in_map = params.newValue ? '1' : '0';
            return true;
        }
        return false;
    }
    sortable = false;
    filter = false;
    cellRenderer = CheckboxRenderer;
    headerTooltip = 'Wether the total amount of this item includes items in buildings';
}

export class CountInPlayerCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Count in Player')
        this.minWidth = this.types.minWidth(75);
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        return Number(type?.flags[0].$.count_in_player === '1')
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data)
        if (type) {
            type.flags[0].$.count_in_player = params.newValue ? '1' : '0';
            return true;
        }
        return false;
    }
    sortable = false;
    filter = false;
    cellRenderer = CheckboxRenderer;
    headerTooltip = 'Wether the total amount of this item includes items in player inventories';
}

export class CraftedCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Crafted')
        this.minWidth = this.types.minWidth(75);
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        return Number(type?.flags[0].$.crafted === '1')
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data)
        if (type) {
            type.flags[0].$.crafted = params.newValue ? '1' : '0';
            return true;
        }
        return false;
    }
    sortable = false;
    filter = false;
    cellRenderer = CheckboxRenderer;
    headerTooltip = 'Wether this item is made by crafting';
}

export class DelootCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Deloot')
        this.minWidth = this.types.minWidth(75);
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data);
        return Number(type?.flags[0].$.deloot === '1')
    };
    valueSetter = (params: ValueSetterParams<string>) => {
        const type = this.types.getTypeEntry(params.data)
        if (type) {
            type.flags[0].$.deloot = params.newValue ? '1' : '0';
            return true;
        }
        return false;
    }
    sortable = false;
    filter = false;
    cellRenderer = CheckboxRenderer;
    headerTooltip = 'Wether this item is spawned at dynamic events';
}


export class RPMCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'RPM')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        return this.calc.calcWeaponRpm(params.data);
    };
}

export class MaxMagSizeCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Max Mag Size')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        return this.calc.calcWeaponMaxMagSize(params.data);
    }
}

export class DispersionCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Dispersion')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        return this.calc.calcWeaponDispersion(params.data);
    }
}

export class DamageBloodCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Damage Blood')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        return this.calc.calcWeaponAmmoProp('damageBlood', params.data);
    }
}

export class DamageHPCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Damage HP')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        return this.calc.calcWeaponAmmoProp('damageHP', params.data);
    }
}

export class DamageArmorCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Damage Armor')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        return this.calc.calcWeaponAmmoProp('damageArmor', params.data);
    }
}

export class BulletSpeedCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Bulletspeed')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        return this.calc.calcWeaponBulletSpeed(params.data);
    }
}

export class MaxRangeCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Max Range')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        return this.calc.calcWeaponRange(params.data);
    }
}

export class RecoilCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Recoil')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        return this.calc.calcWeaponRecoil('Y', params.data);
    }
}

export class StabilityCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Stability')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params: ValueGetterParams<string>) => {
        return this.calc.calcWeaponRecoil('X', params.data);
    }
}

/*
export class MaxRecoilUpCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Max Recoil Up')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        const weapon = this.types.getWeaponEntry(params.data);
        if (weapon) {
            let recoilY = weapon.recoilMouseOffsetDistance;
            if (weapon.recoilModifier?.[1]) {
                recoilY *= weapon.recoilModifier[1];
            }
            return round(recoilY, 5);
        }
        return undefined;
    }
}

export class MaxRecoilRightCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Max Recoil Right')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        const weapon = this.types.getWeaponEntry(params.data);
        if (weapon) {
            let recoilX = weapon.recoilMouseOffsetDistance;
            if (weapon.recoilModifier?.[0]) {
                recoilX *= weapon.recoilModifier[0];
            }
            return round(Math.sin(toRadians(Math.abs(weapon.recoilMouseOffsetRangeMax - 90))) * recoilX, 5);
        }
        return undefined;
    }
}

export class MaxRfecoilLeftCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Max Recoil Left')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        const weapon = this.types.getWeaponEntry(params.data);
        if (weapon) {
            let recoilX = weapon.recoilMouseOffsetDistance;
            if (weapon.recoilModifier?.[0]) {
                recoilX *= weapon.recoilModifier[0];
            }
            return round(Math.sin(toRadians(Math.abs(weapon.recoilMouseOffsetRangeMin - 90))) * recoilX, 5);
        }
        return undefined;
    }
}
*/

export class ArmorProjectileCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Armor Projectile')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        const clothing = this.types.getClothingEntry(params.data);
        if (clothing) {
            return Math.round(clothing.armorProjectileHP * 100);
        }
        return undefined;
    }
}

export class ArmorFragCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Armor Frag')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        const clothing = this.types.getClothingEntry(params.data);
        if (clothing) {
            return Math.round(clothing.armorFragHP * 100);
        }
        return undefined;
    }
}

export class ArmorInfectedCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Armor Infected')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        const clothing = this.types.getClothingEntry(params.data);
        if (clothing) {
            return Math.round(clothing.armorInfectedHP * 100);
        }
        return undefined;
    }
}

export class ArmorMeleeCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Armor Melee')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        const clothing = this.types.getClothingEntry(params.data);
        if (clothing) {
            return Math.round(clothing.armorMeleeHP * 100);
        }
        return undefined;
    }
}

export class CargoSizeCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Cargo Size')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        const clothing = this.types.getClothingEntry(params.data);
        if (clothing?.cargoSize?.length) {
            return clothing.cargoSize[0] * clothing.cargoSize[1];
        }
        return undefined;
    }
}

export class WeaponSlotsCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Weapon Slots')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        const item = this.types.getClothingEntry(params.data)
            || this.types.getItemEntry(params.data)
        ;
        if (item) {
            const weaponslots = item.attachments?.filter(
                (x) => x?.toLowerCase().includes('shoulder')
            )?.length || 0;
            // if(weaponslots) {
            //     console.log(params.data, weaponslots)
            // }
            return weaponslots;
        }
        return undefined;
    }
}

export class PistolSlotsCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Pistol Slots')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        const item = this.types.getClothingEntry(params.data)
            || this.types.getItemEntry(params.data)
        ;
        if (item) {
            return item.attachments?.filter((x) => x?.toLowerCase().includes('pistol'))?.length || 0;
        }
        return undefined;
    }
}


export class MaxCargoSizeCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Max Cargo Size')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        const item =
            this.types.getClothingEntry(params.data)
            || this.types.getItemEntry(params.data)
        ;
        if (item) {
            return this.calc.getMaxCargoSpace(params.data);
        }
        return undefined;
    }
}

export class IsolationCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Isolation')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        const clothing = this.types.getClothingEntry(params.data);
        if (clothing) {
            return Math.round(clothing.heatIsolation * 100);
        }
        return undefined;
    }
}

export class VisibilityCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Visibility')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        const clothing = this.types.getClothingEntry(params.data);
        if (clothing) {
            return Math.round(clothing.visibilityModifier * 100);
        }
        return undefined;
    }
}

export class WeightCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Weight')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        const item = this.types.getDumpEntry(params.data);
        if (item?.weight) {
            return Math.round(item.weight / 100) / 10;
        }
        return undefined;
    }
}

export class HitpointsCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'Hitpoints')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        const detail = this.types.getDumpEntry();
        return detail?.hitPoints || '';
    }
}

export class ItemInfoCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'ItemInfo')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        const detail = this.types.getDumpEntry();
        return detail?.itemInfo || [];
    }
    cellRenderer = GenericListRenderer;
    filter = true;
    filterParams = {
        filterOptions: [
            IncludesFilter,
            ExcludesFilter,
        ],
        trimInput: true,
        debounceMs: 1000,
    }
}

export class LootTagCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'LootTag')
        this.minWidth = this.types.minWidth(75);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        const detail = this.types.getDumpEntry(params.data);
        return detail?.lootTag || [];
    }

    cellRenderer = GenericListRenderer;
    filter = true;
    filterParams = {
        filterOptions: [
            IncludesFilter,
            ExcludesFilter,
        ],
        trimInput: true,
        debounceMs: 1000,
    };
}

export class LootCategoryCol extends ColBase {
    public constructor(
        types: TypesComponent,
    ) {
        super(types, 'LootCategory')
        this.minWidth = this.types.minWidth(100);
    }
    editable = false;
    valueSetter = (params: ValueSetterParams<string, any>) => {
        return false;
    }
    valueGetter = (params) => {
        const detail = this.types.getDumpEntry(params.data);
        return detail?.lootCategory || '';
    }
}



