'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Zap,
  Server,
  Cloud,
  Bot,
  Smartphone,
  Briefcase,
  Globe,
  FolderOpen,
  Users,
  UserCheck,
  Search,
  TrendingUp,
  Tag,
  Loader2,
  Heart,
  MessageSquare,
  Eye,
  Link2,
} from 'lucide-react';
import {
  fetchExploreChannels,
  fetchDiscoverUsers,
  joinPublicChannel,
  type DiscoverUser,
} from '@/services/explore';
import { fetchTrendingPosts, type Post } from '@/services/posts';
import type { GroupConversation } from '@/services/groups';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  frontend: Zap,
  backend: Server,
  devops: Cloud,
  'ai-ml': Bot,
  mobile: Smartphone,
  career: Briefcase,
  general: Globe,
  other: FolderOpen,
};

const DEV_ROLE_LABELS: Record<string, string> = {
  developer: 'Developer',
  mentor: 'Mentor',
  student: 'Sinh viên',
  recruiter: 'Recruiter',
  other: 'Khác',
};

function ChannelCard({
  channel,
  onJoin,
  joining,
}: {
  channel: GroupConversation;
  onJoin: (id: string) => void;
  joining: boolean;
}) {
  const ch = channel as unknown as Record<string, unknown>;
  const category = ch['category'] as string | undefined;
  const description = ch['description'] as string | undefined;
  const memberCount = ch['memberCount'] as number | undefined;
  const tags = ch['tags'] as string[] | undefined;
  const CategoryIcon = category ? (CATEGORY_ICONS[category] ?? FolderOpen) : FolderOpen;

  return (
    <div className="zync-soft-card rounded-[1.6rem] p-4 transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-accent-light">
          {channel.avatarUrl ? (
            <img src={channel.avatarUrl} alt={channel.name ?? 'Channel'} className="h-full w-full rounded-2xl object-cover" />
          ) : (
            <CategoryIcon className="h-6 w-6 text-accent" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-ui-title text-sm text-text-primary">{channel.name ?? 'Channel'}</p>
          {category && (
            <span className="mt-0.5 inline-block rounded-full bg-bg-hover px-2 py-0.5 text-xs text-text-tertiary">{category}</span>
          )}
        </div>

        <button
          onClick={() => onJoin(channel._id)}
          disabled={joining}
          className="zync-soft-button flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs"
        >
          {joining ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
          Tham gia
        </button>
      </div>

      {description && (
        <p className="font-ui-content mt-2.5 line-clamp-2 text-sm leading-relaxed text-text-secondary">{description}</p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {(tags ?? []).slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full border border-border px-2 py-0.5 text-xs text-text-tertiary">#{tag}</span>
          ))}
        </div>
        <span className="flex items-center gap-1 text-xs text-text-tertiary">
          <Users className="h-3 w-3" />
          {memberCount ?? channel.users.length} thành viên
        </span>
      </div>
    </div>
  );
}

function UserCard({ user }: { user: DiscoverUser }) {
  const initials = user.displayName.slice(0, 2).toUpperCase();

  return (
    <div className="zync-soft-card rounded-[1.6rem] p-4 transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-light text-sm font-bold text-accent-strong">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full rounded-full object-cover" />
          ) : initials}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-ui-title text-sm text-text-primary">{user.displayName}</p>
          {user.username && <p className="font-ui-content text-xs text-text-tertiary">@{user.username}</p>}
          {user.devRole && (
            <span className="mt-0.5 inline-block rounded-full bg-bg-hover px-2 py-0.5 text-xs text-text-tertiary">
              {DEV_ROLE_LABELS[user.devRole] ?? user.devRole}
            </span>
          )}
        </div>

        {user.githubUrl && (
          <a href={user.githubUrl} target="_blank" rel="noopener noreferrer"
            className="zync-soft-button-ghost flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs">
            <Link2 className="h-3.5 w-3.5" />
            GitHub
          </a>
        )}
      </div>

      {user.bio && (
        <p className="font-ui-content mt-2.5 line-clamp-2 text-sm leading-relaxed text-text-secondary">{user.bio}</p>
      )}

      {(user.skills ?? []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {(user.skills ?? []).slice(0, 4).map((skill) => (
            <span key={skill} className="rounded-full border border-border bg-bg-hover px-2.5 py-0.5 text-xs text-text-secondary">{skill}</span>
          ))}
        </div>
      )}

      <p className="mt-2.5 flex items-center gap-1 text-xs text-text-tertiary">
        <Users className="h-3 w-3" />
        {user.friendCount} kết nối
      </p>
    </div>
  );
}

function TrendingPostRow({ post, rank }: { post: Post; rank: number }) {
  return (
    <div className="flex items-start gap-3 rounded-[1.2rem] border border-border-light p-3 transition hover:bg-bg-hover">
      <span className="font-ui-title min-w-[1.5rem] text-xl leading-none text-accent-strong">{rank}</span>
      <div className="min-w-0 flex-1">
        <p className="font-ui-title line-clamp-2 text-sm leading-snug text-text-primary">{post.title}</p>
        <div className="mt-1 flex items-center gap-3 text-xs text-text-tertiary">
          <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.likesCount}</span>
          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{post.commentsCount}</span>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.viewsCount}</span>
        </div>
      </div>
    </div>
  );
}

