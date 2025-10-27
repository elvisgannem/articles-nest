import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { Article } from '../../shared/entities/article.entity';
import { User } from '../../shared/entities/user.entity';
import { Permission } from '../../shared/entities/permission.entity';
import { CreateArticleDto, UpdateArticleDto } from '../../dto/article.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../../shared/guards/role.guard';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('Article Integration', () => {
  let controller: ArticleController;
  let service: ArticleService;
  let articleRepository: Repository<Article>;
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

  const mockArticle: Article = {
    id: 1,
    title: 'Test Article',
    content: 'This is a test article content.',
    authorId: 1,
    author: mockAdminUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const mockRoleGuard = {
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
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RoleGuard)
      .useValue(mockRoleGuard)
      .compile();

    controller = module.get<ArticleController>(ArticleController);
    service = module.get<ArticleService>(ArticleService);
    articleRepository = module.get<Repository<Article>>(getRepositoryToken(Article));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    it('should complete full article flow: create -> read -> update -> delete', async () => {
      const createArticleDto: CreateArticleDto = {
        title: 'New Article',
        content: 'Content of the new article.',
      };
      const updateArticleDto: UpdateArticleDto = {
        title: 'Updated Article',
      };

      mockUserRepository.findOne.mockResolvedValue(mockAdminUser);
      mockRepository.create.mockReturnValue(mockArticle);
      mockRepository.save.mockResolvedValue(mockArticle);
      mockRepository.findOne.mockResolvedValue(mockArticle);
      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      const mockRequest = { user: { userId: mockAdminUser.id } };

      // Create
      const createdArticle = await controller.create(createArticleDto, mockRequest);
      expect(createdArticle).toEqual(mockArticle);
      expect(mockRepository.create).toHaveBeenCalledWith({ ...createArticleDto, authorId: mockAdminUser.id });
      expect(mockRepository.save).toHaveBeenCalledWith(mockArticle);

      // Read All
      mockRepository.find.mockResolvedValue([mockArticle]);
      const allArticles = await controller.findAll();
      expect(allArticles).toEqual([mockArticle]);
      expect(mockRepository.find).toHaveBeenCalledWith({ relations: ['author'], order: { createdAt: 'DESC' } });

      // Read One
      const foundArticle = await controller.findOne(String(mockArticle.id));
      expect(foundArticle).toEqual(mockArticle);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: mockArticle.id }, relations: ['author'] });

      // Update
      const updatedArticle = { ...mockArticle, ...updateArticleDto };
      mockRepository.findOne.mockResolvedValueOnce(mockArticle); // For update's findOne
      mockRepository.findOne.mockResolvedValueOnce(updatedArticle); // For update's return
      const resultUpdate = await controller.update(String(mockArticle.id), updateArticleDto, mockRequest);
      expect(resultUpdate).toEqual(updatedArticle);
      expect(mockRepository.update).toHaveBeenCalledWith(mockArticle.id, updateArticleDto);

      // Delete
      mockRepository.findOne.mockResolvedValueOnce(mockArticle); // For remove's findOne
      await controller.remove(String(mockArticle.id), mockRequest);
      expect(mockRepository.delete).toHaveBeenCalledWith(mockArticle.id);
    });

    it('should handle article not found scenarios', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(controller.findOne('999')).resolves.toBeNull();
    });
  });

  describe('Permission-Based Access Control', () => {
    describe('Admin User (Full Access)', () => {
      beforeEach(() => {
        mockUserRepository.findOne.mockResolvedValue(mockAdminUser);
        mockRepository.create.mockReturnValue(mockArticle);
        mockRepository.save.mockResolvedValue(mockArticle);
        mockRepository.findOne.mockResolvedValue(mockArticle);
        mockRepository.update.mockResolvedValue({ affected: 1 });
        mockRepository.delete.mockResolvedValue({ affected: 1 });
      });

      it('should allow admin to create articles', async () => {
        const createArticleDto: CreateArticleDto = {
          title: 'Admin Article',
          content: 'Article created by admin.',
        };
        const mockRequest = { user: { userId: mockAdminUser.id } };

        const result = await controller.create(createArticleDto, mockRequest);
        expect(result).toEqual(mockArticle);
        expect(mockRepository.create).toHaveBeenCalledWith({ ...createArticleDto, authorId: mockAdminUser.id });
      });

      it('should allow admin to update any article', async () => {
        const updateArticleDto: UpdateArticleDto = { title: 'Updated by Admin' };
        const mockRequest = { user: { userId: mockAdminUser.id } };

        const updatedArticle = { ...mockArticle, ...updateArticleDto };
        mockRepository.findOne.mockResolvedValueOnce(mockArticle);
        mockRepository.findOne.mockResolvedValueOnce(updatedArticle);

        const result = await controller.update('1', updateArticleDto, mockRequest);
        expect(result).toEqual(updatedArticle);
      });

      it('should allow admin to delete any article', async () => {
        const mockRequest = { user: { userId: mockAdminUser.id } };

        await controller.remove('1', mockRequest);
        expect(mockRepository.delete).toHaveBeenCalledWith(1);
      });

      it('should allow admin to view my articles', async () => {
        mockRepository.find.mockResolvedValue([mockArticle]);
        const mockRequest = { user: { userId: mockAdminUser.id } };

        const result = await controller.findMyArticles(mockRequest);
        expect(result).toEqual([mockArticle]);
        expect(mockRepository.find).toHaveBeenCalledWith({ where: { authorId: mockAdminUser.id }, relations: ['author'], order: { createdAt: 'DESC' } });
      });
    });

    describe('Editor User (Article Management)', () => {
      beforeEach(() => {
        mockUserRepository.findOne.mockResolvedValue(mockEditorUser);
        mockRepository.create.mockReturnValue(mockArticle);
        mockRepository.save.mockResolvedValue(mockArticle);
        mockRepository.findOne.mockResolvedValue(mockArticle);
        mockRepository.update.mockResolvedValue({ affected: 1 });
        mockRepository.delete.mockResolvedValue({ affected: 1 });
      });

      it('should allow editor to create articles', async () => {
        const createArticleDto: CreateArticleDto = {
          title: 'Editor Article',
          content: 'Article created by editor.',
        };
        const mockRequest = { user: { userId: mockEditorUser.id } };

        const result = await controller.create(createArticleDto, mockRequest);
        expect(result).toEqual(mockArticle);
        expect(mockRepository.create).toHaveBeenCalledWith({ ...createArticleDto, authorId: mockEditorUser.id });
      });

      it('should allow editor to update their own articles', async () => {
        const editorArticle = { ...mockArticle, authorId: mockEditorUser.id, author: mockEditorUser };
        const updateArticleDto: UpdateArticleDto = { title: 'Updated by Editor' };
        const mockRequest = { user: { userId: mockEditorUser.id } };

        mockRepository.findOne.mockResolvedValueOnce(editorArticle);
        mockRepository.findOne.mockResolvedValueOnce({ ...editorArticle, ...updateArticleDto });

        const result = await controller.update('1', updateArticleDto, mockRequest);
        expect(result).toBeDefined();
        expect(result!.title).toBe('Updated by Editor');
      });

      it('should prevent editor from updating other users articles', async () => {
        const updateArticleDto: UpdateArticleDto = { title: 'Unauthorized Update' };
        const mockRequest = { user: { userId: mockEditorUser.id } };

        mockRepository.findOne.mockResolvedValue(mockArticle); // Article belongs to admin

        await expect(controller.update('1', updateArticleDto, mockRequest))
          .rejects.toThrow(ForbiddenException);
      });

      it('should allow editor to delete their own articles', async () => {
        const editorArticle = { ...mockArticle, authorId: mockEditorUser.id, author: mockEditorUser };
        const mockRequest = { user: { userId: mockEditorUser.id } };

        mockRepository.findOne.mockResolvedValue(editorArticle);

        await controller.remove('1', mockRequest);
        expect(mockRepository.delete).toHaveBeenCalledWith(1);
      });

      it('should prevent editor from deleting other users articles', async () => {
        const mockRequest = { user: { userId: mockEditorUser.id } };

        mockRepository.findOne.mockResolvedValue(mockArticle); // Article belongs to admin

        await expect(controller.remove('1', mockRequest))
          .rejects.toThrow(ForbiddenException);
      });
    });

    describe('Reader User (Read Only)', () => {
      beforeEach(() => {
        mockUserRepository.findOne.mockResolvedValue(mockReaderUser);
        mockRepository.find.mockResolvedValue([mockArticle]);
        mockRepository.findOne.mockResolvedValue(mockArticle);
      });

      it('should allow reader to view my articles', async () => {
        const mockRequest = { user: { userId: mockReaderUser.id } };

        const result = await controller.findMyArticles(mockRequest);
        expect(result).toEqual([mockArticle]);
        expect(mockRepository.find).toHaveBeenCalledWith({ where: { authorId: mockReaderUser.id }, relations: ['author'], order: { createdAt: 'DESC' } });
      });

      it('should allow reader to view all articles (public)', async () => {
        const result = await controller.findAll();
        expect(result).toEqual([mockArticle]);
        expect(mockRepository.find).toHaveBeenCalledWith({ relations: ['author'], order: { createdAt: 'DESC' } });
      });

      it('should allow reader to view specific article (public)', async () => {
        const result = await controller.findOne('1');
        expect(result).toEqual(mockArticle);
        expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 }, relations: ['author'] });
      });
    });

    describe('Regular User (No Permissions)', () => {
      beforeEach(() => {
        mockUserRepository.findOne.mockResolvedValue(mockRegularUser);
        mockRepository.find.mockResolvedValue([mockArticle]);
        mockRepository.findOne.mockResolvedValue(mockArticle);
      });


      it('should allow regular user to view all articles (public)', async () => {
        const result = await controller.findAll();
        expect(result).toEqual([mockArticle]);
        expect(mockRepository.find).toHaveBeenCalledWith({ relations: ['author'], order: { createdAt: 'DESC' } });
      });

      it('should allow regular user to view specific article (public)', async () => {
        const result = await controller.findOne('1');
        expect(result).toEqual(mockArticle);
        expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 }, relations: ['author'] });
      });
    });
  });

  describe('Security Guards', () => {
    it('should protect create route with JWT and Role Guards', () => {
      const guards = Reflect.getMetadata('__guards__', ArticleController.prototype.create);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RoleGuard);
    });

    it('should protect update route with JWT and Role Guards', () => {
      const guards = Reflect.getMetadata('__guards__', ArticleController.prototype.update);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RoleGuard);
    });

    it('should protect delete route with JWT and Role Guards', () => {
      const guards = Reflect.getMetadata('__guards__', ArticleController.prototype.remove);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RoleGuard);
    });

    it('should protect my-articles route with JWT and Role Guards', () => {
      const guards = Reflect.getMetadata('__guards__', ArticleController.prototype.findMyArticles);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RoleGuard);
    });

    it('should allow public access to read routes', async () => {
      // These routes should not have guards
      const findAllMetadata = Reflect.getMetadata('__guards__', ArticleController.prototype.findAll);
      const findOneMetadata = Reflect.getMetadata('__guards__', ArticleController.prototype.findOne);

      expect(findAllMetadata).toBeUndefined();
      expect(findOneMetadata).toBeUndefined();
    });
  });

  describe('Role Decorators', () => {
    it('should have correct roles for create route', () => {
      const roles = Reflect.getMetadata('roles', ArticleController.prototype.create);
      expect(roles).toEqual(['admin', 'editor']);
    });

    it('should have correct roles for update route', () => {
      const roles = Reflect.getMetadata('roles', ArticleController.prototype.update);
      expect(roles).toEqual(['admin', 'editor']);
    });

    it('should have correct roles for delete route', () => {
      const roles = Reflect.getMetadata('roles', ArticleController.prototype.remove);
      expect(roles).toEqual(['admin', 'editor']);
    });

    it('should have correct roles for my-articles route', () => {
      const roles = Reflect.getMetadata('roles', ArticleController.prototype.findMyArticles);
      expect(roles).toEqual(['admin', 'editor', 'reader']);
    });
  });
});