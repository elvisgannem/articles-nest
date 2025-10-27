import { Injectable, OnModuleInit } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { UserPermissionService } from './user-permission.service';

@Injectable()
export class AppInitializationService implements OnModuleInit {
  constructor(
    private permissionService: PermissionService,
    private userPermissionService: UserPermissionService,
  ) {}

  async onModuleInit() {
    
    try {
      await this.permissionService.seedPermissions();
      await this.userPermissionService.createRootUser();
    } catch (error) {
      console.error(error);
    }
  }
}
