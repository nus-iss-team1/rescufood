import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DbModule } from '../db/db.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { ListingImageUploadService } from './images/listing-image-upload.service';
import { ListingImagesRepository } from './images/listing-images.repository';
import { ListingExpiryService } from './listing-expiry.service';
import { ListingsController } from './listings.controller';
import { ListingsRepository } from './listings.repository';
import { ListingsService } from './listings.service';

@Module({
  imports: [
    AuditModule,
    AuthModule,
    DbModule,
    NotificationsModule,
    StorageModule,
  ],
  controllers: [ListingsController],
  providers: [
    ListingsService,
    ListingsRepository,
    ListingImagesRepository,
    ListingImageUploadService,
    ListingExpiryService,
  ],
})
export class ListingsModule {}
