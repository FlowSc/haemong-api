import { Injectable, OnModuleInit } from '@nestjs/common';
import { getSupabaseAdminClient } from '../../config/supabase.config';
import * as crypto from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly bucketName = 'generate-images';

  async onModuleInit() {
    // 모듈 초기화 시 버킷 생성
    await this.createBucketIfNotExists();
  }

  async uploadImageFromUrl(
    imageUrl: string,
    userId: string,
    chatRoomId: string,
    maxRetries: number = 3,
  ): Promise<string | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `Attempting to upload image (attempt ${attempt}/${maxRetries})`,
        );

        // DALL-E URL에서 이미지 다운로드 (30초 타임아웃)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(imageUrl, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch image from URL: ${response.status} ${response.statusText}`,
          );
        }

        const contentType = response.headers.get('content-type') || 'image/png';
        const imageBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(imageBuffer);

        // 파일 크기 확인 (5MB 제한)
        if (uint8Array.length > 5 * 1024 * 1024) {
          throw new Error('Image file size exceeds 5MB limit');
        }

        // 파일명 생성 (UUID + timestamp)
        const fileId = crypto.randomUUID();
        const timestamp = Date.now();
        const fileExtension = contentType.includes('jpeg') ? 'jpg' : 'png';
        const fileName = `${userId}/${chatRoomId}/${timestamp}_${fileId}.${fileExtension}`;

        // Supabase Storage에 업로드
        const { error } = await getSupabaseAdminClient()
          .storage.from(this.bucketName)
          .upload(fileName, uint8Array, {
            contentType,
            cacheControl: '3600',
            upsert: false, // 같은 파일명이면 실패하도록
          });

        if (error) {
          throw new Error(`Storage upload error: ${error.message}`);
        }

        // 공개 URL 생성
        const { data: publicUrlData } = getSupabaseAdminClient()
          .storage.from(this.bucketName)
          .getPublicUrl(fileName);

        console.log(`Image uploaded successfully: ${publicUrlData.publicUrl}`);
        console.log(`Bucket: ${this.bucketName}, FileName: ${fileName}`);

        // URL 접근 테스트 및 graceful fallback
        try {
          const testResponse = await fetch(publicUrlData.publicUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000), // 5초 타임아웃
          });

          if (testResponse.ok) {
            console.log('Public URL is accessible');
            return publicUrlData.publicUrl;
          } else {
            console.warn(
              `Public URL returned ${testResponse.status}, falling back to signed URL`,
            );
            return await this.createSignedUrl(fileName);
          }
        } catch (testError) {
          console.warn(
            'Public URL test failed, falling back to signed URL:',
            testError.message,
          );
          return await this.createSignedUrl(fileName);
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`Upload attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          // 지수 백오프: 1초, 2초, 4초
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`Retrying in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    console.error(
      `Failed to upload image after ${maxRetries} attempts:`,
      lastError,
    );
    return null;
  }

  async deleteImage(filePath: string): Promise<boolean> {
    try {
      const { error } = await getSupabaseAdminClient()
        .storage.from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('Storage delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  async createBucketIfNotExists(): Promise<void> {
    try {
      // 버킷 존재 여부 확인
      const { data: buckets, error: listError } =
        await getSupabaseAdminClient().storage.listBuckets();

      if (listError) {
        console.error('Error listing buckets:', listError);
        return;
      }

      console.log(
        'Available buckets:',
        buckets?.map((b) => b.name),
      );
      const bucketExists = buckets?.some(
        (bucket) => bucket.name === this.bucketName,
      );
      console.log(`Bucket '${this.bucketName}' exists:`, bucketExists);

      if (!bucketExists) {
        // 버킷 생성 (공개 버킷으로 설정)
        const { error: createError } =
          await getSupabaseAdminClient().storage.createBucket(this.bucketName, {
            public: true,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
            fileSizeLimit: 5242880, // 5MB
          });

        if (createError) {
          console.error('Error creating bucket:', createError);
        } else {
          console.log(`Bucket '${this.bucketName}' created successfully`);
          // 버킷 생성 후 public access policy 설정
          await this.setupBucketPolicies();
        }
      } else {
        // 기존 버킷의 설정 확인 및 정책 업데이트
        const { data: bucketInfo, error: getError } =
          await getSupabaseAdminClient().storage.getBucket(this.bucketName);

        console.log('Bucket info:', bucketInfo);
        if (getError) {
          console.error('Error getting bucket info:', getError);
        }

        // 기존 버킷도 정책 확인/업데이트
        await this.setupBucketPolicies();
      }
    } catch (error) {
      console.error('Error in createBucketIfNotExists:', error);
    }
  }

  private async setupBucketPolicies(): Promise<void> {
    try {
      const client = getSupabaseAdminClient();

      // Storage objects에 대한 public read access 정책 생성
      const policyName = `public_read_${this.bucketName.replace(/-/g, '_')}`;

      // SQL을 직접 실행하여 RLS 정책 생성
      const { error: sqlError } = await client.rpc('exec_sql', {
        sql: `
          DO $$
          BEGIN
            -- Create policy if it doesn't exist
            IF NOT EXISTS (
              SELECT 1 FROM pg_policies 
              WHERE schemaname = 'storage' 
              AND tablename = 'objects' 
              AND policyname = '${policyName}'
            ) THEN
              EXECUTE format('CREATE POLICY %I ON storage.objects FOR SELECT USING (bucket_id = %L)', '${policyName}', '${this.bucketName}');
            END IF;
          END
          $$;
        `,
      });

      if (sqlError) {
        console.log('RLS policy setup result:', sqlError.message);

        // 대안: 버킷을 완전히 public으로 만들기
        const { error: updateError } = await client.storage.updateBucket(
          this.bucketName,
          {
            public: true,
          },
        );

        if (updateError) {
          console.error('Error updating bucket to public:', updateError);
        } else {
          console.log('Bucket updated to public successfully');
        }
      } else {
        console.log('Storage RLS policy created successfully');
      }
    } catch (error) {
      console.error('Error setting up bucket policies:', error);
    }
  }

  private async createSignedUrl(fileName: string): Promise<string | null> {
    try {
      const { data: signedUrlData, error: signedError } =
        await getSupabaseAdminClient()
          .storage.from(this.bucketName)
          .createSignedUrl(fileName, 3600); // 1시간 유효

      if (signedError) {
        console.error('Signed URL creation failed:', signedError);
        return null;
      }

      console.log('Signed URL created successfully');
      return signedUrlData.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
  }
}
