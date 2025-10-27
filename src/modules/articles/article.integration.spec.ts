import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { Article } from '../../shared/entities/article.entity';
import { CreateArticleDto, UpdateArticleDto } from '../../dto/article.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('Article Integration', () => {
  let controller: ArticleController;

  const mockUser = {
    id: 1,
    name: 'João Silva',
    email: 'joao@example.com',
    password: '$2b$10$hashedpassword',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockArticle: Article = {
    id: 1,
    title: 'Meu Primeiro Artigo',
    content: 'Este é o conteúdo do meu primeiro artigo.',
    authorId: 1,
    author: mockUser,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
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
      controllers: [ArticleController],
      providers: [
        ArticleService,
        {
          provide: getRepositoryToken(Article),
          useValue: mockRepository,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<ArticleController>(ArticleController);
    service = module.get<ArticleService>(ArticleService);
    repository = module.get<Repository<Article>>(getRepositoryToken(Article));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    it('should complete full article flow: create -> read -> update -> delete', async () => {
      const createArticleDto: CreateArticleDto = {
        title: 'Meu Primeiro Artigo',
        content: 'Este é o conteúdo do meu primeiro artigo.',
      };

      const updateArticleDto: UpdateArticleDto = {
        title: 'Título Atualizado',
      };

      const mockRequest = {
        user: { userId: 1 },
      };

      // CREATE
      mockRepository.create.mockReturnValue(mockArticle);
      mockRepository.save.mockResolvedValue(mockArticle);
      
      const createdArticle = await controller.create(createArticleDto, mockRequest);
      expect(createdArticle).toEqual(mockArticle);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createArticleDto,
        authorId: 1,
      });

      // READ ALL
      mockRepository.find.mockResolvedValue([mockArticle]);
      const allArticles = await controller.findAll();
      expect(allArticles).toEqual([mockArticle]);

      // READ ONE
      mockRepository.findOne.mockResolvedValue(mockArticle);
      const foundArticle = await controller.findOne('1');
      expect(foundArticle).toEqual(mockArticle);

      // READ MY ARTICLES
      mockRepository.find.mockResolvedValue([mockArticle]);
      const myArticles = await controller.findMyArticles(mockRequest);
      expect(myArticles).toEqual([mockArticle]);

      // UPDATE
      const updatedArticle = { ...mockArticle, ...updateArticleDto };
      mockRepository.findOne
        .mockResolvedValueOnce(mockArticle) // Ownership check
        .mockResolvedValueOnce(updatedArticle); // After update
      mockRepository.update.mockResolvedValue({ affected: 1 });
      
      const result = await controller.update('1', updateArticleDto, mockRequest);
      expect(result).toEqual(updatedArticle);

      // DELETE
      mockRepository.findOne.mockResolvedValue(mockArticle);
      mockRepository.delete.mockResolvedValue({ affected: 1 });
      await controller.remove('1', mockRequest);
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should handle article not found scenarios', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      
      const result = await controller.findOne('999');
      expect(result).toBeNull();
    });

    it('should handle unauthorized access to protected routes', async () => {
      const mockRequest = {
        user: { userId: 2 }, // Different user
      };

      const updateArticleDto: UpdateArticleDto = { title: 'Test' };
      mockRepository.findOne.mockResolvedValue(mockArticle);

      await expect(controller.update('1', updateArticleDto, mockRequest)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Security', () => {
    it('should protect create route with JWT Guard', () => {
      const guards = Reflect.getMetadata('__guards__', ArticleController.prototype.create);
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should protect update route with JWT Guard', () => {
      const guards = Reflect.getMetadata('__guards__', ArticleController.prototype.update);
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should protect delete route with JWT Guard', () => {
      const guards = Reflect.getMetadata('__guards__', ArticleController.prototype.remove);
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should allow public access to read routes', async () => {
      // These routes should not have guards
      const findAllMetadata = Reflect.getMetadata('__guards__', ArticleController.prototype.findAll);
      const findOneMetadata = Reflect.getMetadata('__guards__', ArticleController.prototype.findOne);
      
      expect(findAllMetadata).toBeUndefined();
      expect(findOneMetadata).toBeUndefined();
    });
  });
});
