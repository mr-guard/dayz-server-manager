import { UserService } from '@modules/auth/services';
import { MockUser, User } from '@testing/mocks';
import { Observable, of } from 'rxjs';

const mockUser = new MockUser();

export class UserServiceStub implements UserService {

    // eslint-disable-next-line accessor-pairs
    public set user(user: User) {
        // ignore
    }

    public get user$(): Observable<User> {
        return of(mockUser);
    }

}
