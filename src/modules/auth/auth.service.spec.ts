import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService, UserWithoutPassword } from './auth.service';
import { User } from '../../shared/entities/user.entity';
import { RegisterDto, LoginDto } from '../../dto/auth.dto';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  const mockUser: User = {
    id: 1,
    name: 'João Silva',
    email: 'joao@example.com',
    password: '$2b$10$hashedpassword',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    hashPassword: jest.fn(),
  };

  const mockUserForResponse = {
    id: 1,
    name: 'João Silva',
    email: 'joao@example.com',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockUserWithPassword = {
    id: 1,
    name: 'João Silva',
    email: 'joao@example.com',
    password: '$2b$10$hashedpassword',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockUserWithoutPassword: UserWithoutPassword = {
    id: 1,
    name: 'João Silva',
    email: 'joao@example.com',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto: RegisterDto = {
        name: 'João Silva',
        email: 'joao@example.com',
        password: '123456',
      };

      const token = 'jwt-token';

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUserForResponse);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.register(registerDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { email: registerDto.email } });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUserForResponse.id,
        email: mockUserForResponse.email,
      });
      expect(result).toEqual({
        user: mockUserForResponse,
        token,
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      const registerDto: RegisterDto = {
        name: 'João Silva',
        email: 'joao@example.com',
        password: '123456',
      };

      mockRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { email: registerDto.email } });
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'joao@example.com',
        password: '123456',
      };

      const token = 'jwt-token';

      mockRepository.findOne.mockResolvedValue(mockUserWithPassword);
      mockedBcrypt.compare.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.login(loginDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { email: loginDto.email } });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUserWithPassword.password);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUserWithPassword.id,
        email: mockUserWithPassword.email,
      });
      expect(result).toEqual({
        user: mockUserForResponse,
        token,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: '123456',
      };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { email: loginDto.email } });
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const loginDto: LoginDto = {
        email: 'joao@example.com',
        password: 'wrongpassword',
      };

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });
});
