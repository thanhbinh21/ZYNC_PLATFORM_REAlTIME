import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import {
  createPostHandler,
  getFeedHandler,
  getTrendingHandler,
  getPostByIdHandler,
  updatePostHandler,
  deletePostHandler,
  toggleLikeHandler,
  toggleBookmarkHandler,
  addCommentHandler,
  getCommentsHandler,
} from './posts.controller';

export const postsRouter = Router();

postsRouter.use(authenticate);

// POST /api/posts – Tạo bài viết
postsRouter.post('/', createPostHandler);

// GET /api/posts/feed – Feed cá nhân (cursor pagination)
postsRouter.get('/feed', getFeedHandler);

// GET /api/posts/trending – Trending
postsRouter.get('/trending', getTrendingHandler);

// GET /api/posts/:postId – Chi tiết bài viết
postsRouter.get('/:postId', getPostByIdHandler);

// PATCH /api/posts/:postId – Sửa bài viết
postsRouter.patch('/:postId', updatePostHandler);

// DELETE /api/posts/:postId – Xóa bài viết
postsRouter.delete('/:postId', deletePostHandler);

// POST /api/posts/:postId/like – Like/unlike toggle
postsRouter.post('/:postId/like', toggleLikeHandler);

// POST /api/posts/:postId/bookmark – Bookmark toggle
postsRouter.post('/:postId/bookmark', toggleBookmarkHandler);

// POST /api/posts/:postId/comments – Thêm comment
postsRouter.post('/:postId/comments', addCommentHandler);

// GET /api/posts/:postId/comments – Danh sách comments
postsRouter.get('/:postId/comments', getCommentsHandler);
