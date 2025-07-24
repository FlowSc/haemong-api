import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CommunityService } from '../services/community.service';
import { CommentService } from '../services/comment.service';
import { CreatePostDto } from '../dto/create-post.dto';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { PostListQueryDto } from '../dto/post-list.dto';

@Controller('community')
export class CommunityController {
  constructor(
    private readonly communityService: CommunityService,
    private readonly commentService: CommentService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('posts')
  async createPost(@Request() req, @Body() createPostDto: CreatePostDto) {
    const post = await this.communityService.createPost(req.user.userId, createPostDto);
    return {
      success: true,
      data: post,
      message: '게시글이 성공적으로 생성되었습니다',
    };
  }

  @Get('posts')
  async getPosts(@Query() queryDto: PostListQueryDto, @Request() req?) {
    const currentUserId = req?.user?.userId;
    const result = await this.communityService.getPosts(queryDto, currentUserId);
    return {
      success: true,
      data: result,
    };
  }

  @Get('posts/:postId')
  async getPostById(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Request() req?,
  ) {
    const currentUserId = req?.user?.userId;
    const post = await this.communityService.getPostById(postId, currentUserId);
    return {
      success: true,
      data: post,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/like')
  async toggleLike(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Request() req,
  ) {
    const result = await this.communityService.toggleLike(postId, req.user.userId);
    return {
      success: true,
      data: result,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/bookmark')
  async toggleBookmark(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Request() req,
  ) {
    const result = await this.communityService.toggleBookmark(postId, req.user.userId);
    return {
      success: true,
      data: result,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/comments')
  async createComment(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Request() req,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    const comment = await this.commentService.createComment(
      postId,
      req.user.userId,
      createCommentDto,
    );
    return {
      success: true,
      data: comment,
      message: '댓글이 성공적으로 생성되었습니다',
    };
  }

  @Get('posts/:postId/comments')
  async getComments(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Request() req?,
  ) {
    const currentUserId = req?.user?.userId;
    const comments = await this.commentService.getCommentsByPostId(postId, currentUserId);
    return {
      success: true,
      data: comments,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('comments/:commentId/like')
  async toggleCommentLike(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Request() req,
  ) {
    const result = await this.commentService.toggleCommentLike(commentId, req.user.userId);
    return {
      success: true,
      data: result,
    };
  }
}