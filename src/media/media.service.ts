import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MediaService {
  // Caminho absoluto do seu cartão SD mapeado na ficha técnica
  private readonly basePath = '/home/luizfb/Projects/galeria-sd/galeria-app';

  constructor() {
    // Garante que a pasta raiz do app no cartão SD exista ao iniciar o serviço
    // Nota: Durante os testes locais no Windows, você pode rodar alterando temporariamente 
    // este caminho para algo local como 'C:\\temp\\galeria-app'
    if (process.platform !== 'win32' && !fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  getUploadPath(): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    // Adiciona um zero à esquerda se o mês for menor que 10 (ex: 05)
    const month = (now.getMonth() + 1).toString().padStart(2, '0');

    // Cria o caminho dinâmico: /home/luizfb/Projects/galeria-sd/galeria-app/ANO/MES
    const targetPath = path.join(this.basePath, year, month);

    // Se as pastas do ano/mês não existirem, cria dinamicamente
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }

    return targetPath;
  }

  handleUpload(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado ou formato inválido.');
    }

    // Retorna uma resposta de sucesso para o aplicativo móvel
    return {
      message: 'Upload realizado com sucesso!',
      filename: file.filename,
      path: file.path.replace(this.basePath, ''), // Retorna o caminho relativo (ex: /2026/05/nome.jpg)
      size: file.size,
    };
  }
}