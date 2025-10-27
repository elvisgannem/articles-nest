import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from '../entities/permission.entity';
import { User } from '../entities/user.entity';
import { PermissionService } from '../services/permission.service';
import { UserPermissionService } from '../services/user-permission.service';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, User])],
  providers: [PermissionService, UserPermissionService],
  exports: [PermissionService, UserPermissionService],
})
export class PermissionModule {}
