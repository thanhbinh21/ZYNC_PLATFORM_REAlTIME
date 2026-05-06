import { Types } from 'mongoose';
import { PostModel, type PostType } from './post.model';
import { CommentModel } from './comment.model';
import { UserModel } from '../users/user.model';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors';
import { PostRepository, CommentRepository, postRepository, commentRepository } from '../../shared/repositories/post.repository';

export interface PostAuthor {
  _id: string;
  displayName: string;
  avatarUrl?: string;
  devRole?: string;
  skills?: string[];
}

export interface PostSummary {
  _id: string;
  authorId: string;
  author?: PostAuthor;
  title: string;
  content: string;
  codeSnippets: string[];
  mediaUrls: string[];
  tags: string[];
  type: PostType;
  channelId?: string;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommentSummary {
  _id: string;
  postId: string;
  authorId: string;
  author?: PostAuthor;
  content: string;
  codeSnippet?: string;
  parentId?: string;
  likesCount: number;
  isLiked?: boolean;
  createdAt: string;
}

async function enrichWithAuthor(authorId: string): Promise<PostAuthor | undefined> {
  const user = await UserModel.findById(authorId)
    .select('displayName avatarUrl devRole skills')
    .lean();
  if (!user) return undefined;
  return {
    _id: user._id.toString(),
    displayName: user.displayName as string,
    avatarUrl: user.avatarUrl as string | undefined,
    devRole: user.devRole as string | undefined,
    skills: user.skills as string[] | undefined,
  };
}

export class PostsService {
  private static readonly postRepo: PostRepository = postRepository;
  private static readonly commentRepo: CommentRepository = commentRepository;

  /** Tao bai viet moi */
  static async createPost(
    authorId: string,
    input: {
      title: string;
      content: string;
      type?: PostType;
      tags?: string[];
      codeSnippets?: string[];
      mediaUrls?: string[];
      channelId?: string;
    },
  ): Promise<PostSummary> {
    const post = await PostModel.create({
      authorId,
      title: input.title.trim(),
      content: input.content.trim(),
      type: input.type ?? 'discussion',
      tags: (input.tags ?? []).map((t) => t.toLowerCase().trim()),
      codeSnippets: input.codeSnippets ?? [],
      mediaUrls: input.mediaUrls ?? [],
      channelId: input.channelId,
    });

    const author = await enrichWithAuthor(authorId);
    return formatPost(post.toObject(), authorId, author);
  }

  /** Feed ca nhan – cursor pagination */
  static async getFeed(
    requesterId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ posts: PostSummary[]; nextCursor?: string }> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const cursorDate = cursor ? new Date(parseInt(cursor, 10)) : undefined;

    const posts = await PostsService.postRepo.findFeed(cursorDate, safeLimit + 1);

    const hasMore = posts.length > safeLimit;
    const paginated = hasMore ? posts.slice(0, safeLimit) : posts;

    const authorIds = [...new Set(paginated.map((p) => (p as unknown as Record<string, unknown>)['authorId'] as string))];
    const users = await UserModel.find({ _id: { $in: authorIds } })
      .select('displayName avatarUrl devRole skills')
      .lean();
    const authorMap = new Map(users.map((u) => [u._id.toString(), u]));

    const result = paginated.map((p) => {
      const raw = p as unknown as Record<string, unknown>;
      const user = authorMap.get(raw['authorId'] as string);
      const author: PostAuthor | undefined = user
        ? {
            _id: user._id.toString(),
            displayName: user.displayName as string,
            avatarUrl: user.avatarUrl as string | undefined,
            devRole: user.devRole as string | undefined,
            skills: user.skills as string[] | undefined,
          }
        : undefined;
      return formatPost(p, requesterId, author);
    });

    const nextCursor = hasMore
      ? String(new Date((paginated[paginated.length - 1] as unknown as Record<string, Date>)['createdAt']).getTime())
      : undefined;

