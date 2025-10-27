import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../../shared/entities/permission.entity';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async createPermission(name: string, description: string): Promise<Permission> {
    const permission = this.permissionRepository.create({ name, description });
    return this.permissionRepository.save(permission);
  }

  async findAll(): Promise<Permission[]> {
    return this.permissionRepository.find();
  }

  async findByName(name: string): Promise<Permission | null> {
    return this.permissionRepository.findOne({ where: { name } });
  }

  async seedPermissions(): Promise<void> {
    const permissions = [
      { name: 'admin', description: 'Permissão para administrar artigos e usuários' },
      { name: 'editor', description: 'Permissão para administrar artigos' },
      { name: 'reader', description: 'Permissão para apenas ler artigos' },
    ];

    for (const permissionData of permissions) {
      const existingPermission = await this.findByName(permissionData.name);
      if (!existingPermission) {
        await this.createPermission(permissionData.name, permissionData.description);
        console.log(`Permission '${permissionData.name}' created`);
      } else {
        console.log(`Permission '${permissionData.name}' already exists`);
      }
    }
  }
}
