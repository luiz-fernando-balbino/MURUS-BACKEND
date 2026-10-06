import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createHash, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { EnvVars } from '../config/env.validation';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Guard global: exige "Authorization: Bearer <API_TOKEN>" quando API_TOKEN
 * está configurado. É uma segunda camada: a primeira é a rede (Tailscale +
 * firewall). Se API_TOKEN não estiver definido (apenas em desenvolvimento),
 * todas as rotas ficam abertas e um aviso é emitido na inicialização.
 */
@Injectable()
export class ApiTokenGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(ApiTokenGuard.name);
  private readonly expectedDigest: Buffer | null;

  constructor(
    private readonly reflector: Reflector,
    config: ConfigService<EnvVars, true>,
  ) {
    const token = config.get('API_TOKEN', { infer: true });
    this.expectedDigest = token ? this.digest(token) : null;
  }

  onModuleInit(): void {
    if (!this.expectedDigest) {
      this.logger.warn(
        'API_TOKEN não definido: a API está SEM autenticação (aceitável apenas em desenvolvimento).',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic || !this.expectedDigest) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Token de acesso ausente ou malformado.');
    }
    // Comparamos digests SHA-256 (tamanho fixo) em tempo constante.
    if (!timingSafeEqual(this.digest(token), this.expectedDigest)) {
      this.logger.warn(`Token inválido recebido de ${request.ip}`);
      throw new UnauthorizedException('Token de acesso inválido.');
    }
    return true;
  }

  private digest(value: string): Buffer {
    return createHash('sha256').update(value).digest();
  }
}
