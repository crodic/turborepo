import { SettingKeys } from '@/api/settings/enums/setting-keys';
import { BadRequestException, PipeTransform } from '@nestjs/common';

export class SettingKeyValidationPipe implements PipeTransform {
  transform(value: any) {
    if (!Object.values(SettingKeys).includes(value)) {
      throw new BadRequestException('Invalid key');
    }
    return value;
  }
}
