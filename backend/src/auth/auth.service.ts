import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/auth-user';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    const passwordMatches = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;

    // Same message for "no such user" and "wrong password" so we don't leak which emails exist.
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: User) {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      // Mapped by hand so the hash can never end up in a response.
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }
}
