import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ServerInfo, IngameReportEntry } from '../../../app-common/models';
import { AppCommonService } from '../../../app-common/services/app-common.service';
import {
    Control,
    control,
    CRS,
    divIcon,
    LatLng,
    layerGroup,
    LayerGroup,
    LeafletMouseEvent,
    Map as LeafletMap,
    MapOptions,
    Marker,
    marker,
    Point,
    PointExpression,
    tileLayer,
    tooltip,
    Tooltip,
    imageOverlay,
} from 'leaflet';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface Location {
    name: string;
    cfgName: string;
    position: [number, number];
    type: string;
}

export interface MapInfo {
    tilePattern: string;
    fullImage?: string;
    worldSize: number;

    fullImageMinZoom?: number;
    fullImageMaxZoom?: number;
    maxZoom: number;
    minZoom: number;
    defaultZoom: number;
    attribution: string;
    tileSize: number;
    scale: number;
    center: [number, number];

    preview: string;
    fullSize: string;
    locations: Location[];
    title: string;
    worldName: string;
}

export interface MarkerWithId {
    marker: Marker;
    toolTip?: Tooltip;
    id: string;
    data: any;
}

/* eslint-disable @typescript-eslint/naming-convention */
// eslint-disable-next-line no-shadow
export enum LayerIdsEnum {
    locationLayer = 'locationLayer',
    playerLayer = 'playerLayer',
    vehicleLayer = 'vehicleLayer',
    boatLayer = 'boatLayer',
    airLayer = 'airLayer',
    lootLayer = 'lootLayer',
    eventsLayer = 'eventsLayer',
}
export type LayerIds = keyof typeof LayerIdsEnum;
/* eslint-enable @typescript-eslint/naming-convention */

export class LayerContainer {

    public constructor(
        public label: string,
        public layer: LayerGroup = layerGroup(),
        public markers: MarkerWithId[] = [],
    ) {}

}

@Component({
    selector: 'sb-map',
    templateUrl: './map.component.html',
    styleUrls: ['map.component.scss'],
})
export class MapComponent implements OnInit, OnDestroy {

    protected onDestroy = new Subject();

    public info?: MapInfo;
    public options?: MapOptions;

    public baseLayers?: Control.LayersObject;

    public map?: LeafletMap;
    public curZoom?: number;
    public mapScale?: number;
    public curCoordinatesX: number = 0;
    public curCoordinatesY: number = 0;

    protected mapHost: string | any = 'https://mr-guard.de/dayz-maps';
    protected mapName?: string;

    protected layerControl?: Control;
    protected layers = new Map<LayerIds, LayerContainer>([
        ['locationLayer', new LayerContainer('Locations')],
        ['playerLayer', new LayerContainer('Players')],
        ['vehicleLayer', new LayerContainer('Vehicles')],
        ['boatLayer', new LayerContainer('Boats')],
        ['airLayer', new LayerContainer('Air')],
    ]);

    public constructor(
        public http: HttpClient,
        public appCommon: AppCommonService,
    ) {}

    public ngOnDestroy(): void {
        if (!this.onDestroy.closed) {
            this.onDestroy.next();
            this.onDestroy.complete();
        }
    }

    public ngOnInit(): void {
        this.appCommon.SERVER_INFO
            .asObservable()
            .pipe(
                takeUntil(this.onDestroy),
            )
            .subscribe(
                (x?: ServerInfo) => {
                    if (x?.mapHost) {
                        this.mapHost = x.mapHost;
                    }
                    if (x?.worldName && x.worldName !== this.mapName) {
                        void this.setUpWorld(x.worldName.toLowerCase());
                    }
                },
            );

        this.appCommon.fetchServerInfo().toPromise().then();
    }

    protected createBaseLayers(): void {

        const bounds = this.unproject([this.info!.worldSize, this.info!.worldSize]);

        if (this.info!.fullImage) {
            this.baseLayers = {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                Map: imageOverlay(
                    `${this.info!.fullImage}`,
                    [
                        [0, 0],
                        [bounds.lat, bounds.lng],
                    ],
                    {
                        attribution: `Leaflet${this.info!.attribution ? `, ${this.info!.attribution}` : ''}`,
                    },
                ),
            };
        } else {
            this.baseLayers = {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                Map: tileLayer(
                    `${this.mapHost}/${this.mapName}/${this.info!.tilePattern ?? 'tiles/{z}/{x}/{y}.png'}`,
                    {
                        attribution: `Leaflet${this.info!.attribution ? `, ${this.info!.attribution}` : ''}`,
                        bounds: [
                            [0, 0],
                            [bounds.lat, bounds.lng],
                        ],
                        maxNativeZoom: this.info!.maxZoom ?? 7,
                        maxZoom: 20,
                    },
                ),
            };
        }

    }

