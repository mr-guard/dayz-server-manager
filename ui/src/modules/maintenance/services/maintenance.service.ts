import { Injectable } from '@angular/core';
import { AppCommonService } from '@common/services';


@Injectable({ providedIn: 'root' })
export class MaintenanceService {

    public constructor(
        protected appCommon: AppCommonService,
    ) {
    }

}
