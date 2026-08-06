import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DbModule } from '../db/db.module';
import { ListingsController } from './listings.controller';
import { ListingsRepository } from './listings.repository';
import { ListingsService } from './listings.service';

@Module({
  imports: [AuthModule, DbModule],
  controllers: [ListingsController],
  providers: [ListingsService, ListingsRepository],
})
export class ListingsModule {}
