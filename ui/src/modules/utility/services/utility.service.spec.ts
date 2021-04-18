import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { take } from 'rxjs/operators';

import { UtilityService } from './utility.service';

describe('UtilityService', () => {
    let utilityService: UtilityService;

    let httpClient: HttpClient;
    let httpTestingController: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [UtilityService],
        });
        utilityService = TestBed.inject(UtilityService);

        httpClient = TestBed.inject(HttpClient);
        httpTestingController = TestBed.inject(HttpTestingController);
    });

    describe('getUtility$', () => {
        it('should return Observable<Utility>', () => {
            utilityService.version$.pipe(take(1)).subscribe(response => {
                expect(response).toEqual('a.b.c');
            });

            const req = httpTestingController.expectOne('/assets/version');
            expect(req.request.method).toEqual('GET');

            req.flush('a.b.c');
            httpTestingController.verify();
        });
    });
});
