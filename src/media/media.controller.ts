import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { diskStorage } from 'multer';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid'; // Vamos precisar instalar essa biblioteca para gerar nomes únicos

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // Instancia dinamicamente o serviço para buscar a pasta correta (Ano/Mês)
          const mediaService = new MediaService();
          const uploadPath = mediaService.getUploadPath();
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          // Mantém a extensão original (ex: .jpg, .mp4) e gera um nome único aleatório via UUID
          const fileExtension = path.extname(file.originalname);
          const uniqueFilename = `${uuidv4()}${fileExtension}`;
          cb(null, uniqueFilename);
        },
      }),
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.mediaService.handleUpload(file);
  }
}