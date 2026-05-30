import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MediaService {
  // Caminho absoluto
  // private readonly basePath = '/home/luizfb/Projects/galeria-sd/galeria-app';

  // Altere temporariamente para testar no Windows:
  private readonly basePath = 'C:\\murus-teste';

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

  listImages() {
    const imagesList: any[] = [];
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];

    // Se a pasta base não existir, retorna a lista vazia de segurança
    if (!fs.existsSync(this.basePath)) {
      return imagesList;
    }

    // 1. Lê as pastas dos ANOS (ex: 2026)
    const years = fs.readdirSync(this.basePath);

    for (const year of years) {
      const yearPath = path.join(this.basePath, year);

      // Garante que é um diretório/pasta antes de entrar
      if (fs.statSync(yearPath).isDirectory()) {
        
        // 2. Lê as pastas dos MESES (ex: 05)
        const months = fs.readdirSync(yearPath);

        for (const month of months) {
          const monthPath = path.join(yearPath, month);

          if (fs.statSync(monthPath).isDirectory()) {
            
            // 3. Lê os arquivos físicos das FOTOS guardados no mês
            const files = fs.readdirSync(monthPath);

            for (const file of files) {
              const fileExtension = path.extname(file).toLowerCase();

              // Filtra apenas imagens válidas (.jpg, .jpeg, .png)
              if (allowedExtensions.includes(fileExtension)) {
                
                // Monta o caminho de leitura relativo unificado (ex: /2026/05/uuid.jpg)
                // Usamos expressões regulares para garantir barras normais mesmo no Windows
                const relativeUrlPath = `/${year}/${month}/${file}`.replace(/\\/g, '/');

                imagesList.push({
                  filename: file,
                  urlPath: relativeUrlPath,
                  uploadedAt: `${year}-${month}`,
                });
              }
            }
          }
        }
      }
    }

    // Retorna a lista invertida (reversada) para que as fotos mais recentes fiquem no topo da galeria!
    return imagesList.reverse();
  }
}