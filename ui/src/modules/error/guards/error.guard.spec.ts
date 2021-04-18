import { TestBed } from '@angular/core/testing';

import { ErrorGuard } from './error.guard';

describe('Error Guards', () => {
    let errorGuard: ErrorGuard;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [],
            providers: [ErrorGuard],
        });
        errorGuard = TestBed.inject(ErrorGuard);
    });

    describe('canActivate', () => {
        it('should return an Observable<boolean>', () => {
            errorGuard.canActivate().subscribe(response => {
                expect(response).toEqual(true);
            });
        });
    });
});
