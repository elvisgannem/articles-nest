import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ArticleService } from './article.service';
import { CreateArticleDto, UpdateArticleDto } from '../../dto/article.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RoleGuard, Roles } from '../../shared/guards/role.guard';

@Controller('articles')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin', 'editor')
  create(@Body() createArticleDto: CreateArticleDto, @Request() req) {
    return this.articleService.create(createArticleDto, req.user.userId);
  }

  @Get()
  findAll() {
    return this.articleService.findAll();
  }

  @Get('my-articles')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin', 'editor', 'reader')
  findMyArticles(@Request() req) {
    return this.articleService.findByAuthor(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.articleService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin', 'editor')
  update(@Param('id') id: string, @Body() updateArticleDto: UpdateArticleDto, @Request() req) {
    return this.articleService.update(+id, updateArticleDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin', 'editor')
  remove(@Param('id') id: string, @Request() req) {
    return this.articleService.remove(+id, req.user.userId);
  }
}
