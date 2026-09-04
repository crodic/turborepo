import { UserAccountEntity } from '@/api/user/entities/user-account.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { EAccountProvider } from '@/constants/entity.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

const users: Array<
  Pick<UserEntity, 'firstName' | 'lastName' | 'email' | 'avatar'> & {
    password?: string;
  }
> = [
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'user.seed.1@example.com',
    password: '12345678',
    avatar: 'https://i.pravatar.cc/150?img=1',
  },
  {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'user.seed.2@example.com',
    password: '12345678',
    avatar: 'https://i.pravatar.cc/150?img=2',
  },
  {
    firstName: 'Alex',
    lastName: 'Smith',
    email: 'user.seed.3@example.com',
    password: '12345678',
    avatar: 'https://i.pravatar.cc/150?img=3',
  },
  {
    firstName: 'Taylor',
    lastName: 'Brown',
    email: 'user.seed.4@example.com',
    password: '12345678',
    avatar: 'https://i.pravatar.cc/150?img=4',
  },
  {
    firstName: 'Morgan',
    lastName: 'Wilson',
    email: 'user.seed.5@example.com',
    password: '12345678',
    avatar: 'https://i.pravatar.cc/150?img=5',
  },
];

@Injectable()
export class UserSeedService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserAccountEntity)
    private readonly userAccountRepository: Repository<UserAccountEntity>,
  ) {}

  async run(): Promise<void> {
    for (const user of users) {
      let existingUser = await this.userRepository.findOne({
        where: { email: user.email },
        withDeleted: true,
      });

      if (!existingUser) {
        existingUser = await this.userRepository.save(
          this.userRepository.create({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            avatar: user.avatar,
            verifiedAt: new Date(),
          }),
        );
      }

      const existingAccount = await this.userAccountRepository.findOne({
        where: {
          userId: existingUser.id,
          provider: EAccountProvider.LOCAL,
        },
      });

      if (!existingAccount && user.password) {
        await this.userAccountRepository.save(
          new UserAccountEntity({
            userId: existingUser.id,
            provider: EAccountProvider.LOCAL,
            providerAccountId: existingUser.email,
            password: user.password,
            email: existingUser.email,
            displayName:
              `${existingUser.firstName} ${existingUser.lastName}`.trim(),
          }),
        );
      }
    }
  }
}
