import { DZSMAmmoDumpEntry, DZSMDumpEntry, SpawnableTypesXmlEntry, arrayMax, arrayMin, clamp, reverselerp, reverselerpnoclamp, round } from './types';
import { TypesComponent } from './types.component';

export interface WeaponScoreParams {
    dmg: number;
    dmgScore: number;
    armorDmg: number;
    armorDmgBonus: number;
    combatWindow: number;
    combatWindowChance: number;
    dispersion: number;
    effectiveRange: number;
    effectiveRangeBonus: number;
    range: number;
    rangeBonus: number;
    maxMagSize: number;
    maxMagSizeBonus: number;
    canSuppressor: boolean;
    canSuppressorBonus: number;
    canLongRangeScope: boolean;
    canLongRangeScopeBonus: number;
}

export interface ClothingScoreParams {
    cargo: number;
    hitpoints: number;
    armorProjectile: number;
    armorFrag: number;
    armorMelee: number;
    armorInfected: number;
    armorAvg: number;
    isolation: number;
    visibilityBonus: number;
}

export class ItemCalculator {

    private static instance: ItemCalculator;

    public static getInstance(types: TypesComponent) {
        if (!ItemCalculator.instance) {
            ItemCalculator.instance = new ItemCalculator(types);
        }
        return ItemCalculator.instance;
    }

    public slotAttachments: Record<string, string[]> = {};
    public defaultAttachments: Record<string, string[]> = {};

    public weaponScoreParams: Record<string, WeaponScoreParams> = {};
    public clothingScoreParams: Record<string, ClothingScoreParams> = {};
    public itemScore: Record<string, number> = {};
    public estimatedNominal: Record<string, number> = {};
    public colorBase: Record<string, string> = {};

    public knownItemColors: string[] = [
        'clean',
        'black',
        'camo',
        'green',
        'yellow',
        'orange',
        'brown',
        'white',
        'grey',
        'blue',
        'red',
        'pink',
        'olive',
        'khaki',
        'lightblue',
        'autumn',
        'summer',
        'wood',
        'woodland',
        'tan',
        'mossy',
        'beige',
        'violet',
    ];

    public knownItemBaseColors: string[] = [
        'clean',
        'black',
        'camo',
        'olive',
        'green',
        'white',
        'woodland',
    ];

    protected constructor(public types: TypesComponent) {}

    public getSlotAttachments(slot: string): string[] {
        slot = slot?.toLowerCase();
        if (!slot) return [];

        if (this.slotAttachments[slot]) {
            return this.slotAttachments[slot]!;
        }

        const attachments =
            [
                ...Object.values(this.types.clothingDataDump),
                ...Object.values(this.types.itemDataDump),
            ]
            .filter((x) => x.inventorySlot?.some((y) => y.toLowerCase() === slot))
            .map((x) => x.classname.toLowerCase());

        this.slotAttachments[slot] = attachments;

        return attachments;
    }

    public getDefaultAttachments(classname?: string): string[] {
        classname = classname?.toLowerCase();
        if (!classname) return [];

        if (this.defaultAttachments[classname]) {
            return this.defaultAttachments[classname]!;
        }

        let foundType: SpawnableTypesXmlEntry | null = null;
        for (const file of this.types.files) {
            if (file.type !== 'spawnabletypesxml') continue;

            for (const type of file.content.spawnabletypes.type) {
                if (type.$.name.toLowerCase() === classname) {
                    foundType = type;
                    break;
                }
            }
        }

        const attachments: string[] = [];
        if (foundType) {
            attachments.push(
                ...(foundType.attachments || [])
                    .filter((x) => x.$.chance && Number(x.$.chance) === 1)
                    .reduce((prev, cur) => {
                        if (cur.item.length) {
                            cur.item.sort((a, b) => (Number(a.$.chance) || 0) - (Number(a.$.chance) || 0));
                            prev.push(cur.item[cur.item.length - 1].$.name);
                        }
                        return prev;
                    }, [] as string[])
            )
        }
        this.defaultAttachments[classname] = attachments;

        return attachments;
    }

