import { DecimalPipe } from '@angular/common';
import { Injectable } from '@angular/core';
import { AppCommonService } from '@common/services';


@Injectable({ providedIn: 'root' })
export class MapService {

    public constructor(
        protected pipe: DecimalPipe,
        protected appCommon: AppCommonService,
    ) {

    }

}
