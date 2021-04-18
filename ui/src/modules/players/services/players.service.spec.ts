import { TestBed } from '@angular/core/testing';

import { PlayersService } from './players.service';

describe('PlayersService', () => {
    let tablesService: PlayersService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [PlayersService],
        });
        tablesService = TestBed.inject(PlayersService);
    });

    describe('getTables$', () => {
        it('should return Observable<Tables>', () => {
            tablesService.getTables$().subscribe(response => {
                expect(response).toEqual({});
            });
        });
    });
});