    public getMaxCargoSpace(classname: string): number {
        const item = this.types.getClothingEntry(classname)
            ?? this.types.getItemEntry(classname)
            ;
        let cargoSize = 0;
        if (item?.cargoSize?.length) {
            cargoSize += item.cargoSize[0] * item.cargoSize[1];
        }

        for (const slot of (item?.attachments ?? [])) {
            const attachments = this.getSlotAttachments(slot);
            if (!attachments?.length) continue;
            const mappedCargoSize = attachments.map((x) => this.getMaxCargoSpace(x));
            const maxSlotSize = mappedCargoSize.sort()[mappedCargoSize.length - 1] || 0;
            // if (
            //     !slot.toLowerCase().includes('battery')
            //     && !slot.toLowerCase().includes('grenade')
            //     && !slot.toLowerCase().includes('chemlight')
            //     && !slot.toLowerCase().includes('melee')
            //     && !slot.toLowerCase().includes('walkie')
            //     && !slot.toLowerCase().includes('cassette')
            //     && !slot.toLowerCase().includes('katana')
            //     && !slot.toLowerCase().includes('sword')
            // ) {
            //     console.log(slot, attachments, mappedCargoSize, maxSlotSize)
            // }
            cargoSize += maxSlotSize;
        }

        return cargoSize;
    }

    public calcItemScore(classname?: string): number | null | undefined {
        classname = classname?.toLowerCase();
        if (!classname) return null!;

        if (this.itemScore[classname] !== undefined) {
            if (this.itemScore[classname] < 0) {
                return undefined!;
            }
            return this.itemScore[classname];
        }

        const weapon = this.types.getWeaponEntry(classname);
        if (weapon) {
            this.itemScore[classname] = this.calcWeaponScore(classname) ?? -1;
            return this.itemScore[classname] < 0 ? undefined! : this.itemScore[classname];
        }
        const clothing = this.types.getClothingEntry(classname);
        if (clothing) {
            this.itemScore[classname] = this.calcClothingScore(classname) ?? -1;
            return this.itemScore[classname];
        }

        return null!;
    }

    public estimateItemNominal(classname?: string): number {
        classname = classname?.toLowerCase();
        if (!classname) return null!;

        if (this.estimatedNominal[classname] !== undefined) {
            return this.estimatedNominal[classname];
        }

        classname = classname?.toLowerCase();
        if (!classname) return null!;

        const score = this.calcItemScore(classname);

        let lowPass = 0.005;
        let highPass = 0.45;
        let maxNominal = 30;
        let maxScore = 100;

        const weapon = this.types.getWeaponEntry(classname);
        if (weapon) {
            lowPass = 0.005;
            highPass = 0.45;
            maxNominal = 45;
            maxScore = 250;
        }

        if (score !== null && score !== undefined) {
            const perc = 1 - Math.min(Math.ceil(score) / maxScore, 1);
            const easeing = (x: number): number => {
                if (x <= lowPass) {
                    return lowPass;
                }
                if (x >= highPass) {
                    return highPass;
                }
                //return x*x;
                return clamp(
                    lowPass,
                    highPass,
                    x < 0.5
                        ? 2 * x * x
                        : 1 - Math.pow(-2 * x + 2, 2) / 2
                );
                // if (x < 0.5) {
                //     if (x <= lowPass) {
                //         return lowPass;
                //     }
                //     return 1.75 * x * x;
                // } else {
                //     if (x >= highPass) {
                //         return highPass;
                //     }
                //     return 1 - Math.pow(-1.5 * x + 2, 3) * 0.3 + 0.02;
                // }
            }
            // console.log(classname, perc)

            return Math.ceil(
                easeing(perc) * maxNominal,
            );
        }
        return null!;
    }

    public isKindOf(item?: DZSMDumpEntry | string, parent?: string): boolean {
        if (typeof item === 'string') {
            item = this.types.getDumpEntry(item);
        }
        if (!item || !parent) {
            return false;
        }
        parent = parent.toLowerCase();
        return item.classname?.toLowerCase() === parent
            || item.parents?.some((x) => x?.toLowerCase() === parent);
    }

