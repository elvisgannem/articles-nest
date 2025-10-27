import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../shared/entities/user.entity';
import { Permission } from '../../shared/entities/permission.entity';

@Injectable()
export class UserPermissionService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async assignPermissionToUser(userId: number, permissionName: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['permissions'],
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const permission = await this.permissionRepository.findOne({
      where: { name: permissionName },
    });

    if (!permission) {
      throw new Error('Permissão não encontrada');
    }

    const hasPermission = user.permissions.some(p => p.name === permissionName);
    if (hasPermission) {
      return;
    }

    user.permissions.push(permission);
    await this.userRepository.save(user);
  }

  async createRootUser(): Promise<void> {
    const existingRoot = await this.userRepository.findOne({
      where: { email: 'root@admin.com' },
      relations: ['permissions'],
    });

    if (existingRoot) {
      return;
    }

    const rootUser = this.userRepository.create({
      name: 'Root Admin',
      email: 'root@admin.com',
      password: 'root123456',
    });

    const savedUser = await this.userRepository.save(rootUser);

    const permissions = await this.permissionRepository.find();
    savedUser.permissions = permissions;
    await this.userRepository.save(savedUser);
  }

  async getUserPermissions(userId: number): Promise<string[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['permissions'],
    });

    if (!user) {
      return [];
    }

    return user.permissions.map(p => p.name);
  }
}
