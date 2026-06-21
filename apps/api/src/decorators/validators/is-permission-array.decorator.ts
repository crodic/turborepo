import {
  ALL_PERMISSIONS,
  AppActions,
  AppSubjects,
} from '@/utils/permissions.constant';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class PermissionsArrayConstraint implements ValidatorConstraintInterface {
  validate(permissions: any[]) {
    if (!Array.isArray(permissions)) return false;
    const validPermissions = ALL_PERMISSIONS.filter(
      (ap) => ap.name !== `${AppActions.Manage}:${AppSubjects.All}`,
    ).map((ap) => ap.name);

    return permissions.every((p) => validPermissions.includes(p));
  }

  defaultMessage() {
    return 'Some permissions are invalid';
  }
}

export function IsPermissionsArray(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: PermissionsArrayConstraint,
    });
  };
}