    public calcClothingScoreParams(classname?: string): ClothingScoreParams | undefined {
        classname = classname?.toLowerCase();
        if (!classname) return undefined;

        const clothing = this.types.getClothingEntry(classname);
        if (!clothing) return undefined;

        const cargo = this.getMaxCargoSpace(classname);

        // console.warn(
        //     classname,
        //     cargo,
        //     Math.round(((clothing.armorInfectedHP + clothing.armorProjectileHP) / 2) * clothing.hitPoints),
        //     Math.round(clothing.heatIsolation * 10),
        //     Math.round(10 - (clothing.visibilityModifier * 10)),
        //     // Math.round(clothing.armorFragHP * 100),
        //     // Math.round(clothing.armorMeleeHP * 100),
        //     // Math.round(clothing.armorInfectedHP * 100),
        //     // Math.round(clothing.armorProjectileHP * 100),
        //     // clothing.hitPoints,

        //     // clothing.visibilityModifier,
        //     // clothing.weight,
        //     // clothing.heatIsolation,
        //     // clothing.durability,
        // )

        const params = {
            cargo,
            hitpoints: clothing.hitPoints,
            armorProjectile: clothing.armorProjectileHP,
            armorFrag: clothing.armorFragHP,
            armorMelee: clothing.armorMeleeHP,
            armorInfected: clothing.armorInfectedHP,
            armorAvg: Math.round(((clothing.armorInfectedHP + clothing.armorProjectileHP) / 2) * clothing.hitPoints),
            isolation: Math.round(clothing.heatIsolation * 10),
            visibilityBonus: Math.round((100 - (clothing.visibilityModifier * 100))  / 2),
        };

        this.clothingScoreParams[classname] = params;

        return params;
    }

    public calcClothingScore(classname: string): number | undefined {
        const clothing = this.types.getClothingEntry(classname);
        if (!clothing) return undefined;

        const params = this.calcClothingScoreParams(classname);
        if (!params) return undefined;

        return Math.ceil(
            params.cargo
            + params.armorAvg
            + params.isolation
            + params.visibilityBonus
        );
    }

    public isArcheryWeapon(classname?: string): boolean {
        const weapon = this.types.getWeaponEntry(classname);
        if (!weapon) return false;

        return (
            this.isKindOf(weapon, 'Archery_Base')
            || this.isKindOf(weapon, 'ExpansionCrossbow_Base')
            || weapon.ammo.some((x) => this.types.getAmmoEntry(x)?.simulation?.toLowerCase()?.includes('arrow'))
        );
    }

    public isLauncherWeapon(classname?: string): boolean {
        const weapon = this.types.getWeaponEntry(classname);
        if (!weapon) return false;

        return (
            this.isKindOf(weapon, 'Launcher_Base')
            || weapon.ammo.some((x) => {
                const ammo = this.types.getAmmoEntry(x);
                return !!ammo?.explosive
                    || ammo?.projectile?.toLowerCase().includes('rocket')
                    || (x.toLowerCase().includes('m203') && x.toLowerCase().includes('he'))
            })
        );
    }

    public isSawedOffWeapon(classname?: string): boolean {
        const weapon = this.types.getWeaponEntry(classname);
        if (!weapon) return false;

        return classname?.toLowerCase()?.includes('sawed') ?? false;
    }

