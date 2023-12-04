/* eslint-disable @typescript-eslint/naming-convention */
import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { AppCommonService } from '../../../app-common/services/app-common.service';
import { MaintenanceService } from '../../../maintenance/services/maintenance.service';
import { AgGridAngular } from 'ag-grid-angular';
import { CellContextMenuEvent, ColDef, ColumnState, RowClassParams, RowStyle } from 'ag-grid-community';

import {
    DZSMAmmoDumpEntry,
    DZSMBaseDumpEntry,
    DZSMClothingDumpEntry,
    DZSMItemDumpEntry,
    DZSMMagDumpEntry,
    DZSMWeaponDumpEntry,
    SpawnableTypesXmlEntry,
    TraderItem,
    TypesXmlEntry,
} from './types';
import {
    AmmoDumpFileWrapper,
    ClothingDumpFileWrapper,
    CoreFileWrapper,
    FileWrapper,
    HardlineFileWrapper,
    ItemDumpFileWrapper,
    LimitsFileWrapper,
    MagDumpFileWrapper,
    SpawnableTypesFileWrapper,
    TraderFileWrapper,
    TypesFileWrapper,
    WeaponDumpFileWrapper
} from './files';
import { AttributeOperation } from './ops';
import * as columns from './columns';
import { ItemCalculator } from './calc';
import { MaxPriceCol, MaxStockCol, MinPriceCol, MinStockCol, QuantityPercentCol, RarityCol, SellPricePercentCol, TraderCategoryCol, TraderVariantOfCol } from './expansion-columns';

