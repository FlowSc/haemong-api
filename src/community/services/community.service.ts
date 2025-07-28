import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { getSupabaseAdminClient } from '../../config/supabase.config';
import { Post } from '../entities/post.entity';
import { Comment } from '../entities/comment.entity';
import { CreatePostDto } from '../dto/create-post.dto';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { PostListQueryDto } from '../dto/post-list.dto';

@Injectable()
export class CommunityService {
  async createPost(
    userId: string,
    createPostDto: CreatePostDto,
  ): Promise<Post> {
    // 채팅룸에서 해몽 데이터 가져오기
    const { data: chatRoom, error: chatRoomError } =
      await getSupabaseAdminClient()
        .from('chat_rooms')
        .select(
          `
        *,
        messages!inner(
          id,
          content,
          bot_message,
          created_at
        ),
        generated_images(
          image_url,
          image_path,
          bot_gender,
          bot_style
        )
      `,
        )
        .eq('id', createPostDto.chatRoomId)
        .eq('user_id', userId)
        .single();

    if (chatRoomError || !chatRoom) {
      throw new NotFoundException('채팅룸을 찾을 수 없습니다');
    }

    // 사용자 메시지(꿈 내용)와 봇 메시지(해몽 내용) 분리
    const userMessage = chatRoom.messages.find((m) => !m.bot_message);
    const botMessage = chatRoom.messages.find((m) => m.bot_message);

    if (!userMessage || !botMessage) {
      throw new ForbiddenException('완성된 해몽이 없는 채팅룸입니다');
    }

    const generatedImage = chatRoom.generated_images?.[0];

    // 제목 자동 생성 (꿈 내용 요약)
    const autoTitle =
      createPostDto.title || this.generateTitleFromDream(userMessage.content);

    // 게시글 생성
    const { data: post, error } = await getSupabaseAdminClient()
      .from('posts')
      .insert([
        {
          user_id: userId,
          chat_room_id: createPostDto.chatRoomId,
          dream_content: userMessage.content,
          interpretation_content: botMessage.content,
          image_url: generatedImage?.image_url,
          bot_gender: generatedImage?.bot_gender || chatRoom.bot_gender,
          bot_style: generatedImage?.bot_style || chatRoom.bot_style,
          title: autoTitle,
          tags: createPostDto.tags || [],
          is_public: createPostDto.isPublic ?? true,
          is_premium: chatRoom.is_premium || false,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error('게시글 생성에 실패했습니다');
    }

    return this.mapSupabasePostToEntity(post);
  }

  async getPosts(
    queryDto: PostListQueryDto,
    currentUserId?: string,
  ): Promise<{
    posts: Post[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    let query = getSupabaseAdminClient()
      .from('posts')
      .select(
        `
        *,
        users!inner(id, nickname, profile_image_url),
        likes!left(user_id),
        bookmarks!left(user_id)
      `,
      )
      .eq('is_public', true);

    // 필터링
    if (queryDto.tags?.length) {
      query = query.overlaps('tags', queryDto.tags);
    }

    if (queryDto.botGender) {
      query = query.eq('bot_gender', queryDto.botGender);
    }

    if (queryDto.botStyle) {
      query = query.eq('bot_style', queryDto.botStyle);
    }

    if (queryDto.search) {
      query = query.or(
        `dream_content.ilike.%${queryDto.search}%,interpretation_content.ilike.%${queryDto.search}%`,
      );
    }

    // 정렬
    switch (queryDto.sortBy) {
      case 'popular':
        query = query.order('likes_count', { ascending: false });
        break;
      case 'trending':
        // 최근 24시간 내 좋아요가 많은 순
        query = query
          .gte(
            'created_at',
            new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          )
          .order('likes_count', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // 페이지네이션
    if (queryDto.cursor) {
      query = query.lt('created_at', queryDto.cursor);
    }

    const limit = queryDto.limit || 20;
    query = query.limit(limit + 1); // hasMore 확인용 +1

    const { data: posts, error } = await query;

    if (error) {
      throw new Error('게시글 목록 조회에 실패했습니다');
    }

    const hasMore = posts.length > limit;
    const resultPosts = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore
      ? resultPosts[resultPosts.length - 1].created_at
      : undefined;

    const mappedPosts = resultPosts.map((post) => {
      const mappedPost = this.mapSupabasePostToEntity(post);
      mappedPost.user = {
        id: post.users.id,
        nickname: post.users.nickname,
        profileImageUrl: post.users.profile_image_url,
      };

      if (currentUserId) {
        mappedPost.isLikedByCurrentUser = post.likes.some(
          (like) => like.user_id === currentUserId,
        );
        mappedPost.isBookmarkedByCurrentUser = post.bookmarks.some(
          (bookmark) => bookmark.user_id === currentUserId,
        );
      }

      return mappedPost;
    });

    return {
      posts: mappedPosts,
      hasMore,
      nextCursor,
    };
  }

  async getPostById(postId: string, currentUserId?: string): Promise<Post> {
    const { data: post, error } = await getSupabaseAdminClient()
      .from('posts')
      .select(
        `
        *,
        users!inner(id, nickname, profile_image_url),
        likes!left(user_id),
        bookmarks!left(user_id)
      `,
      )
      .eq('id', postId)
      .single();

    if (error || !post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다');
    }

    // 조회수 증가
    await this.incrementViewCount(postId);

    const mappedPost = this.mapSupabasePostToEntity(post);
    mappedPost.user = {
      id: post.users.id,
      nickname: post.users.nickname,
      profileImageUrl: post.users.profile_image_url,
    };

    if (currentUserId) {
      mappedPost.isLikedByCurrentUser = post.likes.some(
        (like) => like.user_id === currentUserId,
      );
      mappedPost.isBookmarkedByCurrentUser = post.bookmarks.some(
        (bookmark) => bookmark.user_id === currentUserId,
      );
    }

    return mappedPost;
  }

  async toggleLike(
    postId: string,
    userId: string,
  ): Promise<{ isLiked: boolean; likesCount: number }> {
    // 기존 좋아요 확인
    const { data: existingLike } = await getSupabaseAdminClient()
      .from('likes')
      .select('id')
      .eq('post_id', postId)
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
        .insert([{ post_id: postId, user_id: userId }]);
    }

    // 최신 좋아요 수 조회
    const { data: post } = await getSupabaseAdminClient()
      .from('posts')
      .select('likes_count')
      .eq('id', postId)
      .single();

    return {
      isLiked: !existingLike,
      likesCount: post?.likes_count || 0,
    };
  }

  async toggleBookmark(
    postId: string,
    userId: string,
  ): Promise<{ isBookmarked: boolean }> {
    const { data: existingBookmark } = await getSupabaseAdminClient()
      .from('bookmarks')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existingBookmark) {
      // 북마크 취소
      await getSupabaseAdminClient()
        .from('bookmarks')
        .delete()
        .eq('id', existingBookmark.id);
    } else {
      // 북마크 추가
      await getSupabaseAdminClient()
        .from('bookmarks')
        .insert([{ post_id: postId, user_id: userId }]);
    }

    return { isBookmarked: !existingBookmark };
  }

  private async incrementViewCount(postId: string): Promise<void> {
    // Supabase에서는 SQL 함수를 사용하여 카운트 증가
    await getSupabaseAdminClient().rpc('increment_view_count', {
      post_id: postId,
    });
  }

  private generateTitleFromDream(dreamContent: string): string {
    // 꿈 내용에서 핵심 키워드 추출하여 제목 생성
    const cleanedContent = dreamContent.replace(/[^\w\s가-힣]/g, '').trim();
    const words = cleanedContent.split(/\s+/).slice(0, 8); // 첫 8단어만 사용
    let title = words.join(' ');

    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }

    return title || '내 꿈 이야기';
  }

  private mapSupabasePostToEntity(data: any): Post {
    return {
      id: data.id,
      userId: data.user_id,
      chatRoomId: data.chat_room_id,
      dreamContent: data.dream_content,
      interpretationContent: data.interpretation_content,
      imageUrl: data.image_url,
      botGender: data.bot_gender,
      botStyle: data.bot_style,
      title: data.title,
      tags: data.tags || [],
      isPublic: data.is_public,
      isPremium: data.is_premium,
      likesCount: data.likes_count || 0,
      commentsCount: data.comments_count || 0,
      viewsCount: data.views_count || 0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
