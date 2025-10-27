import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../../shared/entities/article.entity';
import { CreateArticleDto, UpdateArticleDto } from '../../dto/article.dto';

@Injectable()
export class ArticleService {
  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
  ) {}

  async create(createArticleDto: CreateArticleDto, authorId: number): Promise<Article> {
    const article = this.articleRepository.create({
      ...createArticleDto,
      authorId,
    });
    return this.articleRepository.save(article);
  }

  async findAll(): Promise<Article[]> {
    return this.articleRepository.find({
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Article | null> {
    return this.articleRepository.findOne({
      where: { id },
      relations: ['author'],
    });
  }

  async findByAuthor(authorId: number): Promise<Article[]> {
    return this.articleRepository.find({
      where: { authorId },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: number, updateArticleDto: UpdateArticleDto, userId: number): Promise<Article | null> {
    const article = await this.findOne(id);
    if (!article) {
      throw new NotFoundException('Artigo não encontrado');
    }

    if (article.authorId !== userId) {
      throw new ForbiddenException('Você só pode editar seus próprios artigos');
    }

    await this.articleRepository.update(id, updateArticleDto);
    return this.findOne(id);
  }

  async remove(id: number, userId: number): Promise<void> {
    const article = await this.findOne(id);
    if (!article) {
      throw new NotFoundException('Artigo não encontrado');
    }

    if (article.authorId !== userId) {
      throw new ForbiddenException('Você só pode excluir seus próprios artigos');
    }

    await this.articleRepository.delete(id);
  }
}
