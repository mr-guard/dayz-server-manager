import { CoreXml, DZSMAmmoDumpEntry, DZSMClothingDumpEntry, DZSMItemDumpEntry, DZSMMagDumpEntry, DZSMWeaponDumpEntry, LimitsXml, SpawnableTypesXml, TraderItem, TypesXml } from "./types";
import * as xml from 'xml2js';

export abstract class FileWrapperBase {
    public abstract readonly location: 'mission' | 'profile';
    public abstract readonly contentType: 'xml' | 'json';
    public abstract readonly type: 'typesxml'
        | 'spawnabletypesxml'
        | 'corexml'
        | 'limitsxml'
        | 'traderjson'
        | 'hardlinejson'
        | 'weapondumpjson'
        | 'ammodumpjson'
        | 'magdumpjson'
        | 'clothingdumpjson'
        | 'itemdumpjson'
    ;
    public readonly skipSave: boolean = false;
    public abstract content: any;

    public constructor(
        public file: string,
    ) {}

    public strinigfy(): string {
        if (this.contentType === 'xml') {
            return new xml.Builder().buildObject(this.content);
        } else {
            return JSON.stringify(this.content, null, 2);
        }
    }

    public async parse(content: string): Promise<void> {
        if (this.contentType === 'xml') {
            this.content = await xml.parseStringPromise(content);
        } else {
            this.content = JSON.parse(content);
        }
    }
}

export class TypesFileWrapper extends FileWrapperBase {
    public readonly location = 'mission';
    public readonly contentType = 'xml';
    public readonly type = 'typesxml';
    public override readonly skipSave = false;
    public content!: TypesXml;

    public constructor(
        file: string,
    ) {
        super(file);
    }

    public override async parse(content: string): Promise<void> {
        await super.parse(content);

        this.content.types.type = this.content.types.type.map((type) => {
            type.nominal = type.nominal ?? ['0'];
            type.restock = type.restock ?? ['1800'];
            type.min = type.min ?? ['0'];
            type.quantmin = type.quantmin ?? ['-1'];
            type.quantmax = type.quantmax ?? ['-1'];
            type.cost = type.cost ?? ['100'];
            return type;
        });
    }
}

export class SpawnableTypesFileWrapper extends FileWrapperBase {
    public readonly location = 'mission';
    public readonly contentType = 'xml';
    public readonly type = 'spawnabletypesxml';
    public override readonly skipSave = true;
    public content!: SpawnableTypesXml;

    public constructor(
        file: string,
    ) {
        super(file);
    }

    // public override async parse(content: string): Promise<void> {
    //     await super.parse(content);

    //     console.log('spawnabletypes', this.content);
    // }
}

export class CoreFileWrapper extends FileWrapperBase {
    public readonly location = 'mission';
    public readonly contentType = 'xml';
    public readonly type = 'corexml';
    public override readonly skipSave = false;
    public content!: CoreXml;

    public constructor(
        file: string,
    ) {
        super(file);
    }
}

export class LimitsFileWrapper extends FileWrapperBase {
    public readonly location = 'mission';
    public readonly contentType = 'xml';
    public readonly type = 'limitsxml';
    public override readonly skipSave = true;
    public content!: LimitsXml;

    public constructor(
        file: string,
    ) {
        super(file);
    }
}

export class TraderFileWrapper extends FileWrapperBase {
    public readonly location = 'profile';
    public readonly contentType = 'json';
    public readonly type = 'traderjson';
    public override readonly skipSave = false;
    public content!: {
        Items: TraderItem[]
    } & Record<string, any>;

    public constructor(
        file: string,
        public shortname: string,
    ) {
        super(file);
    }
};

export class HardlineFileWrapper extends FileWrapperBase {
    public readonly location = 'mission';
    public readonly contentType = 'json';
    public readonly type = 'hardlinejson';
    public override readonly skipSave = false;
    public content!: {
        ItemRarity: Record<string, number>
    } & Record<string, any>;

    public constructor(
        file: string,
    ) {
        super(file);
    }
};

export abstract class DumpFileWrapper extends FileWrapperBase {
    public readonly location = 'profile';
    public readonly contentType = 'json';
    public override readonly skipSave = true;

    public constructor(
        file: string,
    ) {
        super(file);
    }
};

export class WeaponDumpFileWrapper extends DumpFileWrapper {
    public override readonly type = 'weapondumpjson';
    public content!: DZSMWeaponDumpEntry[];

    public constructor(file: string) { super(file); }
};
export class AmmoDumpFileWrapper extends DumpFileWrapper {
    public override readonly type = 'ammodumpjson';
    public content!: DZSMAmmoDumpEntry[];

    public constructor(file: string) { super(file); }

    public override async parse(content: string): Promise<void> {
        await super.parse(content);

        for (const ammo of this.content) {
            if (typeof ammo.damageOverride === 'string') {
                // console.log(ammo)
                if (ammo.damageOverride) {
                    ammo.damageOverride = (JSON.parse(
                        (ammo.damageOverride as string)
                            .replace(/\{/g, '[')
                            .replace(/\}/g, ']')
                    ) as [number, number][])[0][0];
                } else {
                    ammo.damageOverride = 0.9;
                }
            } else if (typeof ammo.damageOverride !== 'number') {
                ammo.damageOverride = 0.9;
            }
        }
    }
};
export class MagDumpFileWrapper extends DumpFileWrapper {
    public override readonly type = 'magdumpjson';
    public content!: DZSMMagDumpEntry[];

    public constructor(file: string) { super(file); }
};
export class ClothingDumpFileWrapper extends DumpFileWrapper {
    public override readonly type = 'clothingdumpjson';
    public content!: DZSMClothingDumpEntry[];

    public constructor(file: string) { super(file); }
};
export class ItemDumpFileWrapper extends DumpFileWrapper {
    public override readonly type = 'itemdumpjson';
    public content!: DZSMItemDumpEntry[];

    public constructor(file: string) { super(file); }
};

export type FileWrapper =
    TypesFileWrapper
    | SpawnableTypesFileWrapper
    | CoreFileWrapper
    | LimitsFileWrapper
    | TraderFileWrapper
    | HardlineFileWrapper
    | WeaponDumpFileWrapper
    | AmmoDumpFileWrapper
    | MagDumpFileWrapper
    | ClothingDumpFileWrapper
    | ItemDumpFileWrapper
;
