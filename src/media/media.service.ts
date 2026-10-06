import {
  Injectable,
  Logger,
  NotFoundException,
  UnsupportedMediaTypeException,
  BadRequestException,
} from '@nestjs/common';
import { Dirent, promises as fs } from 'fs';
import * as path from 'path';
import { StorageService } from '../storage/storage.service';
import {
  MONTH_REGEX,
  MediaKind,
  SIGNATURE_BYTES,
  STORED_FILENAME_REGEX,
  YEAR_REGEX,
  getMediaKind,
  matchesSignature,
} from './media.utils';

export interface MediaItem {
  filename: string;
  /** Caminho relativo no armazenamento, ex.: /2026/05/<uuid>.jpg */
  urlPath: string;
  /** URL da rota que entrega o arquivo, ex.: /media/file/2026/05/<uuid>.jpg */
  url: string;
  type: MediaKind;
  size: number;
  /** Data/hora de gravação no servidor (ISO 8601). */
  uploadedAt: string;
  /** Pasta de origem no formato YYYY-MM. */
  period: string;
}

export interface MediaListResult {
  total: number;
  limit: number;
  offset: number;
  items: MediaItem[];
}

const LIST_CACHE_TTL_MS = 30_000;
export const DEFAULT_PAGE_SIZE = 100;
export const MAX_PAGE_SIZE = 500;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private cache: { items: MediaItem[]; expiresAt: number } | null = null;

  constructor(private readonly storage: StorageService) {}

  /**
   * Chamado após o Multer gravar o arquivo. Confere se o conteúdo real
   * corresponde à extensão; se não, apaga o arquivo e rejeita o upload.
   */
  async handleUpload(file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException(
        'Nenhum arquivo enviado. Use o campo multipart "file".',
      );
    }

    const extension = path.extname(file.filename).toLowerCase();
    const kind = getMediaKind(extension);
    const head = await this.readHead(file.path);

    if (!kind || !matchesSignature(extension, head)) {
      await fs.unlink(file.path).catch(() => undefined);
      this.logger.warn(
        `Upload rejeitado (conteúdo incompatível com ${extension}): ${file.originalname}`,
      );
      throw new UnsupportedMediaTypeException(
        'O conteúdo do arquivo não corresponde a um formato de mídia suportado.',
      );
    }

    this.cache = null; // nova mídia: a próxima listagem precisa reler o disco

    const relative = this.toRelativePath(file.path);
    this.logger.log(
      `Upload concluído: ${relative} (${file.size} bytes, ${kind})`,
    );

    return {
      message: 'Upload realizado com sucesso!',
      filename: file.filename,
      path: relative,
      url: `/media/file${relative}`,
      type: kind,
      size: file.size,
    };
  }

  /** Lista mídias, mais recentes primeiro, com paginação. */
  async list(params: {
    limit?: number;
    offset?: number;
    type?: MediaKind;
  }): Promise<MediaListResult> {
    const limit = Math.min(
      Math.max(params.limit ?? DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE,
    );
    const offset = Math.max(params.offset ?? 0, 0);

    let items = await this.getAllItems();
    if (params.type) {
      items = items.filter((item) => item.type === params.type);
    }

    return {
      total: items.length,
      limit,
      offset,
      items: items.slice(offset, offset + limit),
    };
  }

  /** Confirma que o arquivo existe e retorna o necessário para entregá-lo. */
  async locateFile(year: string, month: string, filename: string) {
    const resolved = this.storage.resolveMediaFile(year, month, filename);
    try {
      const stat = await fs.stat(resolved.absolutePath);
      if (!stat.isFile()) throw new Error('não é arquivo');
    } catch {
      throw new NotFoundException('Mídia não encontrada.');
    }
    return resolved;
  }

  // --------------------------------------------------------------------

  private async readHead(filePath: string): Promise<Buffer> {
    const handle = await fs.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(SIGNATURE_BYTES);
      const { bytesRead } = await handle.read(buffer, 0, SIGNATURE_BYTES, 0);
      return buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  }

  private toRelativePath(absolutePath: string): string {
    const relative = path.relative(this.storage.rootPath, absolutePath);
    return '/' + relative.split(path.sep).join('/');
  }

  private async getAllItems(): Promise<MediaItem[]> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.items;
    }
    const items = await this.scanStorage();
    this.cache = { items, expiresAt: now + LIST_CACHE_TTL_MS };
    return items;
  }

  private async safeReaddir(dir: string): Promise<Dirent[]> {
    try {
      return await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      this.logger.error(`Falha ao ler "${dir}": ${String(error)}`);
      return [];
    }
  }

  /** Varre ANO/MÊS no disco de forma assíncrona (não bloqueia o servidor). */
  private async scanStorage(): Promise<MediaItem[]> {
    const items: MediaItem[] = [];
    const root = this.storage.rootPath;

    const years = await this.safeReaddir(root);

    for (const yearEntry of years) {
      if (!yearEntry.isDirectory() || !YEAR_REGEX.test(yearEntry.name))
        continue;
      const yearPath = path.join(root, yearEntry.name);
      const months = await this.safeReaddir(yearPath);

      for (const monthEntry of months) {
        if (!monthEntry.isDirectory() || !MONTH_REGEX.test(monthEntry.name)) {
          continue;
        }
        const monthPath = path.join(yearPath, monthEntry.name);
        const files = await this.safeReaddir(monthPath);

        const monthItems = await Promise.all(
          files
            .filter((f) => f.isFile() && STORED_FILENAME_REGEX.test(f.name))
            .map(async (f): Promise<MediaItem | null> => {
              const kind = getMediaKind(path.extname(f.name));
              if (!kind) return null;
              try {
                const stat = await fs.stat(path.join(monthPath, f.name));
                const urlPath = `/${yearEntry.name}/${monthEntry.name}/${f.name}`;
                return {
                  filename: f.name,
                  urlPath,
                  url: `/media/file${urlPath}`,
                  type: kind,
                  size: stat.size,
                  uploadedAt: stat.mtime.toISOString(),
                  period: `${yearEntry.name}-${monthEntry.name}`,
                };
              } catch {
                return null; // arquivo removido durante a varredura
              }
            }),
        );
        for (const item of monthItems) if (item) items.push(item);
      }
    }

    // Ordem cronológica real (a ordem de readdir não é confiável e os
    // nomes são UUIDs aleatórios): mais recentes primeiro.
    items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    return items;
  }
}
