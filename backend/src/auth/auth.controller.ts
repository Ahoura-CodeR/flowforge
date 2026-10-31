import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthUser } from './types/auth-user';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  // Stricter limit than the global one: slows down credential stuffing and signup abuse.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiBearerAuth()
  @Get('me')
  async me(@CurrentUser() currentUser: AuthUser) {
    const user = await this.usersService.findById(currentUser.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
