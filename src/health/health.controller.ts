import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/public.decorator';
import { StorageService } from '../storage/storage.service';

@Controller('health')
export class HealthController {
  constructor(private readonly storage: StorageService) {}

  /** Verificação de saúde para monitoramento (PM2, scripts, app móvel). */
  @Public()
  @Get()
  async check() {
    const storageOk = await this.storage.isAvailable();
    return {
      status: storageOk ? 'ok' : 'degraded',
      storage: storageOk ? 'ok' : 'unavailable',
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
