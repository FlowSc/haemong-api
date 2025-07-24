import { Injectable, OnModuleInit } from '@nestjs/common';
import { getSupabaseAdminClient } from '../../config/supabase.config';
import * as crypto from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly bucketName = 'dream-images';

  async onModuleInit() {
    // 모듈 초기화 시 버킷 생성
    await this.createBucketIfNotExists();
  }

  async uploadImageFromUrl(imageUrl: string, userId: string, chatRoomId: string, maxRetries: number = 3): Promise<string | null> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting to upload image (attempt ${attempt}/${maxRetries})`);
        
        // DALL-E URL에서 이미지 다운로드 (30초 타임아웃)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(imageUrl, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch image from URL: ${response.status} ${response.statusText}`);
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
        const { data, error } = await getSupabaseAdminClient()
          .storage
          .from(this.bucketName)
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
          .storage
          .from(this.bucketName)
          .getPublicUrl(fileName);

        console.log(`Image uploaded successfully: ${publicUrlData.publicUrl}`);
        
        return publicUrlData.publicUrl;
      } catch (error) {
        lastError = error as Error;
        console.error(`Upload attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // 지수 백오프: 1초, 2초, 4초
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    console.error(`Failed to upload image after ${maxRetries} attempts:`, lastError);
    return null;
  }

  async deleteImage(filePath: string): Promise<boolean> {
    try {
      const { error } = await getSupabaseAdminClient()
        .storage
        .from(this.bucketName)
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
      const { data: buckets, error: listError } = await getSupabaseAdminClient()
        .storage
        .listBuckets();

      if (listError) {
        console.error('Error listing buckets:', listError);
        return;
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        // 버킷 생성 (공개 버킷으로 설정)
        const { error: createError } = await getSupabaseAdminClient()
          .storage
          .createBucket(this.bucketName, {
            public: true,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
            fileSizeLimit: 5242880, // 5MB
          });

        if (createError) {
          console.error('Error creating bucket:', createError);
        } else {
          console.log(`Bucket '${this.bucketName}' created successfully`);
        }
      }
    } catch (error) {
      console.error('Error in createBucketIfNotExists:', error);
    }
  }
}