import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AppCommonService } from '../../../app-common/services/app-common.service';
import L, {
    divIcon,
    LeafletKeyboardEvent,
    Map as LeafletMap,
    LeafletMouseEvent,
    marker,
    tooltip,
} from 'leaflet';
import 'leaflet.markercluster';
import { LayerContainer, LayerIds, MapComponent } from './map.component';
import { EventSpawnsFileWrapper, FileWrapper, MapGroupPosFileWrapper } from 'src/modules/files/containers/types/files';
import { EventSpawn, EventSpawnPos, EventSpawnsXml, MapGroupPosXml } from 'src/modules/files/containers/types/types';

@Component({
    selector: 'sb-map-loot',
    templateUrl: './map-loot.component.html',
    styleUrls: ['map.component.scss'],
})
export class MapLootComponent extends MapComponent implements OnInit, OnDestroy {

    public files: FileWrapper[] = [];

    public submitting = false;

    public withBackup = false;
    public withRestart = false;

    public outcomeBadge?: {
        message: string;
        success: boolean;
    };

    protected selectedEvent?: EventSpawn;

    public constructor(
        http: HttpClient,
        appCommon: AppCommonService,
    ) {
        super(http, appCommon);
        this.layers = new Map<LayerIds, LayerContainer>([
            ['locationLayer', new LayerContainer('Locations')],
            ['lootLayer', new LayerContainer('Loot', L.markerClusterGroup({ spiderfyOnMaxZoom: true }))],
            ['eventsLayer', new LayerContainer('Events', L.markerClusterGroup({ spiderfyOnMaxZoom: true }))],
        ])
    }

    public override ngOnInit(): void {
        super.ngOnInit();
    }

    public resetClicked(): void {
        if (confirm('Reset?')) {
            void this.loadData();
        }
    }

    protected override async loadData(): Promise<void> {

        this.submitting = true;

        this.files = [];
        this.layers.get('eventsLayer')!.layer.clearLayers();
        this.layers.get('eventsLayer')!.markers = [];
        this.layers.get('lootLayer')!.layer.clearLayers();
        this.layers.get('lootLayer')!.markers = [];

        // eventspawns
        try {
            const eventSpawns = new EventSpawnsFileWrapper('cfgeventspawns.xml');
            await eventSpawns.parse(await this.appCommon.fetchMissionFile(eventSpawns.file).toPromise());
            this.files.push(eventSpawns);

            this.updateEvents(eventSpawns.content);
        } catch (e) {
            console.error(`Failed to load event spawns`, e);
            this.outcomeBadge = {
                success: false,
                message: `Failed to load event spawns`,
            };
        }

        // mapo grp pos
        try {
            const mapGrpPos = new MapGroupPosFileWrapper('mapgrouppos.xml');
            await mapGrpPos.parse(await this.appCommon.fetchMissionFile(mapGrpPos.file).toPromise());
            this.files.push(mapGrpPos);

            this.updateMapGrpPos(mapGrpPos.content);
        } catch (e) {
            console.error(`Failed to load map grp pos`, e);
            this.outcomeBadge = {
                success: false,
                message: `Failed to load mapgrouppos.xml`,
            };
        }

        this.submitting = false;

    }

