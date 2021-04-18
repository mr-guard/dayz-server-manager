import { User } from '@modules/auth/models';
export { User };

export class MockUser implements User {

    public id = 'TEST_ID';
    public firstName = 'TEST_FIRST_NAME';
    public lastName = 'TEST_LAST_NAME';
    public email = 'TEST_EMAIL';

}
