import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { MediaService } from './media.service';
import { MediaKind } from './media.utils';

function parseOptionalInt(
  value: string | undefined,
  name: string,
): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new BadRequestException(
      `Parâmetro "${name}" deve ser um inteiro não negativo.`,
    );
  }
  return parsed;
}

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Upload de uma foto ou vídeo (multipart/form-data, campo "file").
   * Limites, nomes e destino são definidos em MediaModule (MulterModule).
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.mediaService.handleUpload(file);
  }

  /** Lista mídias (mais recentes primeiro). Query: limit, offset, type. */
  @Get('list')
  list(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('type') type?: string,
  ) {
    if (type !== undefined && type !== 'image' && type !== 'video') {
      throw new BadRequestException(
        'Parâmetro "type" deve ser image ou video.',
      );
    }
    return this.mediaService.list({
      limit: parseOptionalInt(limit, 'limit'),
      offset: parseOptionalInt(offset, 'offset'),
      type: type as MediaKind | undefined,
    });
  }

  /**
   * Entrega o arquivo. `res.sendFile` faz streaming do disco (sem carregar
   * o arquivo na RAM) e implementa Range/206, ETag e Last-Modified,
   * o que permite reproduzir e "pular" vídeos no app.
   */
  @Get('file/:year/:month/:filename')
  async getFile(
    @Param('year') year: string,
    @Param('month') month: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.mediaService.locateFile(year, month, filename);

    // Nomes são UUIDs imutáveis: o cache do cliente pode ser agressivo.
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.sendFile(
      file.filename,
      { root: file.directory, dotfiles: 'deny' },
      (error) => {
        // Cliente que cancela a conexão (ex.: fechar o vídeo) não é um erro.
        if (error && !res.headersSent) {
          res
            .status(500)
            .json({ statusCode: 500, message: 'Falha ao ler o arquivo.' });
        }
      },
    );
  }
}
