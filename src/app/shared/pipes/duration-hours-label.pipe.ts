import { Pipe, type PipeTransform } from '@angular/core';

import { formatDurationHours } from '../utils/display-format';

@Pipe({ name: 'durationHoursLabel' })
export class DurationHoursLabelPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatDurationHours(value);
  }
}
