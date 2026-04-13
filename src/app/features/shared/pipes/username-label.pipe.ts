import { Pipe, type PipeTransform } from '@angular/core';

import { formatUsernameLabel } from '../utils/display-format';

@Pipe({ name: 'usernameLabel' })
export class UsernameLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatUsernameLabel(value);
  }
}
