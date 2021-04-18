import { Injectable } from '@angular/core';
import { AppCommonService } from '@common/services';


@Injectable({ providedIn: 'root' })
export class SettingsService {

    public constructor(
        protected appCommon: AppCommonService,
    ) {
    }

}