    protected createEventMarker(event: EventSpawn, eventPos: EventSpawnPos) {
        const layer = this.layers.get('eventsLayer')!;

        const pos = [Number(eventPos.$.x), Number(eventPos.$.y || '0'), Number(eventPos.$.z)];
        const t = tooltip(
            {
                permanent: true,
                direction: 'bottom',
            },
        ).setContent(event.$.name);

        const m = marker(
            this.unproject([pos[0], this.info!.worldSize - pos[2]]),
            {
                draggable: true,
                interactive: true,
                icon: divIcon({
                    html: `<i class="fa fa-warn fa-lg"></i>`,
                    iconSize: [50, 50],
                    className: 'locationIcon',
                }),
            },
        )
            .bindTooltip(t)
            .addEventListener('dragend', (e) => {
                const newPos = this.project(m.getLatLng());

                eventPos.$.x = String(newPos.x);
                eventPos.$.z = String(Math.abs(newPos.y - this.info!.worldSize));

            })
            .addEventListener('keyup', (e: LeafletKeyboardEvent) => {
                if (e.originalEvent.key === 'Delete') {
                    event.pos!.splice(event.pos!.indexOf(eventPos), 1);
                    layer.layer.removeLayer(m);
                }
            })
            .addEventListener('dblclick', () => {
                console.warn('Selected event', event)
                this.selectedEvent = event;
            })
        ;

        layer.markers.push({
            marker: m,
            toolTip: t,
            id: String(event.$.name),
            data: eventPos,
        });

        layer.layer.addLayer(m);
    }

    protected updateEvents(eventSpawns: EventSpawnsXml): void {
        for (const event of eventSpawns.eventposdef.event) {

            if (!event.pos) continue;

            for (const eventSpawn of event.pos) {
                this.createEventMarker(event, eventSpawn);
            }

        }
    }

    protected updateMapGrpPos(mapGrpPos: MapGroupPosXml): void {
        const layer = this.layers.get('lootLayer')!;

        for (const group of mapGrpPos.map.group) {

            if (!group.$.pos) continue;


            let pos = group.$.pos.split(' ').map((x) => Number(x));
            const t = tooltip(
                {
                    permanent: true,
                    direction: 'bottom',
                },
            ).setContent(group.$.name);

            const m = marker(
                this.unproject([pos[0], this.info!.worldSize - pos[2]]),
                {
                    interactive: true,
                    icon: divIcon({
                        html: `<i class="fa fa-warn fa-lg"></i>`,
                        iconSize: [50, 50],
                        className: 'locationIcon',
                    }),
                },
            )
                .bindTooltip(t)
                .addEventListener('keyup', (e: LeafletKeyboardEvent) => {
                    if (e.originalEvent.key === 'Delete') {
                        mapGrpPos.map.group.splice(mapGrpPos.map.group.indexOf(group), 1);
                        layer.layer.removeLayer(m);
                    }
                })
            ;

            layer.markers.push({
                marker: m,
                toolTip: t,
                id: String(group.$.name),
                data: group,
            });

            layer.layer.addLayer(m);

        }
    }

    public override onMapDoubleClick(event: LeafletMouseEvent) {
        console.warn(event, this.selectedEvent)
        if (this.selectedEvent?.pos) {
            const pt = this.project(event.latlng);
            const pos: EventSpawnPos = {
                $: {
                    x: String(pt.x),
                    z: String(Math.abs(pt.y - this.info!.worldSize)),
                    a: "0"
                }
            }

            this.selectedEvent.pos.push(pos);
            this.createEventMarker(this.selectedEvent, pos);
            console.warn(pos, this.layers.get('eventsLayer')!.markers)
        }
    }

    public override search(value?: string) {
        value = value?.toLowerCase();

        const eventsLayer = this.layers.get('eventsLayer')!;
        for (const m of eventsLayer.markers) {
            const hasMarker = eventsLayer.layer.hasLayer(m.marker);
            const shouldHave = !value
                || !!(m.id?.toLowerCase().includes(value));

            if (hasMarker && !shouldHave) {
                eventsLayer.layer.removeLayer(m.marker);
            }

            if (!hasMarker && shouldHave) {
                eventsLayer.layer.addLayer(m.marker);
            }
        }
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
        if (this.submitting) return;
        this.submitting = true;
        this.outcomeBadge = undefined;

        try {
            // if (this.withBackup) {
            //     await this.maintenance.createBackup();
            // }
            await this.saveFiles();
            // if (this.withRestart) {
            //     await this.maintenance.restartServer();
            // }
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

        this.submitting = false;
    }

}
