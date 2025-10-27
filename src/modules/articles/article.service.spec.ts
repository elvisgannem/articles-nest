import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ArticleService } from './article.service';
import { Article } from '../../shared/entities/article.entity';
import { CreateArticleDto, UpdateArticleDto } from '../../dto/article.dto';

describe('ArticleService', () => {
  let service: ArticleService;
  let repository: Repository<Article>;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: getRepositoryToken(Article),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
    repository = module.get<Repository<Article>>(getRepositoryToken(Article));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new article', async () => {
      const createArticleDto: CreateArticleDto = {
        title: 'Meu Primeiro Artigo',
        content: 'Este é o conteúdo do meu primeiro artigo.',
      };

      mockRepository.create.mockReturnValue(mockArticle);
      mockRepository.save.mockResolvedValue(mockArticle);

      const result = await service.create(createArticleDto, 1);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createArticleDto,
        authorId: 1,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockArticle);
      expect(result).toEqual(mockArticle);
    });
  });

  describe('findAll', () => {
    it('should return all articles with author relations', async () => {
      const articles = [mockArticle];
      mockRepository.find.mockResolvedValue(articles);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        relations: ['author'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(articles);
    });
  });

  describe('findOne', () => {
    it('should return an article by id with author relation', async () => {
      const articleId = 1;
      mockRepository.findOne.mockResolvedValue(mockArticle);

      const result = await service.findOne(articleId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: articleId },
        relations: ['author'],
      });
      expect(result).toEqual(mockArticle);
    });

    it('should return null when article not found', async () => {
      const articleId = 999;
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(articleId);

      expect(result).toBeNull();
    });
  });

  describe('findByAuthor', () => {
    it('should return articles by author', async () => {
      const authorId = 1;
      const articles = [mockArticle];
      mockRepository.find.mockResolvedValue(articles);

      const result = await service.findByAuthor(authorId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { authorId },
        relations: ['author'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(articles);
    });
  });

  describe('update', () => {
    it('should update an article when user is the author', async () => {
      const articleId = 1;
      const userId = 1;
      const updateArticleDto: UpdateArticleDto = {
        title: 'Título Atualizado',
      };
      const updatedArticle = { ...mockArticle, ...updateArticleDto };

      mockRepository.findOne
        .mockResolvedValueOnce(mockArticle) // First call for ownership check
        .mockResolvedValueOnce(updatedArticle); // Second call after update
      mockRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.update(articleId, updateArticleDto, userId);

      expect(mockRepository.update).toHaveBeenCalledWith(articleId, updateArticleDto);
      expect(result).toEqual(updatedArticle);
    });

    it('should throw NotFoundException when article not found', async () => {
      const articleId = 999;
      const userId = 1;
      const updateArticleDto: UpdateArticleDto = { title: 'Test' };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(articleId, updateArticleDto, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      const articleId = 1;
      const userId = 2; // Different user
      const updateArticleDto: UpdateArticleDto = { title: 'Test' };

      mockRepository.findOne.mockResolvedValue(mockArticle);

      await expect(service.update(articleId, updateArticleDto, userId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete an article when user is the author', async () => {
      const articleId = 1;
      const userId = 1;

      mockRepository.findOne.mockResolvedValue(mockArticle);
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(articleId, userId);

      expect(mockRepository.delete).toHaveBeenCalledWith(articleId);
    });

    it('should throw NotFoundException when article not found', async () => {
      const articleId = 999;
      const userId = 1;

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(articleId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      const articleId = 1;
      const userId = 2; // Different user

      mockRepository.findOne.mockResolvedValue(mockArticle);

      await expect(service.remove(articleId, userId)).rejects.toThrow(ForbiddenException);
    });
  });
});
