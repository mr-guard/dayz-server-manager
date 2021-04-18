import { TestBed } from '@angular/core/testing';

import { AppCommonGuard } from './app-common.guard';

describe('App Common Guards', () => {
    let appCommonGuard: AppCommonGuard;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [],
            providers: [AppCommonGuard],
        });
        appCommonGuard = TestBed.inject(AppCommonGuard);
    });

    describe('canActivate', () => {
        it('should return an Observable<boolean>', () => {
            appCommonGuard.canActivate().subscribe(response => {
                expect(response).toEqual(true);
            });
        });
    });
});
