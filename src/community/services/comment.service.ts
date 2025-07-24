import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { getSupabaseAdminClient } from '../../config/supabase.config';
import { Comment } from '../entities/comment.entity';
import { CreateCommentDto } from '../dto/create-comment.dto';

@Injectable()
export class CommentService {
  async createComment(postId: string, userId: string, createCommentDto: CreateCommentDto): Promise<Comment> {
    // 게시글 존재 여부 확인
    const { data: post, error: postError } = await getSupabaseAdminClient()
      .from('posts')
      .select('id, is_public')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다');
    }

    if (!post.is_public) {
      throw new ForbiddenException('비공개 게시글에는 댓글을 달 수 없습니다');
    }

    // 대댓글인 경우 부모 댓글 확인
    if (createCommentDto.parentCommentId) {
      const { data: parentComment, error: parentError } = await getSupabaseAdminClient()
        .from('comments')
        .select('id, post_id')
        .eq('id', createCommentDto.parentCommentId)
        .single();

      if (parentError || !parentComment || parentComment.post_id !== postId) {
        throw new NotFoundException('부모 댓글을 찾을 수 없습니다');
      }
    }

    // 댓글 생성
    const { data: comment, error } = await getSupabaseAdminClient()
      .from('comments')
      .insert([
        {
          post_id: postId,
          user_id: userId,
          parent_comment_id: createCommentDto.parentCommentId,
          content: createCommentDto.content,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error('댓글 생성에 실패했습니다');
    }

    return this.mapSupabaseCommentToEntity(comment);
  }

  async getCommentsByPostId(postId: string, currentUserId?: string): Promise<Comment[]> {
    const { data: comments, error } = await getSupabaseAdminClient()
      .from('comments')
      .select(`
        *,
        users!inner(id, nickname, profile_image_url),
        likes!left(user_id)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error('댓글 목록 조회에 실패했습니다');
    }

    // 댓글을 트리 구조로 변환
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    comments.forEach(commentData => {
      const comment = this.mapSupabaseCommentToEntity(commentData);
      comment.user = {
        id: commentData.users.id,
        nickname: commentData.users.nickname,
        profileImageUrl: commentData.users.profile_image_url,
      };

      if (currentUserId) {
        comment.isLikedByCurrentUser = commentData.likes.some(like => like.user_id === currentUserId);
      }

      comment.replies = [];
      commentMap.set(comment.id, comment);

      if (!comment.parentCommentId) {
        rootComments.push(comment);
      }
    });

    // 대댓글을 부모 댓글에 연결
    commentMap.forEach(comment => {
      if (comment.parentCommentId) {
        const parentComment = commentMap.get(comment.parentCommentId);
        if (parentComment && parentComment.replies) {
          parentComment.replies.push(comment);
        }
      }
    });

    return rootComments;
  }

  async toggleCommentLike(commentId: string, userId: string): Promise<{ isLiked: boolean; likesCount: number }> {
    // 기존 좋아요 확인
    const { data: existingLike } = await getSupabaseAdminClient()
      .from('likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // 좋아요 취소
      await getSupabaseAdminClient()
        .from('likes')
        .delete()
        .eq('id', existingLike.id);
    } else {
      // 좋아요 추가
      await getSupabaseAdminClient()
        .from('likes')
        .insert([{ comment_id: commentId, user_id: userId }]);
    }

    // 최신 좋아요 수 조회
    const { data: comment } = await getSupabaseAdminClient()
      .from('comments')
      .select('likes_count')
      .eq('id', commentId)
      .single();

    return {
      isLiked: !existingLike,
      likesCount: comment?.likes_count || 0,
    };
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    // 댓글 소유자 확인
    const { data: comment, error: commentError } = await getSupabaseAdminClient()
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다');
    }

    if (comment.user_id !== userId) {
      throw new ForbiddenException('댓글을 삭제할 권한이 없습니다');
    }

    // 댓글 삭제 (대댓글도 함께 삭제됨 - CASCADE)
    const { error } = await getSupabaseAdminClient()
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      throw new Error('댓글 삭제에 실패했습니다');
    }
  }

  private mapSupabaseCommentToEntity(data: any): Comment {
    return {
      id: data.id,
      postId: data.post_id,
      userId: data.user_id,
      parentCommentId: data.parent_comment_id,
      content: data.content,
      likesCount: data.likes_count || 0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}