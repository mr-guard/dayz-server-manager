/* eslint-disable @typescript-eslint/naming-convention */
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { AppCommonService } from '@common/services';

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
    selector: 'sb-types',
    changeDetection: ChangeDetectionStrategy.Default,
    templateUrl: './types.component.html',
    styleUrls: ['types.component.scss'],
})
export class TypesComponent implements OnInit {

    public loading = false;

    public test: string = '';

    public outcomeBadge?: {
        message: string;
        success: boolean;
    };

    private coreXml: any;
    public files: { file: string; content: TypesXml }[] = [];

    public constructor(
        public appCommon: AppCommonService,
    ) {}

    public onSubmit(): void {

        if (this.loading) return;
        this.loading = true;
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


}