    protected async setUpWorld(name: string): Promise<void> {

        this.mapName = name;

        if (typeof this.mapHost === 'string') {
            const urlBase = `${this.mapHost}/${this.mapName}`;
            this.info = (await this.http.get(
                `${urlBase}/data.json`,
            ).toPromise()) as MapInfo;
        } else {
            this.info = this.mapHost as MapInfo;
        }

        this.mapScale = Math.ceil(
            Math.log(
                this.info!.worldSize / ((this.info!.tileSize ?? 256) / (this.info!.scale ?? 1)),
            ) / Math.log(2),
        );

        this.options = {
            preferCanvas: true,
            doubleClickZoom: false,
            layers: [],
            zoom: this.info.defaultZoom ?? (this.info.minZoom ?? 1),
            center: [0, 0],
            minZoom: Math.min(this.info.minZoom ?? 1, this.info.fullImageMinZoom ?? 1),
            maxZoom: Math.max(this.info.maxZoom ?? 7, this.info.fullImageMaxZoom ?? 20),
            crs: CRS.Simple,
        };

        console.log('Map Setup Done');
    }

    protected updateLayersControl(): void {
        if (this.layerControl) {
            this.layerControl.remove();
        }

        const overlays = {} as any;

        for (const x of this.layers) {
            if (x[1].layer) {
                overlays[x[1].label] = x[1].layer;
            }
        }

        this.layerControl = control.layers(
            this.baseLayers,
            overlays,
        );
        this.map?.addControl(this.layerControl);
    }

    protected project(coords: LatLng): Point {
        return this.map!.project(coords, this.mapScale!);
    }

    protected unproject(coords: PointExpression): LatLng {
        return this.map!.unproject(coords, this.mapScale!);
    }

    protected zoomChange(): void {
        if (!this.map) {
            return;
        }
        const showTooltipAt = 4;
        const newZoom = this.map.getZoom();


        const locationLayer = this.layers.get('locationLayer')!.layer;
        if (newZoom < showTooltipAt && (!this.curZoom || this.curZoom >= showTooltipAt)) {
            locationLayer.eachLayer((l) => {
                l.closeTooltip();
            });
        } else if (newZoom >= showTooltipAt && (!this.curZoom || this.curZoom < showTooltipAt)) {
            locationLayer.eachLayer((l) => {
                if (l.getTooltip) {
                    const toolTip = l.getTooltip();
                    if (toolTip) {
                        locationLayer.addLayer(toolTip);
                    }
                }
            });
        }
        this.curZoom = newZoom;
    }

    protected createLocations(): void {

        const locationLayer = this.layers.get('locationLayer')!;
        if (locationLayer.markers.length) {
            locationLayer.markers.forEach((x) => {
                locationLayer.layer.removeLayer(x.marker);
            });
            locationLayer.markers = [];
        }

        for (const x of (this.info!.locations || [])) {
            if (x.name) {
                const pos = this.unproject([x.position[0], this.info!.worldSize - x.position[1]]);
                const { name, icon } = this.getLocationTooltip(x);

                const t = tooltip(
                    {
                        permanent: true,
                        direction: 'bottom',
                    },
                ).setContent(name);

                const m = marker(
                    pos,
                    {
                        icon: divIcon({
                            html: `<i class="fa fa-${icon} fa-lg"></i>`,
                            iconSize: [50, 50],
                            className: 'locationIcon',
                        }),
                    },
                ).bindTooltip(t);

                locationLayer.markers.push({
                    marker: m,
                    toolTip: t,
                    id: x.name,
                    data: x,
                });

                locationLayer.layer.addLayer(m);
            }
        }

    }

    public onCenterChange(event: LatLng) {
        const newPos = this.project(event);
        this.curCoordinatesX = newPos.x;
        this.curCoordinatesY = newPos.y;
    };

    public onMapReady(map: LeafletMap): void {
        console.log('Map Ready');

        this.map = map;

        this.map.on('click', (event: LeafletMouseEvent) => {
            const newPos = this.project(event.latlng);
            this.curCoordinatesX = newPos.x;
            this.curCoordinatesY = newPos.y;
        });
        this.map.on('zoomend', () => this.zoomChange());

        this.createBaseLayers();
        this.map!.addLayer(this.baseLayers!['Map']);
        this.map.setView(
            this.unproject(
                this.info!.center ?? (
                    this.info!.worldSize
                    ? [this.info!.worldSize / 2, this.info!.worldSize / 2]
                    : [0, 0]
                ),
            ),
        );

        for (const x of this.layers) {
            this.map.addLayer(x[1].layer);
        }

        this.createLocations();
        this.updateLayersControl();

        this.zoomChange();

        void this.loadData();
    }

    public onMapDoubleClick(event: LeafletMouseEvent) {

    }

    protected async loadData(): Promise<void> {

        this.appCommon.getApiFetcher('INGAME_PLAYERS').latestData
            .pipe(
                takeUntil(this.onDestroy),
            )
            .subscribe(
                (data) => {
                    if (data) {
                        const players = (data as any).value;
                        this.updatePlayers(players);
                    }
                },
            );

        this.appCommon.getApiFetcher('INGAME_VEHICLES').latestData
            .pipe(
                takeUntil(this.onDestroy),
            )
            .subscribe(
                (data) => {
                    if (data) {
                        const vehicles = (data as any).value;
                        this.updateVehicles(vehicles);
                    }
                },
            );

    }

