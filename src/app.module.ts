import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './shared/entities/user.entity';
import { Article } from './shared/entities/article.entity';
import { Permission } from './shared/entities/permission.entity';
import { UserModule } from './modules/users/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ArticleModule } from './modules/articles/article.module';
import { PermissionModule } from './shared/modules/permission.module';
import { AppInitializationService } from './shared/services/app-initialization.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'db',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || 'articles_db',
      entities: [User, Article, Permission],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User]),
    UserModule,
    AuthModule,
    ArticleModule,
    PermissionModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppInitializationService],
})
export class AppModule {}
