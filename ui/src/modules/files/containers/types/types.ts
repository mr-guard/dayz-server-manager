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

    lifetime: [string];
    nominal: [string];
    restock: [string];
    min: [string];
    quantmin: [string];
    quantmax: [string];
    cost: [string];
}

export interface TypesXml {
    types: { type: TypesXmlEntry[] };
}

export interface SpawnableTypesXmlEntry extends TypesName {
    /*
    <type name="AK74">
		<attachments chance="1.00">
			<item name="AK74_WoodBttstck" chance="1.00" />
		</attachments>
		<attachments chance="1.00">
			<item name="AK74_Hndgrd" chance="1.00" />
		</attachments>
		<attachments chance="0.30">
			<item name="KashtanOptic" chance="0.50" />
			<item name="PSO11Optic" chance="0.30" />
		</attachments>
		<attachments chance="0.30">
			<item name="Mag_AK74_45Rnd" chance="0.15" />
			<item name="Mag_AK74_30Rnd" chance="1.00" />
		</attachments>
	</type>
    */
    attachments: {
        $: {
            name: string
            chance: string;
        };
        item: {
            $: {
                name: string
                chance: string;
            };
        }[]
    }[];
}

export interface SpawnableTypesXml {
    spawnabletypes: { type: SpawnableTypesXmlEntry[] };
}

export interface CoreXml {
    economycore: {
        ce: [
            {
                $: {
                    folder: string,
                },
                file: {
                    $: {
                        name: string,
                        type: string,
                    }
                }[]
            }
        ]
    }
}

export interface LimitsXml {
    lists: {
        categories: [{
            category: {
                $: {
                    name: string,
                },
            }[],
        }],
        tags: [{
            tag: {
                $: {
                    name: string,
                },
            }[],
        }],
        usageflags: [{
            usage: {
                $: {
                    name: string,
                },
            }[],
        }],
        valueflags: [{
            value: {
                $: {
                    name: string,
                },
            }[],
        }],
    },
}

export interface EventSpawnPos {
    $: {
        x: string,
        y?: string,
        z: string,
        a: string,
    }
}

export interface EventSpawn {
    $: {
        name: string
    },
    pos?: EventSpawnPos[];
}

export interface EventSpawnsXml {
    eventposdef: {
        event: EventSpawn[];
    }
}

export interface MapGroup {
    $: {
        name: string,
        pos: string,
        rpy: string,
        a: string,
    }
}

export interface MapGroupPosXml {
    map: {
        group: MapGroup[]
    }
}

export interface DZSMDumpEntry {
	classname: string;
	source: string;

	parents: string[];
}

export interface DZSMBaseDumpEntry extends DZSMDumpEntry {
    displayName: string;
	hitPoints: number;

	weight: number;
	size: number[];

	repairableWithKits: number[];
	repairCosts: number[];

	inventorySlot: string[];
	lootCategory: string;
	lootTag: string[];
	itemInfo: string[];
}

export interface DZSMAmmoDumpEntry extends DZSMDumpEntry {
	displayName: string;
	projectile: string;
	simulation: string;

	hit: number;
	indirectHit: number;
	indirectHitRange: number;

	initSpeed: number;
	typicalSpeed: number;
	airFriction: number;

	tracer: boolean;
    explosive: boolean;
	ttl: number;

	weight: number;
	caliber: number;
	projectilesCount: number;
	deflecting: number;

	noiseHit: number;

    damageOverride: number;
	damageHP: number;
	damageBlood: number;
	damageShock: number;
	damageArmor: number;
}

export interface DZSMMagDumpEntry extends DZSMDumpEntry {
	displayName: string;
	projectile: string;

	weight: number;
	capacity: number;
	weightPerQuantityUnit: number;

	size: number[];
	ammo: string[];
}

export interface DZSMWeaponModeDumpEntry {
	name: string;
	rpm: number;
	dispersion: number;
	rounds: number;
}

export interface DZSMWeaponDumpEntry extends DZSMBaseDumpEntry {
	noise: number;
	magazineSwitchTime: number;
	initSpeedMultiplier: number;

    opticsDistanceZoomMin: number;
	opticsDistanceZoomMax: number;
	opticsDiscreteDistance: number[];

    recoilMouseOffsetRangeMin: number;
	recoilMouseOffsetRangeMax: number;
	recoilMouseOffsetDistance: number;
	recoilMouseOffsetRelativeTime: number;

	recoilCamOffsetDistance: number;
	recoilCamOffsetRelativeTime: number;
	recoilModifier: number[];
	swayModifier: number[];

	chamberSize: number;
	barrels: number;

    color: string;

	ammo: string[];
	mags: string[];
	attachments: string[];

	modes: DZSMWeaponModeDumpEntry[];
}

export interface DZSMClothingDumpEntry extends DZSMBaseDumpEntry
{
	heatIsolation: number;
	visibilityModifier: number;
	quickBarBonus: number;
	durability: number;

	armorProjectileHP: number;
	armorProjectileBlood: number;
	armorProjectileShock: number;

	armorMeleeHP: number;
	armorMeleeBlood: number;
	armorMeleeShock: number;

	armorFragHP: number;
	armorFragBlood: number;
	armorFragShock: number;

	armorInfectedHP: number;
	armorInfectedBlood: number;
	armorInfectedShock: number;

	cargoSize: number[];

	attachments: string[];
}

export interface DZSMItemDumpEntry extends DZSMBaseDumpEntry {
	isMeleeWeapon: boolean;

	repairKitType: number;

	nutrition: any; // No usage currently
	medicine: any; // No usage currently

    cargoSize: number[];
    attachments: string[];

    recoilModifier: number[];
	swayModifier: number[];
	noiseShootModifier: number;
	dispersionModifier: number;

	opticsDistanceZoomMin: number;
	opticsDistanceZoomMax: number;
	opticsDiscreteDistance: number[];

}

export interface TraderItem {
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

export const toRadians = (angle: number): number => {
    return angle * (Math.PI / 180);
}

export const round = (num: number | undefined, decimals: number = 1): number => {
    if (!num) return num!;
    return +(num.toFixed(decimals));
}

export const arrayMax = <T>(list: T[], accessor: (item: T) => number | undefined = (x) => x as any) => {
    if (!list?.length) return undefined;
    const max = list
        .map((x) => accessor(x) ?? -Infinity)
        .reduce((a, b) => Math.max(a, b), -Infinity);
    return max === -Infinity ? undefined : max;
}

export const arrayMin = <T>(list: T[], accessor: (item: T) => number | undefined = (x) => x as any) => {
    if (!list?.length) return undefined;
    const min = list
        .map((x) => accessor(x) ?? Infinity)
        .reduce((a, b) => Math.min(a, b), Infinity);
    return min === Infinity ? undefined : min;
}

export const clamp = (min: number, max: number, value: number) => {
    return Math.min(Math.max(value, min), max);
}

export const lerp = (min: number, max: number, alpha: number) => {
    return min + alpha * (max - min);
}

export const reverselerp = (min: number, max: number, val: number) => {
    return clamp(0, 1, (val - min) / max);
}

export const reverselerpnoclamp = (min: number, max: number, val: number) => {
    return (val - min) / max;
}
