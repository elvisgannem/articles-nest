import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    const userWithPermissions = await this.userRepository.findOne({
      where: { id: user.userId },
      relations: ['permissions'],
    });

    if (!userWithPermissions) {
      throw new ForbiddenException('Usuário não encontrado');
    }

    const userPermissions = userWithPermissions.permissions.map(p => p.name);
    
    const hasPermission = requiredRoles.some(role => userPermissions.includes(role));

    if (!hasPermission) {
      throw new ForbiddenException(`Acesso negado. Permissões necessárias: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