@Component({
    selector: 'sb-types',
    templateUrl: './types.component.html',
    styleUrls: ['types.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class TypesComponent implements OnInit {

    @ViewChild(AgGridAngular) agGrid!: AgGridAngular<string>;

    public _lockedWidth = false;
    public set lockedWidth(locked: boolean) {
        this._lockedWidth = locked;
        this.typesColumnDefs = [...this.typesColumnDefs];
    }
    public get lockedWidth(): boolean {
        return this._lockedWidth;
    }
    public expanded: boolean = false;

    public activeTab = 0;

    public loading = false;
    public submitting = false;

    public withBackup = false;
    public withRestart = false;

    public outcomeBadge?: {
        message: string;
        success: boolean;
    };

    public files: FileWrapper[] = [];
    public coreXmlIdx: number = -1;
    public hardlineFileIndex = -1;

    public combinedTypes: Record<string, TypesXmlEntry> = {};
    public combinedSpawnableTypes: Record<string, TypesXmlEntry> = {};

    public combinedClasses: string[] = [];
    public missingClasses: string[] = [];
    public missingTraderItems: string[] = [];
    public unknownTraderItems: string[] = [];
    public unknownClasses: string[] = [];
    public traderOnlyItems: string[] = [];

    public weaponDataDump: Record<string, DZSMWeaponDumpEntry> = {};
    public magDataDump: Record<string, DZSMMagDumpEntry> = {};
    public ammoDataDump: Record<string, DZSMAmmoDumpEntry> = {};
    public clothingDataDump: Record<string, DZSMClothingDumpEntry> = {};
    public itemDataDump: Record<string, DZSMItemDumpEntry> = {};

    public shownTypesCount: number = 0;
    public totalNominal: number = 0;
    public totalEstimatedNominal: number = 0;

    public validationErrors: string[] = [];

    public defaultColDef: ColDef = {
        editable: true,
        sortable: true,
        flex: 1,
        filter: true,
        resizable: true,
    };

    public gridInitDone = false;
    public selectedCols: columns.ColBase[] = [];
    public typesColumnDefs: columns.ColBase[] = [];

    public selectedOpertaionCol?: columns.ColBase;
    public selectedOpertaion?: AttributeOperation;

    public calc: ItemCalculator;
    public constructor(
        public appCommon: AppCommonService,
        public maintenance: MaintenanceService,
    ) {
        this.setCols();
        this.calc = ItemCalculator.getInstance(this);
    }

    protected setCols(): void {
        this.typesColumnDefs = [
            new columns.NameCol(this),
            new columns.CategoryCol(this),
            new columns.ValuesCol(this),
            new columns.UsagesCol(this),
            new columns.NominalCol(this),
            new columns.LifeTimeCol(this),
            new columns.RestockCol(this),
            new columns.MinCol(this),
            new columns.QuantMinCol(this),
            new columns.QuantMaxCol(this),
            new columns.CostCol(this),
            new columns.CountInCargoCol(this),
            new columns.CountInHoarderCol(this),
            new columns.CountInMapCol(this),
            new columns.CountInPlayerCol(this),
            new columns.CraftedCol(this),
            new columns.DelootCol(this),

            new columns.SourceFileCol(this),
        ];
    }

    public setVisibleCols(cols: ColDef[]): void {
        if (!this.gridInitDone) return;

        const invisible = this.typesColumnDefs.filter((x) => !cols.includes(x));
        this.agGrid?.columnApi?.setColumnsVisible(cols.map((x) => x.colId!), true);
        this.agGrid?.columnApi?.setColumnsVisible(invisible.map((x) => x.colId), false);

        this.saveGridState();
    }

    protected async saveFiles(): Promise<void> {
        for (const file of this.files) {
            if (file.skipSave) continue;
            const fileContent = file.strinigfy();
            if (file.location === 'mission') {
                await this.appCommon.updateMissionFile(
                    file.file,
                    fileContent,
                    this.withBackup,
                ).toPromise();
            } else {
                await this.appCommon.updateProfileFile(
                    (file as any).file, // TODO remove when profile files get saveable
                    fileContent,
                    this.withBackup,
                ).toPromise();
            }
        }
    }

    public async onSubmit(): Promise<void> {
        if (!confirm('Submit?')) {
            return;
        }
        if (this.loading || this.submitting) return;
        this.submitting = true;
        this.outcomeBadge = undefined;

        if (this.validate(false)) {
            try {
                if (this.withBackup) {
                    await this.maintenance.createBackup();
                }
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
        void this.resetWrapper();
    }

    public resetClicked(): void {
        if (confirm('Reset?')) {
            void this.resetWrapper();
        }
    }

    public async resetWrapper(): Promise<void> {

        if (this.loading) return;
        this.loading = true;

        await this.reset();

        this.filterChanged();
        this.loading = false;
    }

    protected async reset(): Promise<void> {

        // limits
        try {
            const limits = new LimitsFileWrapper('cfglimitsdefinition.xml');
            await limits.parse(await this.appCommon.fetchMissionFile(limits.file).toPromise());
            this.files.push(limits);

            const valuesCol = this.typesColumnDefs.find((x) => x.colId === 'Values');
            if (valuesCol) {
                const values = limits.content?.lists?.valueflags?.[0]?.value
                    ?.map((x) => x?.$?.name)
                    .filter((x) => !!x);
                if (values.length) {
                    valuesCol.extraDropdownEntries = values;
                }
            }

            const categoryCol = this.typesColumnDefs.find((x) => x.colId === 'Categories');
            if (categoryCol) {
                const categories = limits.content?.lists?.categories?.[0]?.category
                    ?.map((x) => x?.$?.name)
                    .filter((x) => !!x);
                if (categories.length) {
                    categoryCol.extraDropdownEntries = categories;
                }
            }

            const usagesCol = this.typesColumnDefs.find((x) => x.colId === 'Usages');
            if (usagesCol) {
                const usages = limits.content?.lists?.usageflags?.[0]?.usage
                    ?.map((x) => x?.$?.name)
                    .filter((x) => !!x);
                if (usages.length) {
                    usagesCol.extraDropdownEntries = usages;
                }
            }

        } catch (e) {
            console.error(`Failed to load limits files`, e);
            this.outcomeBadge = {
                success: false,
                message: `Failed to load limits files`,
            };
        }

        // server info
        try {
            const serverInfo = await this.appCommon.fetchServerInfo().toPromise();
            if (serverInfo?.worldName?.toLowerCase() === 'deerisle') {
                const valuesCol = this.typesColumnDefs.find((x) => x.colId === 'Values');
                if (valuesCol) {
                    valuesCol.valueLabels = {
                        'Tier1': 'Crotch Island / Mine',
                        'Tier2': 'Start Island',
                        'Tier3': 'Main South',
                        'Tier4': 'Paris Island',
                        'Tier5': 'Swamp',
                        'Tier6': 'Main North',
                        'Tier7': 'Mt Katahdin',
                        'Tier8': 'Main East',
                        'Tier9': 'Oil Rigs',
                        'Tier10': 'Temple',
                        'Tier11': 'Power Plant',
                        'Tier12': 'Devils Eye',
                        'Tier13': 'Area 42',
                        'Tier14': 'Arctic',
                        'Tier15': 'Archipeligo',
                        'Tier16': 'Crater',
                        'Tier17': 'Alcatraz',
                        'Tier18': 'Crypt',
                    };
                }
            }
        } catch {}

        // dump files
        try {
            const dumpFiles = [
                new WeaponDumpFileWrapper('dzsm-weapondump.json'),
                new AmmoDumpFileWrapper('dzsm-ammodump.json'),
                new MagDumpFileWrapper('dzsm-magdump.json'),
                new ClothingDumpFileWrapper('dzsm-clothingdump.json'),
                new ItemDumpFileWrapper('dzsm-itemdump.json'),
            ];
            const dumpFilesContents = await this.appCommon.fetchProfileFiles(dumpFiles.map((x) => x.file)).toPromise();
            for (let i = 0; i < dumpFilesContents.length; i++) {
                const file = dumpFiles[i];
                await file.parse(dumpFilesContents[i]);

                if (file.content) {
                    switch (file.type) {
                        case 'itemdumpjson': {
                            this.itemDataDump = {};
                            file.content.forEach((x) => this.itemDataDump[x.classname.toLowerCase()] = x);
                            break;
                        }
                        case 'weapondumpjson': {
                            this.weaponDataDump = {};
                            file.content.forEach((x) => this.weaponDataDump[x.classname.toLowerCase()] = x);
                            break;
                        }
                        case 'ammodumpjson': {
                            this.ammoDataDump = {};
                            file.content.forEach((x) => this.ammoDataDump[x.classname.toLowerCase()] = x);
                            break;
                        }
                        case 'magdumpjson': {
                            this.magDataDump = {};
                            file.content.forEach((x) => this.magDataDump[x.classname.toLowerCase()] = x);
                            break;
                        }
                        case 'clothingdumpjson': {
                            this.clothingDataDump = {};
                            file.content.forEach((x) => this.clothingDataDump[x.classname.toLowerCase()] = x);
                            break;
                        }
                    }
                    this.files.push(file);
                }
            }

            this.typesColumnDefs = [
                ...this.typesColumnDefs,
                // weapon stuff
                new columns.AmmoCol(this),
                new columns.MagsCol(this),
                new columns.RPMCol(this),
                new columns.MaxMagSizeCol(this),
                new columns.DispersionCol(this),
                new columns.WeaponDamageCol(this),
                new columns.WeaponOneHitDistanceCol(this),
                new columns.DamageBloodCol(this),
                new columns.DamageHPCol(this),
                new columns.DamageArmorCol(this),
                new columns.DamageMeleeCol(this),
                new columns.DamageMeleeHeavyCol(this),
                new columns.BulletSpeedCol(this),
                new columns.MaxZeroCol(this),
                new columns.RecoilCol(this),
                new columns.StabilityCol(this),
                // new MaxRecoilUpCol(this),
                // new MaxRfecoilLeftCol(this),
                // new MaxRecoilRightCol(this),

                // clothing stuff
                new columns.ArmorProjectileCol(this),
                new columns.ArmorFragCol(this),
                new columns.ArmorInfectedCol(this),
                new columns.ArmorMeleeCol(this),

                new columns.CargoSizeCol(this),
                new columns.WeaponSlotsCol(this),
                new columns.PistolSlotsCol(this),
                new columns.MaxCargoSizeCol(this),
                new columns.IsolationCol(this),
                new columns.VisibilityCol(this),

                // Common
                new columns.EstimatedNominalCol(this),
                new columns.ScoreCol(this),
                new columns.WeightCol(this),
                new columns.HitpointsCol(this),
                new columns.ItemInfoCol(this),
                new columns.LootTagCol(this),
                new columns.LootCategoryCol(this),
                new columns.GuessedVariantOfCol(this),
            ];

        } catch (e) {
            console.error('Failed to load data dump files', e);
        }

        // economy core + types
        try {
            const core = new CoreFileWrapper('cfgEconomyCore.xml');
            await core.parse(await this.appCommon.fetchMissionFile(core.file).toPromise());
            this.files.push(core);

            const typesFiles: string[] = ['db/types.xml'];
            const spawnableTypesFiles: string[] = ['cfgspawnabletypes.xml'];
            for (const ceEntry of (core.content.economycore.ce || [])) {
                const folder = ceEntry.$.folder;
                for (const file of ceEntry.file) {
                    const fileName = file.$.name;
                    const fileType = file.$.type;

                    if (fileType === 'types') {
                        typesFiles.push(`${folder}${folder.endsWith('/') ? '' : '/'}${fileName}`);
                    }
                    if (fileType === 'spawnabletypes') {
                        spawnableTypesFiles.push(`${folder}${folder.endsWith('/') ? '' : '/'}${fileName}`);
                    }
                }
            }

            const typesFilesContents = await this.appCommon.fetchMissionFiles(typesFiles).toPromise();
            for (let i = 0; i < typesFiles.length; i++) {
                const file = new TypesFileWrapper(typesFiles[i]);
                await file.parse(typesFilesContents[i]);
                this.files.push(file);
            }

            const spawnableTypesFilesContents = await this.appCommon.fetchMissionFiles(spawnableTypesFiles).toPromise();
            for (let i = 0; i < spawnableTypesFiles.length; i++) {
                const file = new SpawnableTypesFileWrapper(spawnableTypesFiles[i]);
                await file.parse(spawnableTypesFilesContents[i]);
                this.files.push(file);
            }

        } catch (e) {
            console.error(`Failed to load types files`, e);
            this.outcomeBadge = {
                success: false,
                message: `Failed to load types files`,
            };
        }

        // trader files
        try {
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
            ];
        } catch (e) {
            console.error('Failed to load expansion files', e);
        }

        // hardline
        try {
            const hardlineFile = new HardlineFileWrapper('expansion/settings/HardlineSettings.json');
            const hardlineContent = await this.appCommon.fetchMissionFile(hardlineFile.file).toPromise().catch();
            await hardlineFile.parse(hardlineContent);
            this.hardlineFileIndex = this.files.push(hardlineFile) - 1;

            this.typesColumnDefs = [
                ...this.typesColumnDefs,
                new RarityCol(this),
            ];
        } catch (e) {
            console.error('Failed to load expansion hardline settings', e);
        }

        this.calcCombinedTypes();
        this.filterChanged();
    }

    public calcCombinedTypes(): void {
        this.combinedTypes = {};
        this.files
            ?.map((x) => {
                if (x.type === 'typesxml') {
                    return x.content.types.type;
                }
                return [];
            })
            ?.flat()
            ?.forEach((x) => {
                this.combinedTypes[x.$.name.toLowerCase()] = x;
            });
        this.combinedClasses = Object.keys(this.combinedTypes);

        const knownClasses = new Set([
            ...Object.keys(this.weaponDataDump),
            ...Object.keys(this.magDataDump),
            ...Object.keys(this.clothingDataDump),
            ...Object.keys(this.itemDataDump),
        ]);
        this.unknownClasses = this.combinedClasses.filter((x) => !knownClasses.has(x));
        this.missingClasses = [...knownClasses.keys()]
        .filter((x) => !this.combinedClasses.includes(x))
        .map((x) => this.getDumpEntry(x)?.classname)
        .filter((x) => !!x) as string[]
        ;

        this.missingTraderItems = [];
        const traderFiles = this.files.filter((x) => x.type === 'traderjson') as TraderFileWrapper[];
        for (const type of this.combinedClasses) {
            if (!traderFiles.some(
                (traderFile) => traderFile.content.Items.some(
                    (traderItem) =>
                        traderItem.ClassName?.toLowerCase() === type.toLowerCase()
                        || traderItem.Variants?.some((variant) => variant?.toLowerCase() === type.toLowerCase())
                )
            )) {
                const entry = this.getDumpEntry(type)?.classname;
                if (entry && !type.startsWith('zmbm_') && !type.startsWith('zmbf_')) {
                    this.missingTraderItems.push(entry);
                }
            }
        }

        this.unknownTraderItems = [];
        for (const file of traderFiles) {
            for (const item of file.content.Items) {
                if (!this.combinedClasses.includes(item.ClassName.toLowerCase())) {
                    this.unknownTraderItems.push(item.ClassName);
                }
            }
        }

        this.traderOnlyItems = [];
        for (const file of traderFiles) {
            for (const item of file.content.Items) {
                if (!Number(this.getTypeEntry(item.ClassName)?.nominal?.[0])) {
                    this.traderOnlyItems.push(item.ClassName);
                }
            }
        }
    }

    public getTypeEntry(classname?: string): TypesXmlEntry | undefined {
        return this.combinedTypes[(classname ?? '').toLowerCase()];
    }

    public getWeaponEntry(classname?: string): DZSMWeaponDumpEntry | undefined {
        return this.weaponDataDump[(classname ?? '').toLowerCase()];
    }
    public getAmmoEntry(classname?: string): DZSMAmmoDumpEntry | undefined {
        return this.ammoDataDump[(classname ?? '').toLowerCase()];
    }
    public getMagEntry(classname?: string): DZSMMagDumpEntry | undefined {
        return this.magDataDump[(classname ?? '').toLowerCase()];
    }
    public getClothingEntry(classname?: string): DZSMClothingDumpEntry | undefined {
        return this.clothingDataDump[(classname ?? '').toLowerCase()];
    }
    public getItemEntry(classname?: string): DZSMItemDumpEntry | undefined {
        return this.itemDataDump[(classname ?? '').toLowerCase()];
    }
    public getDumpEntry(classname?: string): DZSMBaseDumpEntry | undefined {
        classname = (classname ?? '').toLowerCase();
        return this.weaponDataDump[classname]
            || this.clothingDataDump[classname]
            || this.itemDataDump[classname];
    }

    public changeAttr(value: string | number): void {

        if (value === undefined || value === null || (typeof value === 'string' && !value)) return;
        const prepedValue = this.selectedOpertaion!.valueModifier
            ? this.selectedOpertaion!.valueModifier(value, this.selectedOpertaionCol!)
            : value;
        if (prepedValue === null || prepedValue === undefined) return;

        const selectedNodes = this.agGrid.api.getSelectedNodes();
        let lastItem: string | undefined = undefined;
        if (selectedNodes?.length) {
            selectedNodes.forEach((x) => {
                this.selectedOpertaion!.operation(
                    this.agGrid.api,
                    x,
                    this.selectedOpertaionCol!,
                    prepedValue,
                );
            });
            lastItem = selectedNodes[selectedNodes.length - 1].data!.toLowerCase();
        } else {
            this.agGrid.api.forEachNodeAfterFilter((x) => {
                this.selectedOpertaion!.operation(
                    this.agGrid.api,
                    x,
                    this.selectedOpertaionCol!,
                    prepedValue,
                );
                lastItem = x.data!.toLowerCase();
            });
        }


        // trigger change detection
        this.calcCombinedTypes()

        if (this.selectedOpertaionCol!.colId === 'Nominal') {
            this.filterChanged();
        }

        if (lastItem) {
            setTimeout(() => {
                let node;
                this.agGrid.api.forEachNode((x) => {
                    if (x.data?.toLowerCase() === lastItem) {
                        node = x;
                    }
                });
                if (node) {
                    this.agGrid.api.ensureNodeVisible(node);
                }
            }, 1000)
        }
    }

    private validateType(type: TypesXmlEntry): boolean {
        let result = true;
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
        return result;
    }
    public validate(showSuccess: boolean): boolean {
        let result = true;
        this.validationErrors = [];

        for (const file of this.files) {
            if (!file.content || file.type !== 'typesxml') continue;
            for (const type of file.content.types.type) {
                if (!this.validateType(type)) {
                    result = false;
                }
            }
        }

        if (result && showSuccess) {
            this.outcomeBadge = {
                success: true,
                message: 'No errors found',
            };
        }

        console.log(this.validationErrors)

        return result;
    }

    public csvExport(): void {
        this.agGrid?.api.exportDataAsCsv({
            allColumns: false,
        });
    }

    public downloadFiles(): void {
        this.files.filter((x) => !x.skipSave).forEach((x) => this.downloadFile(x));
    }

    private downloadFile(file: FileWrapper): void {

        let filename = file.file;
        if (filename.includes('/')) {
            filename = filename.split('/').pop()!;
        }
        const fileContent = file.strinigfy();
        const blob = new Blob([fileContent], { type: file.contentType === 'xml' ? 'text/xml' : 'application/json' });

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

    public minWidth(width: number): number {
        return this.lockedWidth ? width : width * 2;
    }

    public getRowStyle = (params: RowClassParams<string, any>): RowStyle | undefined => {
        const type = this.getTypeEntry(params.data)
        if (type?.nominal?.[0] === '0' || type?.nominal?.[0] as any === 0) {
            return { background: 'lightgrey' };
        }
        return undefined;
    };

    public saveGridState(): void {

        if (!this.agGrid?.api || !this.gridInitDone) return;

        const filterModel = this.agGrid.api.getFilterModel();
        if (filterModel) {
            localStorage.setItem('DZSM_TYPES_FILTER', JSON.stringify(filterModel));
        }

        const columnState = this.agGrid.columnApi.getColumnState();
        if (columnState) {
            localStorage.setItem('DZSM_TYPES_COLSTATE', JSON.stringify(columnState));
        }

        const visisbleColumnState = this.selectedCols;
        if (visisbleColumnState) {
            localStorage.setItem('DZSM_TYPES_VISCOLSTATE', JSON.stringify(visisbleColumnState.map((x) => x.colId)));
        }

        const columnGroupState = this.agGrid.columnApi.getColumnGroupState();
        if (columnGroupState) {
            localStorage.setItem('DZSM_TYPES_COLGRPSTATE', JSON.stringify(columnGroupState));
        }

    }

    public filterChanged() {
        let count = 0;
        let countNominal = 0;
        let countEstimatedNominal = 0;
        // there is not getFilteredNodes :(
        this.agGrid?.api?.forEachNodeAfterFilter((x) => {
            count++;

            const type = this.getTypeEntry(x.data)
            countNominal += Number(type?.nominal[0] ?? 0);
            const estimated = Number(this.calc.estimateItemNominal(x.data) ?? type?.nominal[0] ?? 0);
            countEstimatedNominal += isFinite(estimated) ? estimated : 0;
        });
        this.shownTypesCount = count;
        this.totalNominal = countNominal;
        this.totalEstimatedNominal = countEstimatedNominal;
        // console.log('totalEstimatedNominal', this.totalEstimatedNominal)

        this.saveGridState();
    }

    public firstDataRendered() {

        const filterModel = localStorage.getItem('DZSM_TYPES_FILTER');
        if (filterModel) {
            this.agGrid.api.setFilterModel(JSON.parse(filterModel));
        }

        const columnState = localStorage.getItem('DZSM_TYPES_COLSTATE');
        if (columnState) {
            const parsedColumnState = JSON.parse(columnState) as ColumnState[];
            this.agGrid.columnApi.applyColumnState({
                state: parsedColumnState,
                applyOrder: true
            });

            const visColumnState = localStorage.getItem('DZSM_TYPES_VISCOLSTATE');
            if (visColumnState) {
                try {
                    this.selectedCols = JSON.parse(visColumnState)
                    .map((x) => this.typesColumnDefs.find((y) => y.colId === x))
                    .filter((x) => !!x) as columns.ColBase[];

                    const invisible = this.typesColumnDefs.filter((x) => !this.selectedCols.includes(x));
                    this.agGrid?.columnApi?.setColumnsVisible(this.selectedCols.map((x) => x.colId!), true);
                    this.agGrid?.columnApi?.setColumnsVisible(invisible.map((x) => x.colId), false);
                } catch {}
            }
        }

        if (!this.selectedCols?.length) {
            this.selectedCols = [...this.typesColumnDefs];
        }

        const columnGroupState = localStorage.getItem('DZSM_TYPES_COLGRPSTATE');
        if (columnGroupState) {
            this.agGrid.columnApi.setColumnGroupState(JSON.parse(columnGroupState));
        }

        this.filterChanged();

        this.gridInitDone = true;
    }

    public duplicate() {
        const classesToDupe = this.agGrid.api.getSelectedRows();
        for (const classname of classesToDupe) {

            for (const file of this.files) {
                if (file.type === 'typesxml') {
                    if (file.content.types.type.some((x) => x.$.name?.toLowerCase() === (classname.toLowerCase() + ' copy'))) continue;

                    const idx = file.content.types.type.findIndex((x) => x.$.name?.toLowerCase() === classname.toLowerCase());
                    if (idx !== -1) {
                        const copy = JSON.parse(JSON.stringify(file.content.types.type[idx])) as TypesXmlEntry;
                        copy.$.name = copy.$.name + ' copy'
                        file.content.types.type.splice(idx, 0, copy);
                    }
                }
                if (file.type === 'spawnabletypesxml') {
                    if (file.content.spawnabletypes.type.some((x) => x.$.name?.toLowerCase() === (classname.toLowerCase() + ' copy'))) continue;

                    const idx = file.content.spawnabletypes.type.findIndex((x) => x.$.name?.toLowerCase() === classname.toLowerCase());
                    if (idx !== -1) {
                        const copy = JSON.parse(JSON.stringify(file.content.spawnabletypes.type[idx])) as SpawnableTypesXmlEntry;
                        copy.$.name = copy.$.name + ' copy'
                        file.content.spawnabletypes.type.splice(idx, 0, copy);
                    }
                }
                if (file.type === 'hardlinejson') {
                    if (
                        file.content.ItemRarity[classname.toLowerCase() + ' copy'] !== undefined
                        || file.content.ItemRarity[classname.toLowerCase()] === undefined
                    ) continue;

                    file.content.ItemRarity[classname.toLowerCase() + ' copy'] = file.content.ItemRarity[classname.toLowerCase()];
                }
                if (file.type === 'traderjson') {
                    if (file.content.Items.some((x) => x.ClassName?.toLowerCase() === (classname.toLowerCase() + ' copy'))) continue;

                    const idx = file.content.Items.findIndex((x) => x.ClassName?.toLowerCase() === classname.toLowerCase());
                    if (idx !== -1) {
                        const copy = JSON.parse(JSON.stringify(file.content.Items[idx]));
                        copy.ClassName = copy.ClassName + ' copy';
                        file.content.Items.splice(idx, 0, copy);
                    }
                }
            }
        }

        this.calcCombinedTypes();
        this.filterChanged();
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

}
