import { Pipe, type PipeTransform } from '@angular/core';

import { formatDisplayLabel, type DisplayLabelKind } from '../utils/display-format';

@Pipe({ name: 'displayLabel' })
export class DisplayLabelPipe implements PipeTransform {
  transform(value: string | null | undefined, kind: DisplayLabelKind): string {
    return formatDisplayLabel(value, kind);
  }
}
