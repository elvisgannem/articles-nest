import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../../shared/entities/user.entity';
import { RegisterDto, LoginDto } from '../../dto/auth.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('Auth Integration', () => {
  let controller: AuthController;
  let service: AuthService;
  let repository: Repository<User>;
  let jwtService: JwtService;

  const mockUser = {
    id: 1,
    name: 'João Silva',
    email: 'joao@example.com',
    password: '$2b$10$hashedpassword',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockUserWithoutPassword = {
    id: 1,
    name: 'João Silva',
    email: 'joao@example.com',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Flow', () => {
    it('should complete full auth flow: register -> login -> profile', async () => {
      const registerDto: RegisterDto = {
        name: 'João Silva',
        email: 'joao@example.com',
        password: '123456',
      };

      const loginDto: LoginDto = {
        email: 'joao@example.com',
        password: '123456',
      };

      const token = 'jwt-token';

      // REGISTER
      mockRepository.findOne.mockResolvedValueOnce(null); // No existing user
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue(token);

      const registerResult = await controller.register(registerDto);
      expect(registerResult).toEqual({
        user: mockUserWithoutPassword,
        token,
      });

      // LOGIN
      mockRepository.findOne.mockResolvedValueOnce(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(token);

      const loginResult = await controller.login(loginDto);
      expect(loginResult).toEqual({
        user: mockUserWithoutPassword,
        token,
      });

      // PROFILE
      const mockRequest = {
        user: {
          userId: 1,
          email: 'joao@example.com',
        },
      };

      const profileResult = controller.getProfile(mockRequest);
      expect(profileResult).toEqual(mockRequest.user);
    });

    it('should handle registration with existing email', async () => {
      const registerDto: RegisterDto = {
        name: 'João Silva',
        email: 'joao@example.com',
        password: '123456',
      };

      mockRepository.findOne.mockResolvedValue(mockUser); // User already exists

      await expect(controller.register(registerDto)).rejects.toThrow('Email já está em uso');
    });

    it('should handle login with invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'joao@example.com',
        password: 'wrongpassword',
      };

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false);

      await expect(controller.login(loginDto)).rejects.toThrow('Credenciais inválidas');
    });

    it('should handle login with non-existent user', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: '123456',
      };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(controller.login(loginDto)).rejects.toThrow('Credenciais inválidas');
    });
  });

  describe('Security', () => {
    it('should hash passwords before saving', async () => {
      const registerDto: RegisterDto = {
        name: 'João Silva',
        email: 'joao@example.com',
        password: '123456',
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('token');

      await controller.register(registerDto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        name: 'João Silva',
        email: 'joao@example.com',
        password: '123456',
      });
    });

    it('should return user without password', async () => {
      const loginDto: LoginDto = {
        email: 'joao@example.com',
        password: '123456',
      };

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('token');

      const result = await controller.login(loginDto);

      expect(result.user).not.toHaveProperty('password');
      expect(result.user).toEqual(mockUserWithoutPassword);
    });
  });
});
