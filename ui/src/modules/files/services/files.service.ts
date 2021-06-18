import { Injectable } from '@angular/core';
import { AppCommonService } from '@common/services';


@Injectable({ providedIn: 'root' })
export class FilesService {

    public constructor(
        protected appCommon: AppCommonService,
    ) {
    }

}
