import { Pipe, type PipeTransform } from '@angular/core';

import { formatDateTimeLabel } from '../utils/display-format';

@Pipe({ name: 'dateTimeLabel' })
export class DateTimeLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatDateTimeLabel(value);
  }
}
