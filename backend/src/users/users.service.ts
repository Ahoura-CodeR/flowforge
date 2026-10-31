import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../common/db-errors';
import { User, UserRole } from './user.entity';

const BCRYPT_ROUNDS = 12;

interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const user = this.usersRepo.create({
      email: input.email,
      name: input.name,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      role: input.role ?? UserRole.MEMBER,
    });

    try {
      return await this.usersRepo.save(user);
    } catch (err) {
      // Rely on the DB unique constraint instead of a check-then-insert,
      // which would race under concurrent registrations.
      if (isUniqueViolation(err)) {
        throw new ConflictException('Email is already registered');
      }
      throw err;
    }
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  // Only the login flow needs the hash, so it has its own explicit query.
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { email },
      select: ['id', 'email', 'name', 'role', 'passwordHash'],
    });
  }

  findAll(): Promise<User[]> {
    return this.usersRepo.find({ order: { createdAt: 'ASC' } });
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.role = role;
    return this.usersRepo.save(user);
  }
}