    protected getLocationTooltip(x: Location): { name: string; icon: string } {
        let icon = 'city';
        switch (x.type.toLowerCase()) {
            case 'marine': {
                icon = 'anchor';
                break;
            }
            case 'ruin': {
                icon = 'chess-rook';
                break;
            }
            case 'mount':
            case 'hill': {
                icon = 'mountain';
                break;
            }
            case 'camp': {
                icon = 'campground';
                break;
            }
            case 'local':
            case 'village': {
                icon = 'home';
                break;
            }
            case 'capital': {
                icon = 'university';
                break;
            }
            case 'settlement':
            default: {
                icon = 'city';
                break;
            }
        }

        if (x.cfgName) {
            let detail = x.cfgName;

            if (x.cfgName.includes('_')) {
                const nameSplits = x.cfgName.split('_').filter((part) => !!part);

                if (['local', 'settlement', 'marine', 'ruin', 'camp', 'hill'].includes(nameSplits[0].toLowerCase())) {
                    nameSplits.splice(0, 1);
                }

                detail = nameSplits.join(' ');
                if (detail.startsWith('AF')) {
                    icon = 'plane';
                } else if (detail.startsWith('MB')) {
                    icon = 'crosshairs';
                }
            }

            return {
                name: `${x.name}\n<small>(${detail})</small>`,
                icon,
            };
        }

        return {
            name: x.name,
            icon,
        };
    }

    protected updatePlayers(players: IngameReportEntry[]): void {
        const layer = this.layers.get('playerLayer')!;

        // remove absent
        layer.markers
            .filter((x) => !players.find((player) => `${player.id}` === x.id))
            .forEach((x) => {
                layer.layer.removeLayer(x.marker);
            });

        for (const x of players) {

            const pos = x.position.split(' ').map((coord) => Number(coord));
            const t = tooltip(
                {
                    permanent: true,
                    direction: 'bottom',
                },
            ).setContent(x.name);

            const m = marker(
                this.unproject([pos[0], this.info!.worldSize - pos[2]]),
                {
                    icon: divIcon({
                        html: `<i class="fa fa-user fa-lg" style="color: lime"></i>`,
                        iconSize: [50, 50],
                        className: 'locationIcon',
                    }),
                },
            ).bindTooltip(t);

            layer.markers.push({
                marker: m,
                toolTip: t,
                id: String(x.id),
                data: x,
            });

            layer.layer.addLayer(m);
        }
    }

    protected updateVehicles(vehicles: IngameReportEntry[]): void {
        const layerGround = this.layers.get('vehicleLayer')!;
        const layerAir = this.layers.get('airLayer')!;
        const layerSea = this.layers.get('boatLayer')!;

        // remove absent
        for (const layer of [layerGround, layerAir, layerSea]) {
            layer.markers
                .filter((x) => !vehicles.find((vehicle) => `${vehicle.id}` === x.id))
                .forEach((x) => {
                    layer.layer.removeLayer(x.marker);
                });
        }

        for (const x of vehicles) {

            const pos = x.position.split(' ').map((coord) => Number(coord));
            const t = tooltip(
                {
                    permanent: true,
                    direction: 'bottom',
                },
            ).setContent(x.type);

            let layer: LayerContainer = layerGround;
            let iconClass: string = 'fa fa-car fa-lg';

            if (x.category === 'AIR') {
                layer = layerAir;
                iconClass = 'fa fa-helicopter fa-lg';
            } else if (x.category === 'SEA') {
                layer = layerSea;
                iconClass = 'fa fa-ship fa-lg';
            }

            const m = marker(
                this.unproject([pos[0], this.info!.worldSize - pos[2]]),
                {
                    icon: divIcon({
                        html: `<i class="${iconClass}" style="color: yellow"></i>`,
                        iconSize: [50, 50],
                        className: 'locationIcon',
                    }),
                },
            ).bindTooltip(t);

            layer.markers.push({
                marker: m,
                toolTip: t,
                id: String(x.id),
                data: x,
            });
            layer.layer.addLayer(m);
        }
    }

    public search(value?: string) {
        value = value?.toLowerCase();
        const layerGroups = [
            this.layers.get('vehicleLayer')!,
            this.layers.get('airLayer')!,
            this.layers.get('boatLayer')!,
            this.layers.get('playerLayer')!,
        ];
        for (const layerGroup of layerGroups) {
            for (const m of layerGroup.markers) {
                const hasMarker = layerGroup.layer.hasLayer(m.marker);
                const shouldHave = !value
                    || !!(m.data as IngameReportEntry).name?.toLowerCase().includes(value)
                    || !!(m.data as IngameReportEntry).type?.toLowerCase().includes(value);

                if (hasMarker && !shouldHave) {
                    layerGroup.layer.removeLayer(m.marker);
                }

                if (!hasMarker && shouldHave) {
                    layerGroup.layer.addLayer(m.marker);
                }
            }
        }
    }

}
