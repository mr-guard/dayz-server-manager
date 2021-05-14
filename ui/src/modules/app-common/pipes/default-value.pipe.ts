import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'defaultValue' })
export class DefaultValuePipe implements PipeTransform {

    public transform<T>(value: T | null | undefined, defaultValue: T | any): T {
        return (typeof value !== 'undefined' && value !== null) ? value : defaultValue;
    }

}
