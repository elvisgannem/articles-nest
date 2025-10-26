import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User } from '../../shared/entities/user.entity';
import { CreateUserDto, UpdateUserDto } from '../../dto/user.dto';

describe('UserService', () => {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    it('should create user with correct repository calls', async () => {
      const createUserDto: CreateUserDto = {
        name: 'João Silva',
        email: 'joao@example.com',
        password: '123456',
      };

      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createUserDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should find users with correct query parameters', async () => {
      const users = [mockUser];
      mockRepository.find.mockResolvedValue(users);

      const result = await service.findAll();
      expect(result).toEqual(users);
    });

    it('should find user by id with correct where clause', async () => {
      const userId = 1;
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(userId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(result).toEqual(mockUser);
    });

    it('should find user by email with correct where clause', async () => {
      const email = 'joao@example.com';
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(email);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(result).toEqual(mockUser);
    });

    it('should update user and return updated result', async () => {
      const userId = 1;
      const updateData: Partial<User> = { name: 'João Santos' };
      const updatedUser = { ...mockUser, ...updateData };

      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockRepository.findOne.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateData);

      expect(mockRepository.update).toHaveBeenCalledWith(userId, updateData);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(result).toEqual(updatedUser);
    });

    it('should delete user with correct id', async () => {
      const userId = 1;
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(userId);

      expect(mockRepository.delete).toHaveBeenCalledWith(userId);
    });
  });

  describe('Error Handling', () => {
    it('should return null when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(999);
      expect(result).toBeNull();
    });

    it('should return null when user not found for update', async () => {
      mockRepository.update.mockResolvedValue({ affected: 0 });
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.update(999, { name: 'Test' });
      expect(result).toBeNull();
    });
  });
});
