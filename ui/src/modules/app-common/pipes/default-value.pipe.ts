import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'defaultValue' })
export class DefaultValuePipe implements PipeTransform {

    public transform<T>(value: T | null, defaultValue: T): T {
        return (typeof value !== 'undefined' && value !== null) ? value : defaultValue;
    }

}
