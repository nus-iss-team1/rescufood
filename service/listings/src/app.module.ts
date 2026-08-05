import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ListingsModule } from './listings/listings.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ListingsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
