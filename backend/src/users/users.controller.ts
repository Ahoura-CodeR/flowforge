import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/types/auth-user';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UserRole } from './user.entity';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/role')
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    // Stops the last admin from demoting themselves and locking everyone out.
    if (id === currentUser.id) {
      throw new BadRequestException('You cannot change your own role');
    }
    return this.usersService.updateRole(id, dto.role);
  }
}
