/* eslint-disable @typescript-eslint/naming-convention */
import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { AppCommonService } from '../../../app-common/services/app-common.service';
import { MaintenanceService } from '../../../maintenance/services/maintenance.service';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, ColumnState, RowClassParams, RowStyle } from 'ag-grid-community';

import { DZSMAmmoDumpEntry, DZSMBaseDumpEntry, DZSMClothingDumpEntry, DZSMItemDumpEntry, DZSMMagDumpEntry, DZSMWeaponDumpEntry, TypesXmlEntry } from './types';
import { AmmoDumpFileWrapper, ClothingDumpFileWrapper, CoreFileWrapper, FileWrapper, ItemDumpFileWrapper, MagDumpFileWrapper, SpawnableTypesFileWrapper, TypesFileWrapper, WeaponDumpFileWrapper } from './files';
import { AttributeOperation } from './ops';
import { ArmorFragCol, ArmorInfectedCol, ArmorMeleeCol, ArmorProjectileCol, BulletSpeedCol, CargoSizeCol, CategoryCol, ColBase, CostCol, CountInCargoCol, CountInHoarderCol, CountInMapCol, CountInPlayerCol, CraftedCol, DamageArmorCol, DamageBloodCol, DamageHPCol, DelootCol, DispersionCol, EstimatedNominalCol, HitpointsCol, IsolationCol, ItemInfoCol, LifeTimeCol, LootCategoryCol, LootTagCol, MaxCargoSizeCol, MaxMagSizeCol, MaxRangeCol, MinCol, NameCol, NominalCol, PistolSlotsCol, QuantMaxCol, QuantMinCol, RPMCol, RecoilCol, RestockCol, ScoreCol, StabilityCol, UsagesCol, ValuesCol, VisibilityCol, WeaponSlotsCol, WeightCol } from './columns';

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
        this.setCols();
    }
    public get lockedWidth(): boolean {
        return this._lockedWidth;
    }

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

    public combinedTypes: Record<string, TypesXmlEntry> = {};
    public combinedSpawnableTypes: Record<string, TypesXmlEntry> = {};

    public combinedClasses: string[] = [];
    public missingClasses: string[] = [];

    public weaponDataDump: Record<string, DZSMWeaponDumpEntry> = {};
    public magDataDump: Record<string, DZSMMagDumpEntry> = {};
    public ammoDataDump: Record<string, DZSMAmmoDumpEntry> = {};
    public clothingDataDump: Record<string, DZSMClothingDumpEntry> = {};
    public itemDataDump: Record<string, DZSMItemDumpEntry> = {};

    public shownTypesCount: number = 0;
    public totalNominal: number = 0;

    public validationErrors: string[] = [];

    public defaultColDef: ColDef = {
        editable: true,
        sortable: true,
        flex: 1,
        filter: true,
        resizable: true,
    };

    public gridInitDone = false;
    public selectedCols: ColBase[] = [];
    public typesColumnDefs: ColBase[] = [];

    public selectedOpertaionCol?: ColBase;
    public selectedOpertaion?: AttributeOperation;

    public constructor(
        public appCommon: AppCommonService,
        public maintenance: MaintenanceService,
    ) {
        this.setCols();
    }

    protected setCols(): void {
        this.typesColumnDefs = [
            new NameCol(this),
            new CategoryCol(this),
            new ValuesCol(this),
            new UsagesCol(this),
            new NominalCol(this),
            new EstimatedNominalCol(this),
            new ScoreCol(this),
            new LifeTimeCol(this),
            new RestockCol(this),
            new MinCol(this),
            new QuantMinCol(this),
            new QuantMaxCol(this),
            new CostCol(this),
            new CountInCargoCol(this),
            new CountInHoarderCol(this),
            new CountInMapCol(this),
            new CountInPlayerCol(this),
            new CraftedCol(this),
            new DelootCol(this),

            // weapon stuff
            new RPMCol(this),
            new MaxMagSizeCol(this),
            new DispersionCol(this),
            new DamageBloodCol(this),
            new DamageHPCol(this),
            new DamageArmorCol(this),
            new BulletSpeedCol(this),
            new MaxRangeCol(this),
            new RecoilCol(this),
            new StabilityCol(this),
            // new MaxRecoilUpCol(this),
            // new MaxRfecoilLeftCol(this),
            // new MaxRecoilRightCol(this),

            // clothing stuff
            new ArmorProjectileCol(this),
            new ArmorFragCol(this),
            new ArmorInfectedCol(this),
            new ArmorMeleeCol(this),

            new CargoSizeCol(this),
            new WeaponSlotsCol(this),
            new PistolSlotsCol(this),
            new MaxCargoSizeCol(this),
            new IsolationCol(this),
            new VisibilityCol(this),

            // Common
            new WeightCol(this),
            new HitpointsCol(this),
            new ItemInfoCol(this),
            new LootTagCol(this),
            new LootCategoryCol(this),
        ];
    }

    public setVisibleCols(cols: ColDef[]): void {
        if (!this.gridInitDone) return;
        const invisible = this.typesColumnDefs.filter((x) => !cols.includes(x));
        this.agGrid?.columnApi?.setColumnsVisible(cols.map((x) => x.colId!), true);
        this.agGrid?.columnApi?.setColumnsVisible(invisible.map((x) => x.colId), false);
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
        } catch (e) {
            console.error('Failed to load data dump files', e);
        }

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

        this.calcCombinedTypes();
        this.filterChanged();
    }

    protected calcCombinedTypes(): void {
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

        this.missingClasses = [
            ...Object.keys(this.weaponDataDump),
            ...Object.keys(this.magDataDump),
            ...Object.keys(this.clothingDataDump),
            ...Object.keys(this.itemDataDump),
        ].filter((x) => !this.combinedClasses.includes(x));
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

        this.agGrid.api.forEachNodeAfterFilter((x) => {
            this.selectedOpertaion!.operation(
                this.agGrid.api,
                x,
                this.selectedOpertaionCol!,
                prepedValue,
            );
        });

        // trigger change detection
        this.calcCombinedTypes()

        if (this.selectedOpertaionCol!.colId === 'Nominal') {
            this.filterChanged();
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
                result &&= this.validateType(type);
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

        const columnGroupState = this.agGrid.columnApi.getColumnGroupState();
        if (columnGroupState) {
            localStorage.setItem('DZSM_TYPES_COLGRPSTATE', JSON.stringify(columnGroupState));
        }

    }

    public filterChanged() {
        let count = 0;
        let countNominal = 0;
        // there is not getFilteredNodes :(
        this.agGrid?.api?.forEachNodeAfterFilter((x) => {
            count++;

            const type = this.getTypeEntry(x.data)
            countNominal += Number(type?.nominal[0] ?? 0);
        });
        this.shownTypesCount = count;
        this.totalNominal = countNominal;

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
            this.selectedCols = parsedColumnState
                .map((x) => this.typesColumnDefs.find((col) => col.colId === x.colId))
                .filter((x) => !!x) as ColBase[];
        } else {
            this.selectedCols = [...this.typesColumnDefs];
        }

        const columnGroupState = localStorage.getItem('DZSM_TYPES_COLGRPSTATE');
        if (columnGroupState) {
            this.agGrid.columnApi.setColumnGroupState(JSON.parse(columnGroupState));
        }

        this.filterChanged();

        this.gridInitDone = true;
    }
}
