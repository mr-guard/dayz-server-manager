import { DZSMDumpEntry, SpawnableTypesXmlEntry, arrayMax, round } from './types';
import { TypesComponent } from './types.component';

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

    public itemScore: Record<string, number> = {};
    public estimatedNominal: Record<string, number> = {};

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
                ...foundType.attachments
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

    public calcItemScore(classname?: string): number {
        classname = classname?.toLowerCase();
        if (!classname) return null!;

        if (this.itemScore[classname] !== undefined) {
            return this.itemScore[classname];
        }

        const weapon = this.types.getWeaponEntry(classname);
        if (weapon) {
            this.itemScore[classname] = this.calcWeaponScore(classname);
            return this.itemScore[classname];
        }
        const clothing = this.types.getClothingEntry(classname);
        if (clothing) {
            this.itemScore[classname] = this.calcClothingScore(classname);
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

        const lowPass = 0.005;
        const highPass = 0.95;
        const score = this.calcItemScore(classname);
        if (score !== null) {
            const perc = 1 - Math.min(Math.ceil(score) / 300, 1);
            const easeing = (x: number): number => {
                // return x < 0.5 ? 1.5 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
                if (x < 0.5) {
                    if (x <= lowPass) {
                        return lowPass;
                    }
                    return 1.75 * x * x;
                } else {
                    if (x >= highPass) {
                        return highPass;
                    }
                    return 1 - Math.pow(-1.5 * x + 2, 3) * 0.3 + 0.02;
                }
            }
            // console.log(classname, perc)

            return Math.ceil(
                easeing(perc) * 30,
            );
        }
        return null!;
    }

    public isKindOf(item: DZSMDumpEntry, parent: string): boolean {
        parent = parent.toLowerCase();
        return item.classname?.toLowerCase() === parent
            || item.parents?.some((x) => x?.toLowerCase() === parent);
    }

    public calcClothingScore(classname: string): number {
        classname = classname?.toLowerCase();
        const clothing = this.types.getClothingEntry(classname);
        if (!clothing) return 0;

        Math.round(clothing.armorFragHP * 100);
        Math.round(clothing.armorInfectedHP * 100);
        Math.round(clothing.armorMeleeHP * 100);
        Math.round(clothing.armorProjectileHP * 100);
        clothing.hitPoints

        clothing.visibilityModifier
        clothing.weight
        clothing.heatIsolation
        clothing.durability
        this.getMaxCargoSpace(classname);

        return 0;
    }

    public calcWeaponScore(classname: string): number {
        const weapon = this.types.getWeaponEntry(classname);
        if (!weapon) return 0;

        // Archery
        if (
            this.isKindOf(weapon, 'Archery_Base')
            || this.isKindOf(weapon, 'ExpansionCrossbow_Base')
            || weapon.ammo.some((x) => this.types.getAmmoEntry(x)?.simulation?.toLowerCase()?.includes('arrow'))
        ) {
            return null!;
        }

        // Launchers
        if (
            this.isKindOf(weapon, 'Launcher_Base')
            || weapon.ammo.some((x) => this.types.getAmmoEntry(x)?.explosive)
        ) {
            return null!;
        }


        const dmg = weapon.ammo.reduce((x, cur) => Math.max(
            x,
            this.types.getAmmoEntry(cur)?.damageHP ?? 0
        ), 0);

        const armorDmg = weapon.ammo.reduce((x, cur) => Math.max(
            x,
            this.types.getAmmoEntry(cur)?.damageArmor ?? 0
        ), 0);

        const bulletSpeed = Math.round(weapon.initSpeedMultiplier * weapon.ammo.reduce((x, cur) => Math.max(
            x,
            this.types.getAmmoEntry(cur)?.initSpeed ?? 0
        ), 0));

        const maxMagSize = Math.round(weapon.mags.reduce((x, cur) => Math.max(
                x,
                this.types.getMagEntry(cur)?.capacity ?? 0
            ), 0))
            + 1;

        const dispersion = Math.round((weapon.modes?.map((x) => x.dispersion).sort()[0] || 0) * 10000);

        const rpm = Math.round(weapon.modes?.reduce((x, cur) => Math.max(x, cur.rpm), 0));

        const hitChance = (1000 - dispersion) / 1000;

        const comabtWindowSeconds = 5;

        const combatWindowChance = (
            Math.min(
                maxMagSize,
                (rpm / 60) * comabtWindowSeconds
            ) / 100
        ) * hitChance * 100;

        const dmgScore = (dmg / 150) * 100;

        const score = combatWindowChance
            + (bulletSpeed / 8)
            + (dmgScore + dmg * armorDmg / 2.5);

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

            return (1000 - Math.round((weaponDispersion + defaultAttachmentsDispersionModifier) * 10000)) / 10;
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
                + weapon.barrels ?? 1,
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

    public calcWeaponBulletSpeed(
        classname?: string
    ) {
        const weapon = this.types.getWeaponEntry(classname);
        if (weapon) {
            return weapon.initSpeedMultiplier
                * (this.calcWeaponAmmoProp('initSpeed', classname) ?? 0);
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
            const defaultAttachments = this.getDefaultAttachments(classname);
            const defaultAttachmentsMaxZero = arrayMax(
                defaultAttachments
                    .map((x) => Math.max(
                        arrayMax(this.types.getItemEntry(x)?.opticsDiscreteDistance ?? []) ?? 25,
                        this.types.getItemEntry(x)?.opticsDistanceZoomMax ?? 25,
                    )),
            )

            return Math.max(weaponMaxZero, defaultAttachmentsMaxZero ?? 25);
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
}
