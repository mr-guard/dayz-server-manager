import { TestBed } from '@angular/core/testing';

import { ErrorService } from './error.service';

describe('ErrorService', () => {
    let errorService: ErrorService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [ErrorService],
        });
        errorService = TestBed.inject(ErrorService);
    });

    describe('getError$', () => {
        it('should return Observable<Error>', () => {
            errorService.getError$().subscribe(response => {
                expect(response).toEqual({});
            });
        });
    });
});