    return { posts: result, nextCursor };
  }

  /** Trending posts – dua vao engagement score */
  static async getTrending(requesterId: string, limit = 10): Promise<PostSummary[]> {
    const safeLimit = Math.min(limit, 30);
    const posts = await PostsService.postRepo.findTrending(safeLimit);

    const authorIds = [...new Set(posts.map((p) => (p as unknown as Record<string, unknown>)['authorId'] as string))];
    const users = await UserModel.find({ _id: { $in: authorIds } })
      .select('displayName avatarUrl devRole skills')
      .lean();
    const authorMap = new Map(users.map((u) => [u._id.toString(), u]));

    return posts.map((p) => {
      const raw = p as unknown as Record<string, unknown>;
      const user = authorMap.get(raw['authorId'] as string);
      const author: PostAuthor | undefined = user
        ? {
            _id: user._id.toString(),
            displayName: user.displayName as string,
            avatarUrl: user.avatarUrl as string | undefined,
            devRole: user.devRole as string | undefined,
          }
        : undefined;
      return formatPost(p, requesterId, author);
    });
  }

  /** Chi tiet bai viet + tang view count */
  static async getPostById(postId: string, requesterId: string): Promise<PostSummary> {
    if (!Types.ObjectId.isValid(postId)) throw new BadRequestError('Invalid post id');

    const post = await PostsService.postRepo.incrementViews(postId);

    if (!post || (post as unknown as Record<string, unknown>)['status'] !== 'published') {
      throw new NotFoundError('Post not found');
    }

    const authorId = (post as unknown as Record<string, unknown>)['authorId'] as string;
    const author = await enrichWithAuthor(authorId);
    return formatPost(post, requesterId, author);
  }

  /** Sửa bài viết (author only) */
  static async updatePost(
    postId: string,
    authorId: string,
    input: { title?: string; content?: string; tags?: string[] },
  ): Promise<PostSummary> {
    if (!Types.ObjectId.isValid(postId)) throw new BadRequestError('Invalid post id');
    const post = await PostModel.findById(postId);
    if (!post || post.status !== 'published') throw new NotFoundError('Post not found');
    if (post.authorId !== authorId) throw new ForbiddenError('Only author can edit this post');

    if (input.title) post.title = input.title.trim();
    if (input.content) post.content = input.content.trim();
    if (input.tags) post.tags = input.tags.map((t) => t.toLowerCase().trim());
    await post.save();

    const author = await enrichWithAuthor(authorId);
    return formatPost(post.toObject(), authorId, author);
  }

  /** Xóa bài viết (author only) */
  static async deletePost(postId: string, authorId: string): Promise<void> {
    if (!Types.ObjectId.isValid(postId)) throw new BadRequestError('Invalid post id');
    const post = await PostModel.findById(postId);
    if (!post) throw new NotFoundError('Post not found');
    if (post.authorId !== authorId) throw new ForbiddenError('Only author can delete this post');
    await post.deleteOne();
    await CommentModel.deleteMany({ postId });
  }

