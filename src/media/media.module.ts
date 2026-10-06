import {
  BadRequestException,
  Module,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import * as path from 'path';
import { EnvVars } from '../config/env.validation';
import { StorageModule } from '../storage/storage.module';
import { StorageService } from '../storage/storage.service';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { getMediaKind, isPlausibleMimeType } from './media.utils';

@Module({
  imports: [
    StorageModule,
    MulterModule.registerAsync({
      imports: [ConfigModule, StorageModule],
      inject: [ConfigService, StorageService],
      useFactory: (
        config: ConfigService<EnvVars, true>,
        storage: StorageService,
      ) => ({
        storage: diskStorage({
          destination: (_req, _file, cb) => {
            storage
              .ensureUploadDir()
              .then((dir) => cb(null, dir))
              .catch((error: Error) => cb(error, ''));
          },
          filename: (_req, file, cb) => {
            // Nome 100% gerado pelo servidor. A extensão já foi validada
            // pelo fileFilter (nunca confiamos no nome original).
            const extension = path.extname(file.originalname).toLowerCase();
            cb(null, `${randomUUID()}${extension}`);
          },
        }),
        fileFilter: (_req, file, cb) => {
          const extension = path.extname(file.originalname);
          if (!getMediaKind(extension)) {
            return cb(
              new UnsupportedMediaTypeException(
                'Extensão não suportada. Use jpg, jpeg, png, webp, gif, heic, heif, mp4, m4v, mov ou webm.',
              ),
              false,
            );
          }
          if (!isPlausibleMimeType(file.mimetype)) {
            return cb(
              new BadRequestException('Content-Type inválido para mídia.'),
              false,
            );
          }
          cb(null, true);
        },
        limits: {
          fileSize:
            config.get('MAX_FILE_SIZE_MB', { infer: true }) * 1024 * 1024,
          files: 1,
        },
      }),
    }),
  ],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