    public calcWeaponScoreParams(classname?: string): WeaponScoreParams | undefined {
        classname = classname?.toLowerCase();
        if (!classname) return undefined;

        const weapon = this.types.getWeaponEntry(classname);
        if (!weapon) return undefined;

        // Archery
        if (this.isArcheryWeapon(classname)) {
            return undefined!;
        }

        // Launchers
        if (this.isLauncherWeapon(classname)) {
            return undefined!;
        }

        if (this.weaponScoreParams[classname]) {
            return this.weaponScoreParams[classname];
        }

        const dmg = this.calcWeaponDamage(classname)!;

        const armorDmg = this.calcWeaponAmmoProp('damageArmor', classname)!;

        const effectiveRange = Math.min(
            this.calcWeaponRange(classname)!,
            this.calcWeaponBulletSpeed(classname)!,
        );
        const range = this.calcWeaponDamageDistance(classname, dmg / 2)!;

        const maxMagSize = this.calcWeaponMaxMagSize(classname)!;

        const dispersion = this.calcWeaponDispersion(classname)! / 100;

        const rpm = this.calcWeaponRpm(classname)!;

        const hitChance = (100 - dispersion) / 100;

        const combatWindowSeconds = 5;

        const combatWindowChance = (
            Math.min(
                maxMagSize,
                (rpm / 60) * combatWindowSeconds
            ) / 100
        ) * hitChance * dmg / 100;

        const dmgScore = reverselerpnoclamp(20, 150, dmg);

        const canSuppressor = weapon.attachments
            .some(
                (slot) => this.getSlotAttachments(slot)
                    .some((attachment) => this.isKindOf(attachment, 'ItemSuppressor'))
            );
        const canLongRangeScope = weapon.attachments
            .some(
                (slot) => this.getSlotAttachments(slot)
                    .some(
                        (attachment) => {
                            const optic = this.types.getItemEntry(attachment);
                            if (!optic?.opticsDiscreteDistance?.length) {
                                return false;
                            }

                            return Math.max(
                                optic.opticsDistanceZoomMax,
                                arrayMax(optic.opticsDiscreteDistance)!
                            ) >= 600;
                        }
                    )
            );

        const params = {
            dmg,
            dmgScore: Math.max(dmgScore * 100, 0),
            armorDmg,
            armorDmgBonus: dmg * armorDmg / 2.5,
            combatWindow: combatWindowSeconds,
            combatWindowChance: combatWindowChance * 100,
            dispersion,
            effectiveRange,
            effectiveRangeBonus: 100 * reverselerp(0, 800, effectiveRange),
            range,
            rangeBonus: 100 * reverselerp(0, 800, range),
            maxMagSize,
            maxMagSizeBonus: 30 * reverselerp(30, 120, maxMagSize),
            canSuppressor,
            canSuppressorBonus: canSuppressor ? 10 : 0,
            canLongRangeScope,
            canLongRangeScopeBonus: canLongRangeScope ? 10 : 0,
        };

        // console.log(classname, params);

        this.weaponScoreParams[classname] = params;

        return params;
    }

    public calcWeaponScore(classname: string): number {
        const weapon = this.types.getWeaponEntry(classname);
        if (!weapon) return undefined!;

        const params = this.calcWeaponScoreParams(classname)!;
        if (!params) return undefined!;

        const score =
            params.combatWindowChance
            + params.dmgScore
            + params.armorDmgBonus
            + params.effectiveRangeBonus
            + params.maxMagSizeBonus
            + params.canSuppressorBonus
            + params.canLongRangeScopeBonus
            ;

        return Math.ceil(score);
    }

    public calcWeaponDispersion(classname?: string) {
        const weapon = this.types.getWeaponEntry(classname);
        if (weapon) {
            const weaponDispersion = arrayMax(weapon.modes, (x) => x.dispersion) || 0;
            const defaultAttachments = this.getDefaultAttachments(classname);
            const defaultAttachmentsDispersionModifier
                = defaultAttachments
                .map((x) => this.types.getItemEntry(x)?.dispersionModifier)
                .filter((x) => !!x)
                .reduce((prev, cur) => prev! + cur!, 0)!;

            return Math.round((weaponDispersion + defaultAttachmentsDispersionModifier) * 100000) / 100;
        }
        return undefined;
    }
    public calcWeaponRpm(classname?: string) {
        const weapon = this.types.getWeaponEntry(classname);
        if (weapon) {
            return Math.round(
                arrayMax(
                    weapon.modes,
                    (x) => x.rpm,
                ) ?? 0,
            );
        }
        return undefined;
    }
    public calcWeaponMaxMagSize(classname?: string) {
        const weapon = this.types.getWeaponEntry(classname);
        if (weapon) {
            return Math.round(
                arrayMax(
                    weapon.mags,
                    (x) => (this.types.getMagEntry(x)?.capacity ?? 0),
                ) ?? 0
                + (weapon.chamberSize ?? 1) * (weapon.barrels ?? 1),
            );
        }
        return undefined;
    }

    public calcWeaponAmmoProp(
        type: 'damageBlood' | 'damageHP' | 'damageArmor' | 'initSpeed',
        classname?: string
    ) {
        const weapon = this.types.getWeaponEntry(classname);
        if (weapon) {
            return arrayMax(
                weapon.ammo,
                (x) => this.types.getAmmoEntry(x)?.[type] ?? 0,
            );
        }
        return undefined;
    }

