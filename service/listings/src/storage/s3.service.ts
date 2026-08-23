import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly cdnUrl: string;

  constructor(config: ConfigService) {
    this.client = new S3Client({ region: config.getOrThrow('AWS_REGION') });
    this.bucket = config.getOrThrow('S3_BUCKET_NAME');
    this.cdnUrl = config.getOrThrow('LISTING_IMAGES_CDN_URL');
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  getImageUrl(key: string): string {
    return `${this.cdnUrl}/${key}`;
  }
}
