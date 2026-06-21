import { SettingKeys } from '../enums/setting-keys';

export class ValidSettingKey {
  static isValid(key: any): boolean {
    const constants = Object.values(SettingKeys);
    return constants.includes(key);
  }
}
