import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DbModule } from '../db/db.module';
import { StorageModule } from '../storage/storage.module';
import { ListingImageUploadService } from './listing-image-upload.service';
import { ListingImagesRepository } from './listing-images.repository';
import { ListingsController } from './listings.controller';
import { ListingsRepository } from './listings.repository';
import { ListingsService } from './listings.service';

@Module({
  imports: [AuthModule, DbModule, StorageModule],
  controllers: [ListingsController],
  providers: [
    ListingsService,
    ListingsRepository,
    ListingImagesRepository,
    ListingImageUploadService,
  ],
})
export class ListingsModule {}
