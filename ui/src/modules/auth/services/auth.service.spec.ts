import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
    let authService: AuthService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [AuthService],
        });
        authService = TestBed.inject(AuthService);
    });

    describe('getAuth$', () => {
        it('should return Observable<Auth>', () => {
            // authService.getAuth$().subscribe(response => {
            //     expect(response).toEqual({});
            // });
        });
    });
});
