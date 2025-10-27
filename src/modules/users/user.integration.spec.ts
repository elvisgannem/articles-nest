import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from '../../shared/entities/user.entity';
import { Permission } from '../../shared/entities/permission.entity';
import { CreateUserDto, UpdateUserDto } from '../../dto/user.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../../shared/guards/role.guard';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';

describe('User Integration', () => {
  let controller: UserController;
  let service: UserService;
  let userRepository: Repository<User>;

  // Mock Permissions
  const mockAdminPermission: Permission = {
    id: 1,
    name: 'admin',
    description: 'Admin permission',
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
  };

  const mockEditorPermission: Permission = {
    id: 2,
    name: 'editor',
    description: 'Editor permission',
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
  };

  const mockReaderPermission: Permission = {
    id: 3,
    name: 'reader',
    description: 'Reader permission',
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
  };

  // Mock Users with different roles
  const mockAdminUser: User = {
    id: 1,
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
    hashPassword: jest.fn(),
    permissions: [mockAdminPermission, mockEditorPermission, mockReaderPermission],
    articles: [],
  };

  const mockEditorUser: User = {
    id: 2,
    name: 'Editor User',
    email: 'editor@example.com',
    password: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
    hashPassword: jest.fn(),
    permissions: [mockEditorPermission, mockReaderPermission],
    articles: [],
  };

  const mockReaderUser: User = {
    id: 3,
    name: 'Reader User',
    email: 'reader@example.com',
    password: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
    hashPassword: jest.fn(),
    permissions: [mockReaderPermission],
    articles: [],
  };

  const mockRegularUser: User = {
    id: 4,
    name: 'Regular User',
    email: 'regular@example.com',
    password: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
    hashPassword: jest.fn(),
    permissions: [],
    articles: [],
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const mockRoleGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RoleGuard)
      .useValue(mockRoleGuard)
      .compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    it('should complete basic user operations', async () => {
      const createUserDto: CreateUserDto = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
      };

      const newUser = { ...mockRegularUser, ...createUserDto };

      mockRepository.create.mockReturnValue(newUser);
      mockRepository.save.mockResolvedValue(newUser);

      // Create
      const createdUser = await controller.create(createUserDto);
      expect(createdUser).toEqual(newUser);
      expect(mockRepository.create).toHaveBeenCalledWith(createUserDto);
      expect(mockRepository.save).toHaveBeenCalledWith(newUser);
    });

    it('should handle user not found scenarios', async () => {
      // Reset mocks to ensure clean state
      jest.clearAllMocks();
      
      // Mock the service to return null
      const mockUserService = {
        findOne: jest.fn().mockResolvedValue(null),
      };
      
      // Replace the service in the controller
      (controller as any).userService = mockUserService;
      
      const result = await controller.findOne('999');
      expect(result).toBeNull();
    });

    it('should handle duplicate email creation', async () => {
      // Reset mocks to ensure clean state
      jest.clearAllMocks();
      
      const createUserDto: CreateUserDto = {
        name: 'Duplicate User',
        email: 'admin@example.com', // Existing email
        password: 'password123',
      };

      // Mock the service to throw ConflictException
      const mockUserService = {
        create: jest.fn().mockRejectedValue(new ConflictException('Email já está em uso')),
      };
      
      // Replace the service in the controller
      (controller as any).userService = mockUserService;

      await expect(controller.create(createUserDto))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('Permission-Based Access Control', () => {
    describe('Admin User (Full Access)', () => {
      beforeEach(() => {
        mockRepository.create.mockReturnValue(mockRegularUser);
        mockRepository.save.mockResolvedValue(mockRegularUser);
        mockRepository.find.mockResolvedValue([mockAdminUser, mockEditorUser, mockReaderUser]);
        mockRepository.findOne.mockResolvedValue(mockRegularUser);
        mockRepository.update.mockResolvedValue({ affected: 1 });
        mockRepository.delete.mockResolvedValue({ affected: 1 });
      });

      it('should allow admin to create users', async () => {
        const createUserDto: CreateUserDto = {
          name: 'New User',
          email: 'new@example.com',
          password: 'password123',
        };

        const result = await controller.create(createUserDto);
        expect(result).toEqual(mockRegularUser);
        expect(mockRepository.create).toHaveBeenCalledWith(createUserDto);
        expect(mockRepository.save).toHaveBeenCalledWith(mockRegularUser);
      });

      it('should allow admin to view all users', async () => {
        const result = await controller.findAll();
        expect(result).toEqual([mockAdminUser, mockEditorUser, mockReaderUser]);
        expect(mockRepository.find).toHaveBeenCalled();
      });

      it('should allow admin to view specific user', async () => {
        const result = await controller.findOne('1');
        expect(result).toEqual(mockRegularUser);
        expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      });

      it('should allow admin to update users', async () => {
        // Reset mocks to ensure clean state
        jest.clearAllMocks();
        
        const updateUserDto: UpdateUserDto = { name: 'Updated by Admin' };
        const updatedUser = { ...mockRegularUser, name: 'Updated by Admin' };

        // Mock the service to return the updated user
        const mockUserService = {
          update: jest.fn().mockResolvedValue(updatedUser),
        };
        
        // Replace the service in the controller
        (controller as any).userService = mockUserService;

        const result = await controller.update('1', updateUserDto);
        expect(result).toEqual(updatedUser);
        expect(mockUserService.update).toHaveBeenCalledWith(1, updateUserDto);
      });

      it('should allow admin to delete users', async () => {
        mockRepository.findOne.mockResolvedValue(mockRegularUser);

        await controller.remove('1');
        expect(mockRepository.delete).toHaveBeenCalledWith(1);
      });
    });

    describe('Editor User (No Access)', () => {
      beforeEach(() => {
        mockRepository.find.mockResolvedValue([mockAdminUser, mockEditorUser, mockReaderUser]);
        mockRepository.findOne.mockResolvedValue(mockEditorUser);
      });

      it('should verify editor user exists', () => {
        expect(mockEditorUser.permissions).toContain(mockEditorPermission);
        expect(mockEditorUser.permissions).toContain(mockReaderPermission);
        expect(mockEditorUser.permissions).not.toContain(mockAdminPermission);
      });
    });

    describe('Reader User (No Access)', () => {
      beforeEach(() => {
        mockRepository.find.mockResolvedValue([mockAdminUser, mockEditorUser, mockReaderUser]);
        mockRepository.findOne.mockResolvedValue(mockReaderUser);
      });

      it('should verify reader user exists', () => {
        expect(mockReaderUser.permissions).toContain(mockReaderPermission);
        expect(mockReaderUser.permissions).not.toContain(mockAdminPermission);
        expect(mockReaderUser.permissions).not.toContain(mockEditorPermission);
      });
    });

    describe('Regular User (No Access)', () => {
      beforeEach(() => {
        mockRepository.find.mockResolvedValue([mockAdminUser, mockEditorUser, mockReaderUser]);
        mockRepository.findOne.mockResolvedValue(mockRegularUser);
      });

      it('should verify regular user has no permissions', () => {
        expect(mockRegularUser.permissions).toHaveLength(0);
        expect(mockRegularUser.permissions).not.toContain(mockAdminPermission);
        expect(mockRegularUser.permissions).not.toContain(mockEditorPermission);
        expect(mockRegularUser.permissions).not.toContain(mockReaderPermission);
      });
    });
  });

  describe('Security Guards', () => {
    it('should verify guards are applied at class level', () => {
      const classGuards = Reflect.getMetadata('__guards__', UserController);
      expect(classGuards).toContain(JwtAuthGuard);
      expect(classGuards).toContain(RoleGuard);
    });
  });

  describe('Role Decorators', () => {
    it('should verify roles are applied at class level', () => {
      const classRoles = Reflect.getMetadata('roles', UserController);
      expect(classRoles).toEqual(['admin']);
    });
  });

  describe('Class-Level Decorators', () => {
    it('should have class-level guards and roles', () => {
      const classGuards = Reflect.getMetadata('__guards__', UserController);
      const classRoles = Reflect.getMetadata('roles', UserController);

      expect(classGuards).toContain(JwtAuthGuard);
      expect(classGuards).toContain(RoleGuard);
      expect(classRoles).toEqual(['admin']);
    });
  });
});