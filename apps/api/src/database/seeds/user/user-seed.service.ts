import { AccountEntity } from '@/api/user/entities/account.entity';
import { UserProfileEntity } from '@/api/user/entities/user-profile.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import {
  DomainType,
  EAccountProvider,
  UserStatus,
} from '@/constants/entity.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

interface SeedUserData {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  avatar?: string;
}

const users: SeedUserData[] = [
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
    @InjectRepository(UserProfileEntity)
    private readonly userProfileRepository: Repository<UserProfileEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
  ) {}

  async run(): Promise<void> {
    for (const user of users) {
      let existingUser = await this.userRepository.findOne({
        where: {
          email: user.email.toLowerCase().trim(),
          domain: DomainType.CLIENT,
        },
        relations: ['userProfile'],
        withDeleted: true,
      });

      if (!existingUser) {
        existingUser = await this.userRepository.save(
          this.userRepository.create({
            email: user.email.toLowerCase().trim(),
            password: user.password,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.avatar,
            domain: DomainType.CLIENT,
            status: UserStatus.ACTIVE,
            isEmailVerified: true,
            verifiedAt: new Date(),
          }),
        );

        await this.userProfileRepository.save(
          this.userProfileRepository.create({
            userId: existingUser.id,
          }),
        );
      }

      const existingAccount = await this.accountRepository.findOne({
        where: {
          userId: existingUser.id,
          provider: EAccountProvider.LOCAL,
        },
      });

      if (!existingAccount && user.password) {
        await this.accountRepository.save(
          this.accountRepository.create({
            userId: existingUser.id,
            provider: EAccountProvider.LOCAL,
            providerAccountId: existingUser.email,
          }),
        );
      }
    }
  }
}