    public calcWeaponDamage(
        classname?: string
    ) {
        const weapon = this.types.getWeaponEntry(classname);
        if (weapon) {
            const maxDmgAmmo = weapon.ammo.reduce((prev, x) => {
                const ammoX = this.types.getAmmoEntry(x);
                if (!prev) return ammoX;
                return prev.damageHP > (ammoX?.damageHP ?? 0) ? prev : ammoX!
            }, undefined as DZSMAmmoDumpEntry | undefined);

            if (!maxDmgAmmo) return undefined;

            const relativeSpeedFactor =
            weapon.initSpeedMultiplier * maxDmgAmmo.initSpeed
            / (maxDmgAmmo.typicalSpeed ?? maxDmgAmmo.initSpeed)
            ;
            // console.log(maxDmgAmmo.classname, {
            //     typicalSpeed: maxDmgAmmo.typicalSpeed,
            //     initSpeed: maxDmgAmmo.initSpeed,
            //     speedMultiplier: weapon.initSpeedMultiplier,
            //     dmg: maxDmgAmmo.damageHP,
            //     relativeSpeedFactor,
            //     friction: maxDmgAmmo.airFriction
            // });

            return maxDmgAmmo.damageHP * relativeSpeedFactor;
        }
        return undefined;
    }

    public calcWeaponDamageAtDistance(
        classname: string | undefined,
        distance: number,
    ) {
        const weapon = this.types.getWeaponEntry(classname);
        if (weapon) {
            const startDmg = this.calcWeaponDamage(classname);
            if (!startDmg) return undefined;

            const airFriction = arrayMin(
                weapon.ammo,
                (x) => this.types.getAmmoEntry(x)?.airFriction ?? Infinity,
            )!;
            return startDmg * Math.pow(Math.E, airFriction * distance);
        }
        return undefined;
    }

    public calcWeaponDamageDistance(
        classname: string | undefined,
        damage: number,
    ) {
        const weapon = this.types.getWeaponEntry(classname);
        if (weapon) {
            const startDmg = this.calcWeaponDamage(classname);
            if (!startDmg) return undefined;

            let airFriction = arrayMin(
                weapon.ammo,
                (x) => this.types.getAmmoEntry(x)?.airFriction ?? Infinity,
            )!;

            if (!airFriction || airFriction > 0) {
                airFriction = -1;
            }

            return round(Math.log(damage / startDmg) * (1 / airFriction));
        }
        return undefined;
    }

    public calcWeaponBulletSpeed(
        classname?: string
    ) {
        const weapon = this.types.getWeaponEntry(classname);
        if (weapon) {
            return Math.round(weapon.initSpeedMultiplier
                * (this.calcWeaponAmmoProp('initSpeed', classname) ?? 0));
        }
        return undefined;
    }

    public calcWeaponRange(
        classname?: string
    ) {
        const weapon = this.types.getWeaponEntry(classname);
        if (weapon) {
            const weaponMaxZero = Math.max(
                arrayMax(weapon.opticsDiscreteDistance) ?? 25,
                weapon.opticsDistanceZoomMax ?? 25,
            );

            if ((weapon.opticsDiscreteDistance?.length ?? 0) < 2) {
                const defaultAttachments = this.getDefaultAttachments(classname);
                const ranges = defaultAttachments
                    .map((x) => Math.max(
                        arrayMax(this.types.getItemEntry(x)?.opticsDiscreteDistance ?? []) ?? 25,
                        this.types.getItemEntry(x)?.opticsDistanceZoomMax ?? 25,
                    ));
                const defaultAttachmentsMaxZero = arrayMax(ranges);
                return Math.max(weaponMaxZero, defaultAttachmentsMaxZero ?? 25);
            }

            // console.log(classname, weaponMaxZero, defaultAttachments, ranges);

            return weaponMaxZero;
        }
        return undefined;
    }