  /** Like/unlike toggle */
  static async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    if (!Types.ObjectId.isValid(postId)) throw new BadRequestError('Invalid post id');
    const result = await PostsService.postRepo.toggleLike(postId, userId);
    if (!result) throw new NotFoundError('Post not found');
    return result;
  }

  /** Bookmark toggle */
  static async toggleBookmark(postId: string, userId: string): Promise<{ bookmarked: boolean }> {
    if (!Types.ObjectId.isValid(postId)) throw new BadRequestError('Invalid post id');
    const result = await PostsService.postRepo.toggleBookmark(postId, userId);
    if (!result) throw new NotFoundError('Post not found');
    return result;
  }

  /** Them comment */
  static async addComment(
    postId: string,
    authorId: string,
    input: { content: string; codeSnippet?: string; parentId?: string },
  ): Promise<CommentSummary> {
    if (!Types.ObjectId.isValid(postId)) throw new BadRequestError('Invalid post id');
    // Kiem tra post ton tai qua postRepo
    const postExists = await PostsService.postRepo.exists({ _id: postId } as unknown as Record<string, unknown>);
    if (!postExists) throw new NotFoundError('Post not found');

    const comment = await PostsService.commentRepo.create({
      postId,
      authorId,
      content: input.content.trim(),
      codeSnippet: input.codeSnippet,
      parentId: input.parentId,
    } as unknown as Record<string, unknown>);

    // Tang commentsCount truc tiep
    await PostsService.postRepo.updateOne(
      { _id: postId } as unknown as Record<string, unknown>,
      { $inc: { commentsCount: 1 } },
    );

    const author = await enrichWithAuthor(authorId);
    return formatComment(comment as unknown as Record<string, unknown>, authorId, author);
  }

  /** Lay danh sach comments */
  static async getComments(postId: string, requesterId: string): Promise<CommentSummary[]> {
    const comments = await PostsService.commentRepo.findByPost(postId, 100);

    const authorIds = [...new Set(comments.map((c) => (c as unknown as Record<string, unknown>)['authorId'] as string))];
    const users = await UserModel.find({ _id: { $in: authorIds } })
      .select('displayName avatarUrl devRole')
      .lean();
    const authorMap = new Map(users.map((u) => [u._id.toString(), u]));

    return comments.map((c) => {
      const raw = c as unknown as Record<string, unknown>;
      const user = authorMap.get(raw['authorId'] as string);
      const author: PostAuthor | undefined = user
        ? { _id: user._id.toString(), displayName: user.displayName as string, avatarUrl: user.avatarUrl as string | undefined }
        : undefined;
      return formatComment(c, requesterId, author);
    });
  }
}

function formatPost(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: any,
  requesterId: string,
  author?: PostAuthor,
): PostSummary {
  const p = post as Record<string, unknown>;
  return {
    _id: (p['_id'] as { toString: () => string }).toString(),
    authorId: p['authorId'] as string,
    author,
    title: p['title'] as string,
    content: p['content'] as string,
    codeSnippets: (p['codeSnippets'] as string[]) ?? [],
    mediaUrls: (p['mediaUrls'] as string[]) ?? [],
    tags: (p['tags'] as string[]) ?? [],
    type: p['type'] as PostType,
    channelId: p['channelId'] as string | undefined,
    likesCount: (p['likesCount'] as number) ?? 0,
    commentsCount: (p['commentsCount'] as number) ?? 0,
    viewsCount: (p['viewsCount'] as number) ?? 0,
    isLiked: ((p['likedBy'] as string[]) ?? []).includes(requesterId),
    isBookmarked: ((p['bookmarkedBy'] as string[]) ?? []).includes(requesterId),
    createdAt: (p['createdAt'] instanceof Date ? p['createdAt'] : new Date(p['createdAt'] as string)).toISOString(),
    updatedAt: (p['updatedAt'] instanceof Date ? p['updatedAt'] : new Date(p['updatedAt'] as string)).toISOString(),
  };
}

function formatComment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  comment: any,
  requesterId: string,
  author?: PostAuthor,
): CommentSummary {
  const c = comment as Record<string, unknown>;
  return {
    _id: (c['_id'] as { toString: () => string }).toString(),
    postId: c['postId'] as string,
    authorId: c['authorId'] as string,
    author,
    content: c['content'] as string,
    codeSnippet: c['codeSnippet'] as string | undefined,
    parentId: c['parentId'] as string | undefined,
    likesCount: (c['likesCount'] as number) ?? 0,
    isLiked: ((c['likedBy'] as string[]) ?? []).includes(requesterId),
    createdAt: (c['createdAt'] instanceof Date ? c['createdAt'] : new Date(c['createdAt'] as string)).toISOString(),
  };
}
