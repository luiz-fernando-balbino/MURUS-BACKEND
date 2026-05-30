import { Module } from '@nestjs/common';
import { MediaModule } from './media/media.module';

@Module({
  imports: [MediaModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