    public calcWeaponRecoil(
        type: 'X' | 'Y',
        classname?: string
    ) {
        const weapon = this.types.getWeaponEntry(classname);

        // Recoil: m_MouseOffsetDistance (usually between 0 and 10, 10-x -> -> score 0...10) -> (10 - m_MouseOffsetDistance)
        // Stability: m_MouseOffsetRange (180 degrees max, 0 degree min, 10 - x divided by 18 -> score 0...10) -> (Abs(m_MouseOffsetRangeMin - 90) + Abs(m_MouseOffsetRangeMax - 90)) / 18
        if (weapon) {
            let recoil = type === 'X'
                ? weapon.recoilMouseOffsetRangeMax - weapon.recoilMouseOffsetRangeMin
                : weapon.recoilMouseOffsetDistance
            ;

            const modiferIdx = type === 'X' ? 0 : 1;

            const defaultAttachments = this.getDefaultAttachments(classname);
            const defaultAttachmentsRecoilModifier
                = defaultAttachments
                .map((x) => this.types.getItemEntry(x)?.recoilModifier)
                .filter((x) => !!x?.length)
                .reduce((prev, cur) => prev * cur![modiferIdx], 1)!;

            recoil *= defaultAttachmentsRecoilModifier;

            recoil *= weapon.recoilModifier?.[modiferIdx] ?? 1;

            return type === 'X'
                ? round(100 - Math.round(Math.max(
                    100 * Math.abs(recoil) / 180,
                    0
                )))
                : round((10 - recoil) * 10);
        }
        return undefined;
    }

    private determineColorBase(classname: string) {
        const classnameLC = classname.toLowerCase();
        const weapon = this.types.getWeaponEntry(classnameLC);
        if (weapon) {
            // if (classnameLC.includes('sawed')) {
            //     for (const x of Object.keys(this.types.weaponDataDump || {})) {
            //         if (classnameLC.includes(x)) {
            //             return x;
            //         }
            //     }
            // }

            if (weapon?.color) {
                const parentClass = weapon.parents[0];
                if (this.types.getWeaponEntry(parentClass)) {
                    return parentClass;
                }
            }
        }

        const foundColor = this.knownItemColors.find((color) => classnameLC.includes('_' + color));
        if (foundColor) {
            const classnameStripped = classnameLC.slice(0, classnameLC.indexOf(foundColor));
            const baseItem = this.types.combinedTypes[classnameStripped];
            if (baseItem) {
                return classnameStripped;
            }

            const parentClass = this.types.getDumpEntry(classnameLC)?.parents?.[0];
            if (parentClass) {
                if (this.types.getDumpEntry(parentClass)) {
                    // console.warn(this.types.getDumpEntry(parentClass))
                    return parentClass;
                }

                const foundBaseColors: string[] = [];
                for (const x of this.types.combinedClasses) {
                    if (x === classnameLC) continue;
                    const item = this.types.getDumpEntry(x);
                    if (!item) continue;
                    if (item.parents?.[0] === parentClass) {
                        if (!this.knownItemColors.some((color) => x.includes('_' + color))) {
                            return x;
                        }
                        if (this.knownItemBaseColors.some((color) => x.includes('_' + color))) {
                            foundBaseColors.push(x);
                        }
                    }
                }

                // return weighted
                if (foundBaseColors.length) {
                    for (const baseColor of this.knownItemBaseColors) {
                        if (classnameLC.includes(baseColor)) {
                            return undefined; // variant base itself
                        }
                        const found = foundBaseColors.find((x) => x.includes(baseColor));
                        if (found) {
                            return found;
                        }
                    }
                }
            }

            const baseColor = this.knownItemBaseColors.find((x) => this.types.combinedTypes[classnameStripped + '_' + x]);
            if (baseColor) {
                const baseColorClass = classnameStripped + ' ' + baseColor;
                if (baseColorClass.toLowerCase() === classnameLC) {
                    return undefined; // variant base itself
                }
                return baseColorClass;
            }
        }

        return undefined;
    }
    public calcColorBase(
        classname?: string
    ) {
        if (!classname) return undefined;
        const classnameLC = classname.toLowerCase();

        if (this.colorBase[classnameLC]) {
            if (this.colorBase[classnameLC] !== 'none') {
                return this.colorBase[classnameLC];
            }
            return undefined;
        }

        const colorBase = this.determineColorBase(classname);
        this.colorBase[classnameLC] = !!colorBase ? colorBase : 'none';
        return colorBase;
    }
}
