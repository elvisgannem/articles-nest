import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from '../../shared/entities/user.entity';
import { CreateUserDto, UpdateUserDto } from '../../dto/user.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

describe('User Integration', () => {
  let controller: UserController;
  let service: UserService;
  let repository: Repository<User>;

  const mockUser: User = {
    id: 1,
    name: 'João Silva',
    email: 'joao@example.com',
    password: '$2b$10$hashedpassword',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    hashPassword: jest.fn(),
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
      .compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    it('should create, read, update and delete a user', async () => {
      const createUserDto: CreateUserDto = {
        name: 'João Silva',
        email: 'joao@example.com',
        password: '123456',
      };

      const updateUserDto: UpdateUserDto = {
        name: 'João Santos',
      };

      // CREATE
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);
      
      const createdUser = await controller.create(createUserDto);
      expect(createdUser).toEqual(mockUser);
      expect(mockRepository.create).toHaveBeenCalledWith(createUserDto);

      // READ ALL
      mockRepository.find.mockResolvedValue([mockUser]);
      const allUsers = await controller.findAll();
      expect(allUsers).toEqual([mockUser]);

      // READ ONE
      mockRepository.findOne.mockResolvedValue(mockUser);
      const foundUser = await controller.findOne('1');
      expect(foundUser).toEqual(mockUser);

      // UPDATE
      const updatedUser = { ...mockUser, ...updateUserDto };
      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockRepository.findOne.mockResolvedValue(updatedUser);
      
      const result = await controller.update('1', updateUserDto);
      expect(result).toEqual(updatedUser);

      // DELETE
      mockRepository.delete.mockResolvedValue({ affected: 1 });
      await controller.remove('1');
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should handle user not found scenarios', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      
      const result = await controller.findOne('999');
      expect(result).toBeNull();
    });

    it('should be protected by JWT Guard', () => {
      const guards = Reflect.getMetadata('__guards__', UserController);
      expect(guards).toContain(JwtAuthGuard);
    });
  });
});
