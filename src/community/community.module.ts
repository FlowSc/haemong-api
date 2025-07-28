import { Module } from '@nestjs/common';
import { CommunityController } from './controllers/community.controller';
import { CommunityService } from './services/community.service';
import { CommentService } from './services/comment.service';
import { StorageService } from '../common/services/storage.service';

@Module({
  controllers: [CommunityController],
  providers: [CommunityService, CommentService, StorageService],
  exports: [CommunityService, CommentService],
})
export class CommunityModule {}
