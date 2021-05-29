import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { ServerInfo } from '@common/models';
import { AppCommonService } from '@common/services';
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
} from 'leaflet';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface Location {
    name: string;
    cfgName: string;
    position: [number, number];
    type: string;
}

interface MapInfo {
    title: string;
    worldName: string;
    tilePattern: string;
    maxZoom: number;
    minZoom: number;
    defaultZoom: number;
    attribution: string;
    tileSize: number;
    center: [number, number];
    worldSize: number;
    preview: string;
    fullSize: string;
    locations: Location[];
}

interface MarkerWithId {
    marker: Marker;
    toolTip?: Tooltip;
    id: string;
}

/* eslint-disable @typescript-eslint/naming-convention */
// eslint-disable-next-line no-shadow
enum LayerIdsEnum {
    locationLayer = 'locationLayer',
    playerLayer = 'playerLayer',
    vehicleLayer = 'vehicleLayer',
    boatLayer = 'boatLayer',
    airLayer = 'airLayer',
}
type LayerIds = keyof typeof LayerIdsEnum;
/* eslint-enable @typescript-eslint/naming-convention */

class LayerContainer {

    public constructor(
        public label: string,
        public layer: LayerGroup = layerGroup(),
        public markers: MarkerWithId[] = [],
    ) {}

}

interface IngameEntity {
    damage: number;
    entryType: 'VEHICLE' | 'PLAYER';
    id: number;
    name: string;
    position: string;
    speed: string;
    type: string;
}

@Component({
    selector: 'sb-map',
    changeDetection: ChangeDetectionStrategy.Default,
    templateUrl: './map.component.html',
    styleUrls: ['map.component.scss'],
})
export class MapComponent implements OnInit, OnDestroy {

    private onDestroy = new Subject();

    public info?: MapInfo;
    public options?: MapOptions;

    public baseLayers?: Control.LayersObject;

    public map?: LeafletMap;
    public curZoom?: number;
    public mapScale?: number;
    public curCoordinates: Point = new Point(0, 0);

    private mapHost = 'https://senfo.space/dayzmaps';
    private mapName?: string;

    private layerControl?: Control;
    private layers = new Map<LayerIds, LayerContainer>([
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
        // ignore
        void this.init();
    }

    private async init(): Promise<void> {

        this.appCommon.SERVER_INFO
            .asObservable()
            .pipe(
                takeUntil(this.onDestroy),
            )
            .subscribe(
                (x?: ServerInfo) => {
                    if (x?.worldName && x.worldName !== this.mapName) {
                        void this.setUpWorld(x.worldName);
                    }
                },
            );

        await this.appCommon.fetchServerInfo().toPromise();

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

    private createBaseLayers(): void {
        const bounds = this.unproject([this.info!.worldSize, this.info!.worldSize]);
        this.baseLayers = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Satelite: tileLayer(
                `${this.mapHost}/${this.mapName}/${this.info!.tilePattern ?? 'tiles/{z}/{x}/{y}.png'}`,
                {
                    attribution: `Leaflet${this.info!.attribution ? `, ${this.info!.attribution}` : ''}`,
                    bounds: [
                        [0, 0],
                        [bounds.lat, bounds.lng],
                    ],
                },
            ),
        };
    }

    private async setUpWorld(name: string): Promise<void> {

        this.mapName = name;
        const urlBase = `${this.mapHost}/${this.mapName}`;
        this.info = (await this.http.get(
            `${urlBase}/data.json`,
        ).toPromise()) as MapInfo;
        this.mapScale = Math.ceil(
            Math.log(
                this.info!.worldSize / (this.info!.tileSize ?? 256),
            ) / Math.log(2),
        );

        this.options = {
            layers: [],
            zoom: this.info.defaultZoom ?? (this.info.minZoom ?? 1),
            center: [0, 0],
            minZoom: this.info.minZoom ?? 1,
            maxZoom: this.info.maxZoom ?? 7,
            crs: CRS.Simple,
        };

        console.log('Map Setup Done');
    }

    private updateLayersControl(): void {
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

    private project(coords: LatLng): Point {
        return this.map!.project(coords, this.mapScale!);
    }

    private unproject(coords: PointExpression): LatLng {
        return this.map!.unproject(coords, this.mapScale!);
    }

    private zoomChange(): void {
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

    private createLocations(): void {

        const locationLayer = this.layers.get('locationLayer')!;
        if (locationLayer.markers.length) {
            locationLayer.markers.forEach((x) => {
                locationLayer.layer.removeLayer(x.marker);
            });
            locationLayer.markers = [];
        }

        for (const x of this.info!.locations) {
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
                });

                locationLayer.layer.addLayer(m);
            }
        }

    }

    public onMapReady(map: LeafletMap): void {
        console.log('Map Ready');

        this.map = map;
        this.map.on('mousemove', (event: LeafletMouseEvent) => {
            this.curCoordinates = this.project(event.latlng);
        });
        this.map.on('zoomend', () => this.zoomChange());

        this.createBaseLayers();
        Object.keys(this.baseLayers!).forEach((x) => {
            this.map!.addLayer(this.baseLayers![x]);
        });
        this.map.setView(this.unproject(this.info!.center ?? [0, 0]));

        for (const x of this.layers) {
            this.map.addLayer(x[1].layer);
        }

        this.createLocations();
        this.updateLayersControl();

        this.zoomChange();
    }

    private getLocationTooltip(x: Location): { name: string; icon: string } {
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
                name: `${x.name}\n(${detail})`,
                icon,
            };
        }

        return {
            name: x.name,
            icon,
        };
    }

    private updatePlayers(players: IngameEntity[]): void {
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
                        html: `<i class="fa fa-user fa-lg"></i>`,
                        iconSize: [50, 50],
                        className: 'locationIcon',
                    }),
                },
            ).bindTooltip(t);

            layer.markers.push({
                marker: m,
                toolTip: t,
                id: String(x.id),
            });

            layer.layer.addLayer(m);
        }
    }

    private updateVehicles(vehicles: IngameEntity[]): void {
        const layer = this.layers.get('vehicleLayer')!;

        // remove absent
        layer.markers
            .filter((x) => !vehicles.find((vehicle) => `${vehicle.id}` === x.id))
            .forEach((x) => {
                layer.layer.removeLayer(x.marker);
            });

        for (const x of vehicles) {

            const pos = x.position.split(' ').map((coord) => Number(coord));
            const t = tooltip(
                {
                    permanent: true,
                    direction: 'bottom',
                },
            ).setContent(x.type);

            const m = marker(
                this.unproject([pos[0], this.info!.worldSize - pos[2]]),
                {
                    icon: divIcon({
                        html: `<i class="fa fa-car fa-lg"></i>`,
                        iconSize: [50, 50],
                        className: 'locationIcon',
                    }),
                },
            ).bindTooltip(t);

            layer.markers.push({
                marker: m,
                toolTip: t,
                id: String(x.id),
            });

            layer.layer.addLayer(m);
        }
    }

}
