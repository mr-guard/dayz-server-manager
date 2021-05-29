import { TestBed } from '@angular/core/testing';

import { MapService } from './map.service';

describe('MapService', () => {
    let mapService: MapService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [MapService],
        });
        mapService = TestBed.inject(MapService);
    });

});