const SECTION_TABS = [
  { id: 'channels' as const, label: 'Kênh', Icon: FolderOpen },
  { id: 'developers' as const, label: 'Nhà phát triển', Icon: Users },
  { id: 'posts' as const, label: 'Thịnh hành', Icon: TrendingUp },
];

const POPULAR_TAGS = ['react', 'nodejs', 'typescript', 'python', 'devops', 'ai-ml', 'docker', 'nextjs', 'rust', 'golang'];

export default function ExploreContent() {
  const [channels, setChannels] = useState<GroupConversation[]>([]);
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningChannelId, setJoiningChannelId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState<'channels' | 'developers' | 'posts'>('channels');
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [channelData, userData, postData] = await Promise.allSettled([
        fetchExploreChannels(),
        fetchDiscoverUsers(),
        fetchTrendingPosts(10),
      ]);
      if (channelData.status === 'fulfilled') setChannels(channelData.value);
      if (userData.status === 'fulfilled') setUsers(userData.value);
      if (postData.status === 'fulfilled') setTrendingPosts(postData.value);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleJoinChannel = async (channelId: string) => {
    setJoiningChannelId(channelId);
    try {
      await joinPublicChannel(channelId);
      setJoinedIds((prev) => new Set([...prev, channelId]));
    } catch {/* ignore */} finally {
      setJoiningChannelId(null);
    }
  };

  const filteredChannels = channels.filter((c) =>
    !search || (c.name ?? '').toLowerCase().includes(search.toLowerCase()),
  );
  const filteredUsers = users.filter((u) =>
    !search || u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    (u.skills ?? []).some((s) => s.toLowerCase().includes(search.toLowerCase())),
  );
  const filteredPosts = trendingPosts.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Header + Search */}
      <div className="border-b border-border-light px-4 py-3 sm:px-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-ui-title flex items-center gap-2 text-xl text-text-primary">
              <Search className="h-5 w-5 text-accent" />
              Khám phá
            </h2>
            <p className="font-ui-content mt-0.5 text-xs text-text-tertiary">Tìm kênh, nhà phát triển và bài viết nổi bật</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kênh, người dùng, bài viết..."
            className="zync-soft-input pl-9"
          />
        </div>

        <div className="mt-3 flex gap-1 overflow-x-auto scrollbar-hide">
          {SECTION_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeSection === id ? 'bg-accent text-[var(--bg-primary)] shadow-sm' : 'border border-border bg-[var(--surface-glass)] text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="zync-soft-card rounded-[1.6rem] p-4">
                <div className="flex gap-3">
                  <div className="h-12 w-12 animate-pulse rounded-2xl bg-bg-hover" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-bg-hover" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-bg-hover" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeSection === 'channels' ? (
          filteredChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen className="h-12 w-12 text-text-tertiary" />
              <p className="font-ui-title mt-3 text-lg text-text-primary">Chưa có kênh công khai</p>
              <p className="font-ui-content mt-1.5 text-sm text-text-secondary">
                {search ? 'Không tìm thấy kênh phù hợp' : 'Hãy tạo kênh đầu tiên!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredChannels.map((channel) => (
                <ChannelCard
                  key={channel._id}
                  channel={channel}
                  onJoin={joinedIds.has(channel._id) ? () => {} : handleJoinChannel}
                  joining={joiningChannelId === channel._id}
                />
              ))}
            </div>
          )
        ) : activeSection === 'developers' ? (
          filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-text-tertiary" />
              <p className="font-ui-title mt-3 text-lg text-text-primary">Chưa có nhà phát triển nổi bật</p>
              <p className="font-ui-content mt-1.5 text-sm text-text-secondary">Hãy hoàn thiện hồ sơ của bạn để xuất hiện ở đây!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredUsers.map((user) => <UserCard key={user.id} user={user} />)}
            </div>
          )
        ) : (
          filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <TrendingUp className="h-12 w-12 text-text-tertiary" />
              <p className="font-ui-title mt-3 text-lg text-text-primary">Chưa có bài viết thịnh hành</p>
              <p className="font-ui-content mt-1.5 text-sm text-text-secondary">Hãy chia sẻ bài viết đầu tiên trong cộng đồng!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map((post, i) => <TrendingPostRow key={post._id} post={post} rank={i + 1} />)}
            </div>
          )
        )}
      </div>

      {/* Tags cloud */}
      {!loading && (
        <div className="border-t border-border-light px-4 py-3 sm:px-6">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            <Tag className="h-3 w-3" />
            Thẻ phổ biến
          </p>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setSearch(tag)}
                className="rounded-full border border-border bg-bg-hover px-3 py-0.5 text-xs text-text-secondary transition hover:border-accent hover:text-accent"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
