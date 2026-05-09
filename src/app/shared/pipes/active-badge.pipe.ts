import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'activeBadge' })
export class ActiveBadgePipe implements PipeTransform {
  transform(value: boolean | null | undefined): string {
    return value ? 'Sí' : 'No';
  }
}
