import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../shared/entities/user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { RoleGuard } from '../../shared/guards/role.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserService, RoleGuard],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
