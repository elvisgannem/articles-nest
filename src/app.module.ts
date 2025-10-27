import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './shared/entities/user.entity';
import { Article } from './shared/entities/article.entity';
import { UserController } from './modules/users/user.controller';
import { UserService } from './modules/users/user.service';
import { AuthModule } from './modules/auth/auth.module';
import { ArticleModule } from './modules/articles/article.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'db',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || 'articles_db',
      entities: [User, Article],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User]),
    AuthModule,
    ArticleModule,
  ],
  controllers: [AppController, UserController],
  providers: [AppService, UserService],
})
export class AppModule {}
