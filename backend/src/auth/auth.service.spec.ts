import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: { findByEmailWithPassword: jest.Mock; create: jest.Mock };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };

  beforeEach(async () => {
    users = { findByEmailWithPassword: jest.fn(), create: jest.fn() };
    service = new AuthService(users as unknown as UsersService, jwt as unknown as JwtService);
  });

  const storedUser = async () => ({
    id: 'u1',
    email: 'a@b.co',
    name: 'Ali',
    role: UserRole.MEMBER,
    passwordHash: await bcrypt.hash('correct-password', 4),
  });

  it('logs in with the right password and signs only id and role into the token', async () => {
    users.findByEmailWithPassword.mockResolvedValue(await storedUser());
    const result = await service.login({ email: 'a@b.co', password: 'correct-password' });

    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u1', role: UserRole.MEMBER });
    expect(result.accessToken).toBe('signed-token');
    expect(result.user).toEqual({ id: 'u1', email: 'a@b.co', name: 'Ali', role: UserRole.MEMBER });
  });

  it('never returns the password hash', async () => {
    users.findByEmailWithPassword.mockResolvedValue(await storedUser());
    const result = await service.login({ email: 'a@b.co', password: 'correct-password' });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    users.findByEmailWithPassword.mockResolvedValueOnce(await storedUser());
    const wrongPassword = await service.login({ email: 'a@b.co', password: 'nope-nope' }).catch((e) => e);

    users.findByEmailWithPassword.mockResolvedValueOnce(null);
    const unknownUser = await service.login({ email: 'x@y.co', password: 'whatever1' }).catch((e) => e);

    expect(wrongPassword).toBeInstanceOf(UnauthorizedException);
    expect(unknownUser).toBeInstanceOf(UnauthorizedException);
    expect(wrongPassword.message).toBe(unknownUser.message);
  });
});
