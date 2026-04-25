'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  MessageCircle,
  HelpCircle,
  Lightbulb,
  Rocket,
  BookOpen,
  Briefcase,
  Heart,
  Bookmark,
  BookmarkCheck,
  Eye,
  MessageSquare,
  PenLine,
  TrendingUp,
  Tag,
  X,
  Loader2,
  Globe,
} from 'lucide-react';
import {
  fetchFeed,
  fetchTrendingPosts,
  createPost,
  likePost,
  bookmarkPost,
  type Post,
  type PostType,
} from '@/services/posts';

interface PostTypeConfig {
  label: string;
  Icon: React.ElementType;
  color: string;
  bgColor: string;
}

const POST_TYPE_CONFIG: Record<PostType, PostTypeConfig> = {
  discussion: { label: 'Thảo luận', Icon: MessageCircle, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  question: { label: 'Câu hỏi', Icon: HelpCircle, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  til: { label: 'TIL', Icon: Lightbulb, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  showcase: { label: 'Showcase', Icon: Rocket, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  tutorial: { label: 'Hướng dẫn', Icon: BookOpen, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  job: { label: 'Tuyển dụng', Icon: Briefcase, color: 'text-rose-600', bgColor: 'bg-rose-50' },
};

const FEED_TABS: { id: string; label: string; Icon: React.ElementType }[] = [
  { id: 'feed', label: 'Mới nhất', Icon: MessageSquare },
  { id: 'trending', label: 'Trending', Icon: TrendingUp },
  { id: 'question', label: 'Câu hỏi', Icon: HelpCircle },
  { id: 'til', label: 'TIL', Icon: Lightbulb },
];

const POPULAR_TAGS = ['react', 'nodejs', 'typescript', 'python', 'devops', 'ai-ml', 'docker', 'nextjs'];

interface CreatePostFormProps {
  onClose: () => void;
  onSuccess: (post: Post) => void;
}

function CreatePostForm({ onClose, onSuccess }: CreatePostFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<PostType>('discussion');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const post = await createPost({
        title: title.trim(),
        content: content.trim(),
        type,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      onSuccess(post);
    } catch {
      alert('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="zync-soft-card zync-soft-card-elevated w-full max-w-2xl rounded-[1.8rem] p-6 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-ui-title flex items-center gap-2 text-xl text-text-primary">
            <PenLine className="h-5 w-5 text-accent" />
            Tạo bài viết mới
          </h2>
          <button onClick={onClose} className="zync-soft-button-ghost flex h-9 w-9 items-center justify-center rounded-full p-0 text-text-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-ui-meta mb-2 block text-[0.72rem] uppercase tracking-[0.18em] text-text-tertiary">Loại bài viết</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(POST_TYPE_CONFIG) as [PostType, PostTypeConfig][]).map(([key, cfg]) => {
                const Icon = cfg.Icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      type === key
                        ? 'bg-text-primary text-white shadow-sm'
                        : 'border border-border bg-white/75 text-text-secondary hover:border-accent'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="font-ui-meta mb-2 block text-[0.72rem] uppercase tracking-[0.18em] text-text-tertiary">Tiêu đề</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề bài viết..." className="zync-soft-input" required />
          </div>

          <div>
            <label className="font-ui-meta mb-2 block text-[0.72rem] uppercase tracking-[0.18em] text-text-tertiary">Nội dung</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Chia sẻ kiến thức, kinh nghiệm của bạn... (hỗ trợ Markdown)"
              className="zync-soft-textarea min-h-[140px]"
              required
            />
          </div>

          <div>
            <label className="font-ui-meta mb-2 block text-[0.72rem] uppercase tracking-[0.18em] text-text-tertiary">Tags (cách nhau bằng dấu phẩy)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="react, nodejs, typescript..." className="zync-soft-input" />
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="zync-soft-button-secondary px-5 py-2.5 text-sm">Hủy</button>
            <button type="submit" disabled={submitting || !title.trim() || !content.trim()} className="zync-soft-button flex items-center gap-2 px-6 py-2.5 text-sm">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              {submitting ? 'Đang đăng...' : 'Đăng bài'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function PostCard({ post, onLike, onBookmark }: { post: Post; onLike: (id: string) => void; onBookmark: (id: string) => void }) {
  const cfg = POST_TYPE_CONFIG[post.type] ?? POST_TYPE_CONFIG['discussion'];
  const TypeIcon = cfg.Icon;
  const authorInitials = post.author?.displayName?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <article className="zync-soft-card rounded-[1.6rem] p-5 transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-light text-sm font-semibold text-accent-strong">
          {post.author?.avatarUrl ? (
            <img src={post.author.avatarUrl} alt={post.author.displayName} className="h-full w-full object-cover" />
          ) : authorInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-ui-title text-sm text-text-primary">{post.author?.displayName ?? 'Ẩn danh'}</span>
            {post.author?.devRole && (
              <span className="rounded-full bg-bg-hover px-2 py-0.5 text-xs text-text-tertiary">{post.author.devRole}</span>
            )}
            <span className="text-xs text-text-tertiary">{formatTimeAgo(post.createdAt)}</span>
          </div>
          <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bgColor} ${cfg.color}`}>
            <TypeIcon className="h-3 w-3" />
            {cfg.label}
          </span>
        </div>
      </div>

      <h3 className="font-ui-title mt-3 cursor-pointer text-base leading-snug text-text-primary hover:text-accent">{post.title}</h3>
      <p className="font-ui-content mt-1.5 line-clamp-3 text-sm leading-relaxed text-text-secondary">{post.content}</p>

      {post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 5).map((tag) => (
            <span key={tag} className="flex items-center gap-1 rounded-full border border-border bg-bg-hover px-2.5 py-0.5 text-xs text-text-tertiary">
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 border-t border-border-light pt-3">
        <button
          onClick={() => onLike(post._id)}
          className={`flex items-center gap-1.5 text-sm transition ${post.isLiked ? 'text-rose-500' : 'text-text-tertiary hover:text-rose-500'}`}
        >
          <Heart className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} />
          <span>{post.likesCount}</span>
        </button>

        <button className="flex items-center gap-1.5 text-sm text-text-tertiary transition hover:text-text-primary">
          <MessageSquare className="h-4 w-4" />
          <span>{post.commentsCount}</span>
        </button>

        <button className="flex items-center gap-1.5 text-sm text-text-tertiary transition hover:text-text-primary">
          <Eye className="h-4 w-4" />
          <span>{post.viewsCount}</span>
        </button>

        <button
          onClick={() => onBookmark(post._id)}
          className={`ml-auto flex items-center gap-1.5 text-sm transition ${post.isBookmarked ? 'text-accent' : 'text-text-tertiary hover:text-accent'}`}
        >
          {post.isBookmarked ? <BookmarkCheck className="h-4 w-4 fill-current" /> : <Bookmark className="h-4 w-4" />}
        </button>
      </div>
    </article>
  );
}

export default function CommunityContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<string>('feed');
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  const loadPosts = useCallback(async (tab: string, cursor?: string) => {
    setLoading(true);
    try {
      if (tab === 'trending') {
        const data = await fetchTrendingPosts(20);
        setPosts(data);
      } else {
        const { posts: data, nextCursor: nc } = await fetchFeed(cursor, 20);
        if (cursor) {
          setPosts((prev) => [...prev, ...data]);
        } else {
          setPosts(data);
        }
        setNextCursor(nc);
      }
    } catch {/* ignore */} finally {
      setLoading(false);
    }
  }, []);

  const loadTrending = useCallback(async () => {
    try {
      const data = await fetchTrendingPosts(5);
      setTrendingPosts(data);
    } catch {/* ignore */}
  }, []);

  useEffect(() => { loadPosts('feed'); loadTrending(); }, [loadPosts, loadTrending]);

  const handleTabChange = (tab: string) => { setActiveTab(tab); setNextCursor(undefined); loadPosts(tab); };
  const handleLike = async (postId: string) => {
    try {
      const { liked, likesCount } = await likePost(postId);
      setPosts((prev) => prev.map((p) => p._id === postId ? { ...p, isLiked: liked, likesCount } : p));
    } catch {/* ignore */}
  };
  const handleBookmark = async (postId: string) => {
    try {
      const { bookmarked } = await bookmarkPost(postId);
      setPosts((prev) => prev.map((p) => p._id === postId ? { ...p, isBookmarked: bookmarked } : p));
    } catch {/* ignore */}
  };
  const handlePostCreated = (post: Post) => { setPosts((prev) => [post, ...prev]); setShowCreateForm(false); };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {showCreateForm && <CreatePostForm onClose={() => setShowCreateForm(false)} onSuccess={handlePostCreated} />}

      <div className="flex h-full w-full overflow-hidden">
        {/* Feed */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="border-b border-border-light px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-ui-title flex items-center gap-2 text-xl text-text-primary">
                  <Globe className="h-5 w-5 text-accent" />
                  Cộng đồng
                </h2>
                <p className="font-ui-content mt-0.5 text-xs text-text-tertiary">Nơi developer chia sẻ kiến thức</p>
              </div>
              <button onClick={() => setShowCreateForm(true)} className="zync-soft-button flex items-center gap-2 px-4 py-2 text-sm">
                <PenLine className="h-4 w-4" />
                Viết bài
              </button>
            </div>

            <div className="mt-3 flex gap-1 overflow-x-auto scrollbar-hide">
              {FEED_TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => handleTabChange(id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    activeTab === id ? 'bg-text-primary text-white shadow-sm' : 'border border-border bg-white/70 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="zync-soft-card rounded-[1.6rem] p-5">
                    <div className="flex gap-3">
                      <div className="h-10 w-10 animate-pulse rounded-full bg-bg-hover" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/3 animate-pulse rounded bg-bg-hover" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-bg-hover" />
                      </div>
                    </div>
                    <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-bg-hover" />
                    <div className="mt-2 h-4 w-full animate-pulse rounded bg-bg-hover" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="h-12 w-12 text-text-tertiary" />
                <p className="font-ui-title mt-3 text-lg text-text-primary">Chưa có bài viết nào</p>
                <p className="font-ui-content mt-1.5 text-sm text-text-secondary">Hãy là người đầu tiên chia sẻ kiến thức!</p>
                <button onClick={() => setShowCreateForm(true)} className="zync-soft-button mt-5 flex items-center gap-2 px-5 py-2.5 text-sm">
                  <PenLine className="h-4 w-4" />
                  Viết bài đầu tiên
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post._id} post={post} onLike={handleLike} onBookmark={handleBookmark} />
                ))}
                {nextCursor && (
                  <button onClick={() => loadPosts(activeTab, nextCursor)} className="zync-soft-button-secondary mt-2 w-full py-2.5 text-sm">
                    Tải thêm bài viết
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-border-light p-4 lg:flex lg:flex-col">
          <div className="mb-4">
            <h3 className="font-ui-title flex items-center gap-2 text-base text-text-primary">
              <TrendingUp className="h-4 w-4 text-accent" />
              Trending hôm nay
            </h3>
          </div>
          {trendingPosts.length === 0 ? (
            <div className="zync-soft-card-muted rounded-[1.4rem] p-4 text-center">
              <p className="text-sm text-text-tertiary">Chưa có dữ liệu trending</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trendingPosts.map((post, i) => (
                <div key={post._id} className="zync-soft-card-muted rounded-[1.2rem] p-3">
                  <div className="flex items-start gap-2">
                    <span className="font-ui-title min-w-[1.2rem] text-lg text-accent-strong">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="font-ui-title line-clamp-2 text-sm leading-snug text-text-primary">{post.title}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-text-tertiary">
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.likesCount}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{post.commentsCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6">
            <h3 className="font-ui-title mb-3 flex items-center gap-2 text-base text-text-primary">
              <Tag className="h-4 w-4 text-accent" />
              Tags phổ biến
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_TAGS.map((tag) => (
                <span key={tag} className="cursor-pointer rounded-full border border-border bg-bg-hover px-3 py-1 text-xs text-text-secondary transition hover:border-accent hover:text-accent">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

