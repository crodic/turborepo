import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { RoleEntity } from '@/api/role/entities/role.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import {
  AbilityBuilder,
  createMongoAbility,
  ExtractSubjectType,
  InferSubjects,
  MongoAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { AppActions, AppSubjects } from '../../utils/permissions.constant';

export type Subjects =
  | InferSubjects<typeof UserEntity | typeof RoleEntity>
  | AppSubjects
  | 'all';
// export type AppAbility = PureAbility<[string, Subjects]>;
export type AppAbility = MongoAbility<[AppActions, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: AdminUserEntity) {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    const perms =
      user.roles?.flatMap((role) =>
        role.permissionEntities?.map((permission) => permission.key),
      ) || [];

    perms.forEach((perm) => {
      const [action, subject] = perm.split(':');
      if (action && subject) {
        can(action as AppActions, subject as AppSubjects);
      }
    });

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
