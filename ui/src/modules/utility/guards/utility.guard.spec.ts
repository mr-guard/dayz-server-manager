import { TestBed } from '@angular/core/testing';

import { UtilityGuard } from './utility.guard';

describe('Utility Guards', () => {

    let utilityGuard: UtilityGuard;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [],
            providers: [
                UtilityGuard,
            ],
        });
        utilityGuard = TestBed.inject(UtilityGuard);
    });

    describe('canActivate', () => {
        it('should return an Observable<boolean>', () => {
            utilityGuard.canActivate().subscribe(response => {
                expect(response).toEqual(true);
            });
        });
    });

});
