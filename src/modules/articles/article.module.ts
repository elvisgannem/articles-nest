import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../../shared/entities/article.entity';
import { User } from '../../shared/entities/user.entity';
import { ArticleService } from './article.service';
import { ArticleController } from './article.controller';
import { RoleGuard } from '../../shared/guards/role.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Article, User])],
  providers: [ArticleService, RoleGuard],
  controllers: [ArticleController],
  exports: [ArticleService],
})
export class ArticleModule {}
