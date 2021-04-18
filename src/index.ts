import 'reflect-metadata';
import { ManagerController } from './control/manager-controller';

void (async () => {

    await ManagerController.INSTANCE.run();

})();
