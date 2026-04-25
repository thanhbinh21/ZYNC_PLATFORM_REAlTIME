import { Types } from 'mongoose';
import { PostModel, type PostType } from './post.model';
import { CommentModel } from './comment.model';
import { UserModel } from '../users/user.model';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors';

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
  /** Tạo bài viết mới */
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

  /** Feed cá nhân – cursor pagination */
  static async getFeed(
    requesterId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ posts: PostSummary[]; nextCursor?: string }> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const query: Record<string, unknown> = { status: 'published' };
    if (cursor) {
      const decoded = new Date(parseInt(cursor, 10));
      query['createdAt'] = { $lt: decoded };
    }

    const posts = await PostModel.find(query)
      .sort({ createdAt: -1 })
      .limit(safeLimit + 1)
      .lean();

    const hasMore = posts.length > safeLimit;
    const paginated = hasMore ? posts.slice(0, safeLimit) : posts;

    const authorIds = [...new Set(paginated.map((p) => p.authorId as string))];
    const users = await UserModel.find({ _id: { $in: authorIds } })
      .select('displayName avatarUrl devRole skills')
      .lean();
    const authorMap = new Map(users.map((u) => [u._id.toString(), u]));

    const result = paginated.map((p) => {
      const user = authorMap.get(p.authorId as string);
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
      ? String(new Date(paginated[paginated.length - 1]!.createdAt as Date).getTime())
      : undefined;

    return { posts: result, nextCursor };
  }

  /** Trending posts – dựa vào engagement score */
  static async getTrending(requesterId: string, limit = 10): Promise<PostSummary[]> {
    const safeLimit = Math.min(limit, 30);
    // Use likesCount + commentsCount * 2 + viewsCount * 0.1 implicitly via sort
    const posts = await PostModel.find({ status: 'published' })
      .sort({ likesCount: -1, commentsCount: -1, createdAt: -1 })
      .limit(safeLimit)
      .lean();

    const authorIds = [...new Set(posts.map((p) => p.authorId as string))];
    const users = await UserModel.find({ _id: { $in: authorIds } })
      .select('displayName avatarUrl devRole skills')
      .lean();
    const authorMap = new Map(users.map((u) => [u._id.toString(), u]));

    return posts.map((p) => {
      const user = authorMap.get(p.authorId as string);
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

  /** Chi tiết bài viết + tăng view count */
  static async getPostById(postId: string, requesterId: string): Promise<PostSummary> {
    if (!Types.ObjectId.isValid(postId)) throw new BadRequestError('Invalid post id');

    const post = await PostModel.findByIdAndUpdate(
      postId,
      { $inc: { viewsCount: 1 } },
      { new: true },
    ).lean();

    if (!post || post.status !== 'published') throw new NotFoundError('Post not found');

    const author = await enrichWithAuthor(post.authorId as string);
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
    const post = await PostModel.findById(postId);
    if (!post) throw new NotFoundError('Post not found');

    const alreadyLiked = (post.likedBy as string[]).includes(userId);
    if (alreadyLiked) {
      post.likedBy = (post.likedBy as string[]).filter((id) => id !== userId);
      post.likesCount = Math.max(0, post.likesCount - 1);
    } else {
      (post.likedBy as string[]).push(userId);
      post.likesCount = post.likesCount + 1;
    }
    await post.save();
    return { liked: !alreadyLiked, likesCount: post.likesCount };
  }

  /** Bookmark toggle */
  static async toggleBookmark(postId: string, userId: string): Promise<{ bookmarked: boolean }> {
    if (!Types.ObjectId.isValid(postId)) throw new BadRequestError('Invalid post id');
    const post = await PostModel.findById(postId);
    if (!post) throw new NotFoundError('Post not found');

    const alreadyBookmarked = (post.bookmarkedBy as string[]).includes(userId);
    if (alreadyBookmarked) {
      post.bookmarkedBy = (post.bookmarkedBy as string[]).filter((id) => id !== userId);
    } else {
      (post.bookmarkedBy as string[]).push(userId);
    }
    await post.save();
    return { bookmarked: !alreadyBookmarked };
  }

  /** Thêm comment */
  static async addComment(
    postId: string,
    authorId: string,
    input: { content: string; codeSnippet?: string; parentId?: string },
  ): Promise<CommentSummary> {
    if (!Types.ObjectId.isValid(postId)) throw new BadRequestError('Invalid post id');
    const post = await PostModel.findById(postId);
    if (!post) throw new NotFoundError('Post not found');

    const comment = await CommentModel.create({
      postId,
      authorId,
      content: input.content.trim(),
      codeSnippet: input.codeSnippet,
      parentId: input.parentId,
    });

    await PostModel.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

    const author = await enrichWithAuthor(authorId);
    return formatComment(comment.toObject(), authorId, author);
  }

  /** Lấy danh sách comments */
  static async getComments(postId: string, requesterId: string): Promise<CommentSummary[]> {
    const comments = await CommentModel.find({ postId })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    const authorIds = [...new Set(comments.map((c) => c.authorId as string))];
    const users = await UserModel.find({ _id: { $in: authorIds } })
      .select('displayName avatarUrl devRole')
      .lean();
    const authorMap = new Map(users.map((u) => [u._id.toString(), u]));

    return comments.map((c) => {
      const user = authorMap.get(c.authorId as string);
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
