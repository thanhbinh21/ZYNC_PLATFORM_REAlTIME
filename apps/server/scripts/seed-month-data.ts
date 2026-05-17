/**
 * seed-month-data.ts
 *
 * Tạo dữ liệu seed mô phỏng hệ thống đã deploy được 1 tháng.
 * Phân bổ thời gian thực tế: ~70% hoạt động 7 ngày gần nhất,
 * ~20% trong tuần thứ 2-3, ~10% tuần thứ 4.
 *
 * Chạy: npx ts-node apps/server/scripts/seed-month-data.ts
 * Reset: xóa collection thủ công hoặc dùng flag --clear
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { connectDatabase } from '../src/infrastructure/database';
import { UserModel } from '../src/modules/users/user.model';
import { FriendshipModel } from '../src/modules/friends/friendship.model';
import { ConversationModel } from '../src/modules/conversations/conversation.model';
import { ConversationMemberModel } from '../src/modules/conversations/conversation-member.model';
import { MessageModel } from '../src/modules/messages/message.model';
import { MessageStatusModel } from '../src/modules/messages/message-status.model';
import { MessageReactionSummaryModel } from '../src/modules/messages/message-reaction-summary.model';
import { MessageReactionUserModel } from '../src/modules/messages/message-reaction-user.model';
import { PostModel } from '../src/modules/posts/post.model';
import { CommentModel } from '../src/modules/posts/comment.model';
import { PostViewModel } from '../src/modules/posts/post-view.model';
import { NotificationModel } from '../src/modules/notifications/notification.model';
import { NotificationPreferenceModel } from '../src/modules/notifications/notification-preference.model';
import {
  CallSessionModel,
  CallParticipantModel,
  CallEventModel,
} from '../src/modules/calls/calls.model';
import { ModerationLogModel } from '../src/modules/ai/moderation/moderation.model';
import { StickerPackModel } from '../src/modules/stickers/sticker.model';
import { logger } from '../src/shared/logger';

// ─── Constants ──────────────────────────────────────────────────────────────────

const NOW = Date.now();
const ONE_DAY = 86_400_000;
const ONE_WEEK = ONE_DAY * 7;
const ONE_MONTH = ONE_DAY * 30;

// Ngày tạo tài khoản: phân bổ từ 1 tháng trước đến 3 ngày trước
const ACCOUNT_AGE_MIN = ONE_MONTH;
const ACCOUNT_AGE_MAX = ONE_DAY * 3;

const DEFAULT_PASSWORD = 'ZyncDev2026!';
const PASSWORD_HASH = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

// ─── Utility Functions ──────────────────────────────────────────────────────────

/**
 * Sinh timestamp phân bổ thực tế: 70% tuần gần nhất, 20% tuần 2-3, 10% tuần 4
 */
function randomTimestamp(monthsBack = 1): number {
  const ageMs = (Math.random() < 0.70 ? ONE_WEEK * Math.random() : ONE_WEEK * 2 + Math.random() * ONE_WEEK * 2) * monthsBack;
  return NOW - ageMs;
}

/**
 * Sinh nhiều timestamp theo khoảng thời gian, có clustering
 */
function randomTimestampsBetween(start: number, end: number, count: number): number[] {
  const timestamps: number[] = [];
  const range = end - start;
  for (let i = 0; i < count; i++) {
    const t = start + Math.pow(Math.random(), 1.5) * range;
    timestamps.push(t);
  }
  return timestamps.sort((a, b) => a - b);
}

/**
 * Chọn ngẫu nhiên n phần tử từ mảng
 */
function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Chọn 1 phần tử ngẫu nhiên từ mảng
 */
function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Random int trong khoảng [min, max]
 */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random float trong khoảng [min, max)
 */
function randFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Tạo idempotency key duy nhất
 */
function ik(): string {
  return uuidv4();
}

// ─── Realistic Data Seeds ───────────────────────────────────────────────────────

const AVATAR_URLS = [
  'https://res.cloudinary.com/binhdev/image/upload/v1775401939/avatars/p9asrwaclhspknl3koq8.jpg',
  'https://res.cloudinary.com/binhdev/image/upload/v1776614290/zync/images/69e2647d1680fe1676223bff/q2hgnnbvyn3xaodsgutu.jpg',
  'https://res.cloudinary.com/binhdev/image/upload/v1776618723/zync/images/69e2647d1680fe1676223c00/jhehlpuz4mkpolyidqpq.jpg',
  'https://res.cloudinary.com/binhdev/image/upload/v1775438102/stories/nuuxxnjehlizhhxvam45.jpg',
  'https://res.cloudinary.com/binhdev/image/upload/v1775401939/avatars/p9asrwaclhspknl3koq8.jpg',
];

const SKILLS_POOL = [
  'javascript', 'typescript', 'react', 'nextjs', 'vue', 'nodejs', 'express',
  'python', 'django', 'fastapi', 'java', 'spring', 'go', 'rust', 'c-sharp',
  'react-native', 'flutter', 'swift', 'kotlin', 'postgresql', 'mongodb',
  'redis', 'docker', 'kubernetes', 'aws', 'graphql', 'rest-api', 'git',
  'ci-cd', 'testing', 'security', 'ai-ml', 'data-science',
];

const INTERESTS_POOL = [
  'frontend', 'backend', 'fullstack', 'mobile', 'devops', 'cloud',
  'ai-ml', 'data', 'security', 'open-source', 'career', 'startup', 'freelance',
];

const BIO_TEMPLATES = [
  (name: string) => `${name} | Web Developer | React & Node.js | HCM City`,
  (name: string) => `Fullstack Dev | TypeScript | HCM City | Open to work`,
  (name: string) => `Backend Engineer | Go & Python | Scale things up`,
  (name: string) => `Mobile Developer | React Native | Building apps that matter`,
  (name: string) => `DevOps/SRE | Docker, K8s, AWS | Automate all the things`,
  (name: string) => `Frontend Artist | CSS Wizard | Making the web beautiful`,
  (name: string) => `Data Engineer | Python & SQL | Love clean pipelines`,
  (name: string) => `Security Researcher | Bug Bounty Hunter | CTF Player`,
  (name: string) => `Student @ UIT | Learning fullstack | Seeking mentorship`,
  (name: string) => `Freelance Dev | React & Next.js | 5+ years exp`,
  (name: string) => `Tech Lead | Managing teams | Still love to code`,
  (name: string) => `Startup Founder | Building in public | SaaS enthusiast`,
  (name: string) => `AI/ML Engineer | LLM fine-tuning | Python | TensorFlow`,
  (name: string) => `Game Developer | Unity & Godot | Indie game lover`,
  (name: string) => `Junior Dev | Learning every day | React beginner`,
];

const GITHUB_URLS = [
  'https://github.com',
  'https://github.com',
  'https://github.com',
  '',
  '',
];

const STICKER_PACK_IDS = [
  'tra-loi-nhanh',
  'tho',
];

// ─── Realistic Message Content ─────────────────────────────────────────────────

const DIRECT_MESSAGES_POOL: Record<string, Array<{ sender: 'a' | 'b'; content: string; type?: string; mediaUrl?: string }>> = {
  tech: [
    { sender: 'a', content: 'Mình vừa push code lên branch feature/new-auth, bạn review giúp mình nhé' },
    { sender: 'b', content: 'Ok, để mình xem qua. Có gì mình comment trong PR' },
    { sender: 'a', content: 'Mình đang implement JWT refresh token, bạn có kinh nghiệm gì không?' },
    { sender: 'b', content: 'Mình dùng approach rotate refresh token, khá an toàn. Mình chia sẻ article này: https://refresh-token.dev' },
    { sender: 'a', content: 'Cảm ơn, đọc rồi. Mình sẽ implement thử' },
    { sender: 'b', content: 'Mà này, cái endpoint /auth/refresh có cần blacklisting không?' },
    { sender: 'a', content: 'Mình nghĩ cần, để tránh token bị đánh cắp vẫn dùng được' },
    { sender: 'b', content: 'Đồng ý. Mình sẽ add Redis blacklist vào đó' },
    { sender: 'a', content: 'Mình gửi bạn file design mới về authentication flow này', type: 'image', mediaUrl: 'https://res.cloudinary.com/binhdev/image/upload/v1775401939/avatars/p9asrwaclhspknl3koq8.jpg' },
    { sender: 'b', content: 'Nice! Rõ ràng quá. Mình sẽ follow theo design này' },
    { sender: 'a', content: 'Họp team lúc 3h chiều nay nhé, bàn về sprint mới' },
    { sender: 'b', content: 'Ok mình có mặt' },
    { sender: 'a', content: 'Mình đang fix bug liên quan đến race condition trong message queue, kinh nghiệm của bạn?' },
    { sender: 'b', content: 'Dùng Redis WATCH/MULTI hoặc queue có idempotency. Cách nào đang dùng?' },
    { sender: 'a', content: 'Mình dùng Kafka consumer, đang xử lý manual offset commit' },
    { sender: 'b', content: 'Nên dùng auto commit hoặc manual commit rõ ràng. Mình gửi bạn code mẫu' },
    { sender: 'a', content: 'Perfect, đã fix được rồi. Cảm ơn bạn nhiều!' },
    { sender: 'b', content: 'Không có gì, giúp được thì mừng' },
  ],
  casual: [
    { sender: 'a', content: 'Hôm nay đi cafe không?' },
    { sender: 'b', content: 'Được, ơn giờ?' },
    { sender: 'a', content: 'Chiều 3h, quán cũ nhé' },
    { sender: 'b', content: 'Ok, gặp ở đó' },
    { sender: 'a', content: 'Mình vừa đọc xong cuốn sách kỹ năng mềm, hay lắm bạn nên đọc' },
    { sender: 'b', content: 'Tên sách gì vậy?' },
    { sender: 'a', content: '"The Pragmatic Programmer", classic nhưng vẫn rất valuable' },
    { sender: 'b', content: 'Mình cũng đang đọc, đúng là rất hay' },
    { sender: 'a', content: 'Cuối tuần rảnh không? Đi chơi không?' },
    { sender: 'b', content: 'Cuối tuần mình đi về quê, có dịp khác nhé' },
    { sender: 'a', content: 'Không sao, lần sau' },
    { sender: 'b', content: 'Bạn xem video mới của F8 chưa? Hướng dẫn React Server Components hay lắm' },
    { sender: 'a', content: 'Chưa, để mình xem thử' },
    { sender: 'b', content: 'Khong thua dau, free nữa' },
    { sender: 'a', content: 'Mình đang tìm việc, bạn có job nào hay không?' },
    { sender: 'b', content: 'Công ty mình đang tuyển senior React,感兴趣 không?' },
    { sender: 'a', content: 'Rất quan tâm! Gửi JD giúp mình với' },
    { sender: 'b', content: 'Đã gửi qua email nhé, good luck!' },
  ],
  urgent: [
    { sender: 'a', content: 'Production đang down, bạn vào check gấp!' },
    { sender: 'b', content: 'WTF, mình đang check' },
    { sender: 'a', content: 'Lỗi 502 gateway timeout, có vẻ như service messages bị crash' },
    { sender: 'b', content: 'Found it! Memory leak trong message worker. Restarting now' },
    { sender: 'a', content: 'Đã restart chưa? Dashboard vẫn đỏ' },
    { sender: 'b', content: 'Just restarted, waiting for health check' },
    { sender: 'a', content: 'OK, all green rồi. Good catch!' },
    { sender: 'b', content: 'Mình sẽ viết post-mortem sau buổi họp nhé' },
    { sender: 'a', content: 'Cảm ơn bạn, mình đã notify stakeholders' },
    { sender: 'b', content: 'Post-mortem đây: https://wiki.zync.dev/incidents/2026-05-10' },
  ],
};

const GROUP_MESSAGES_POOL = [
  'Chào cả team, sprint mới bắt đầu rồi',
  'Mình assign task cho mọi người trên Jira rồi nhé',
  'AI summary: đợt này tập trung vào performance optimization',
  'Task API rate limiting đã done, ai review giúp mình?',
  'Mình đã review rồi, có vài comments trong PR',
  'Fixed rồi, merge được chưa?',
  'LGTM, merge đi',
  'Notice: mai có maintenance window 2h sáng',
  'Có ai đang free không? Cần help với Kafka consumer',
  'Mình đây, đang rảnh',
  'Upload ảnh check-in team building tháng này: https://cloudinary.com/team-building-may',
  'Cuộc họp retrospective lúc 4h chiều nhé mọi người',
  'Mình xin nghỉ ngày mai, có task gì cần cover không?',
  'Mình cover được task API documentation',
  'Lưu ý: deadline feature stories là thứ 6 tuần sau',
  'Mình update progress: đã done 70%, ước tính thêm 2 ngày nữa',
  'Ai dùng Cursor AI để code chưa? Hay vẫn dùng Copilot?',
  'Mình dùng Cursor, khá cool, đặc biệt là tính năng agent',
  'Mình vẫn dùng Cursor nhưng agent mode hơi lag với project lớn',
  'Test coverage hiện tại là bao nhiêu vậy mọi người?',
  'Khoảng 65%, mục tiêu cuối tháng là 80%',
  'AI assistant feature đang review, ai volunteer test?',
  'Mình test được, assign cho mình',
  'Release candidate đã ready, test environment đã setup',
  'Bug report: typing indicator bị lag khi nhắn liên tục',
  'Reproduced, đang fix. Có vẻ như debounce bị miss',
  'Fix deployed rồi, verify giúp mình',
  'OK verified, closing ticket',
  'Reminder: 15h30 có standup, prepare updates',
  'Mình xin nghỉ sớm 1 tiếng, có meeting riêng',
  'Chốt lịch demo cho stakeholder thứ 6 tuần này',
  'Demo 10h sáng thứ 6 ổn không mọi người?',
  'OK for me',
  'Works for everyone, Mình sẽ book meeting room',
  'Mình gửi link Figma design system mới, team feedback trước thứ 2 nhé',
  'Đã xem, UI khá clean, có suggest một số improvements',
  'Mình merge design system vào main rồi, version 2.0',
  'Breaking changes có update changelog chưa?',
  'Đã update, mọi người check lại nhé',
  'Security audit report có ai đọc chưa? Có 3 high priority items',
  'Mình đang handle, estimated complete EOD',
  'MongoDB indexes đã được optimize, query latency giảm 40%',
  'Redis cache hit rate hiện tại là 87%, khá good',
  'Kafka consumer lag đang ổn định dưới 100ms',
  'CI/CD pipeline đã được tối ưu, build time giảm từ 15p xuống 8p',
];

const POST_TITLES_POOL = [
  'Tại sao tôi chuyển từ Express sang FastAPI (và không quay lại)',
  'Hướng dẫn deploy Node.js app lên Railway - miễn phí và dễ',
  'Clean Architecture cho người mới bắt đầu: Từ theory đến practice',
  '5VSCode extensions mà developer nên có trong năm 2026',
  'React Server Components: Tất tần tật những điều bạn cần biết',
  'TIL: Docker multi-stage builds giúp giảm image size 90%',
  'So sánh Zustand vs Redux Toolkit: Khi nào nên dùng cái nào?',
  'TypeScript advanced types: Một số pattern hay dùng trong production',
  'WebSocket vs Server-Sent Events: Khi nào nên dùng?',
  'Git workflow mà team mình đang dùng - hiệu quả và đơn giản',
  'Authentication patterns: JWT, Session, OAuth2 - so sánh chi tiết',
  'Database indexing strategies cho MongoDB: Case study thực tế',
  'CI/CD pipeline setup với GitHub Actions - từ zero đến hero',
  'Tại sao mình chọn Bun thay vì Node.js cho dự án mới',
  'Docker compose for local development: Best practices 2026',
  'Optimizing React app performance: Những tip không phải ai cũng biết',
  'CRUD API design: Những nguyên tắc mà sách dạy nhưng ít ai làm',
  'MySQL vs PostgreSQL: Chọn cái nào cho startup?',
  'Real-time features với Socket.IO và Redis Pub/Sub',
  'Rate limiting strategies: Token bucket, Sliding window, Fixed window',
];

const POST_CONTENTS_POOL = [
  `Gần đây mình có cơ hội chuyển một dự án từ Express sang FastAPI và mình muốn chia sẻ những gì mình học được.

## Tại sao chuyển?

Dự án của mình cần xử lý nhiều I/O operations và FastAPI với async/await native support đã giúp cải thiện throughput đáng kể. Benchmark thực tế cho thấy **2-3x faster** trong các scenario test của mình.

\`\`\`python
# FastAPI async handler
@app.get("/items/{item_id}")
async def read_item(item_id: int):
    item = await get_item_from_db(item_id)
    return item
\`\`\`

## Những điều tốt

- Automatic OpenAPI docs (Swagger UI) - tiết kiệm rất nhiều thời gian
- Pydantic validation mạnh mẽ, type safety tốt
- Native async support
- Dependency injection system rất linh hoạt

## Những điều cần lưu ý

- Async/await có thể phức tạp nếu không quen
- Một số libraries vẫn chưa có native async support
- Learning curve cho team member mới

Mọi người có kinh nghiệm gì với FastAPI không? Chia sẻ nhé!`,

  `Đây là những VSCode extensions mà mình dùng hàng ngày và thấy **cực kỳ hữu ích**:

## 1. Cursor AI (tất nhiên rồi)
AI-assisted coding, autocomplete thông minh, explain code...

## 2. Error Lens
Highlight lỗi ngay tại dòng code, tiết kiệm thời gian debug.

## 3. GitLens
Xem ai viết dòng code nào, history visualization, compare branches...

## 4. Thunder Client
API testing ngay trong VSCode, thay thế Postman cho các project nhỏ.

## 5. ESBe Intelephense
PHP IntelliSense, nhẹ và nhanh.

Bạn nào có extensions hay khác thì comment nhé!`,

  `## Case Study: Tối ưu MongoDB query từ 500ms xuống 10ms

Project mình có một endpoint search rất chậm, mất ~500ms. Sau khi investigate, mình đã tìm ra nguyên nhân và fix thành công.

### Bước 1: Identify slow queries
\`\`\`javascript
db.getProfilingLevel(1);
db.system.profile.find({ millis: { $gt: 100 } }).pretty();
\`\`\`

### Bước 2: Analyze query plan
\`\`\`javascript
db.messages.find({ conversationId: "xxx" }).sort({ createdAt: -1 }).explain("executionStats");
\`\`\`

### Bước 3: Thêm compound index
\`\`\`javascript
db.messages.createIndex({ conversationId: 1, createdAt: -1, _id: -1 });
\`\`\`

### Kết quả
- Before: 500ms
- After: 10ms

Đây là case study thực tế, hy vọng giúp ích cho ai đang gặp vấn đề tương tự.`,

  `Discussion: Backend framework nào cho Node.js trong năm 2026?

Team mình đang bàn về việc chọn framework cho project mới. Hiện tại đang cân nhắc giữa:

1. **Express.js** - Classic, flexible, nhiều resources
2. **Fastify** - Performance tốt, plugin system hay
3. **NestJS** - Structure tốt, DI mạnh
4. **Hono** - Lightweight, edge-ready

Mình thì nghiêng về Fastify vì performance và DX tốt. Các bạn thì sao?`,

  `## TIL: Redis Sorted Set cho leaderboard

Hôm nay mình implement leaderboard cho feature mới và chia sẻ approach với mọi người.

\`\`\`javascript
// Add score
await redis.zadd('leaderboard', score, userId);

// Get top 10
await redis.zrevrange('leaderboard', 0, 9, 'WITHSCORES');

// Get user rank
const rank = await redis.zrevrank('leaderboard', userId);
\`\`\`

Redis ZADD/ZREVRANGE có O(log(N)) complexity, rất hiệu quả cho leaderboard. Mình xử lý 100K users vẫn smooth.`,
];

const COMMENT_CONTENTS_POOL = [
  'Bài viết rất chi tiết, cảm ơn bạn đã chia sẻ!',
  'Mình đang gặp vấn đề tương tự, bài này giúp mình nhiều',
  'Có code sample đầy đủ hơn không bạn?',
  'Mình đã implement theo cách này và thấy hiệu quả',
  'Tip hay! Bookmark lại để đọc sau',
  'So sánh với approach khác thì sao bạn?',
  'Mình suggest thêm phần về error handling',
  'Performance benchmark ở đâu vậy bạn?',
  'Mình đã upvote bài này, content rất chất lượng',
  'Team mình cũng đang dùng approach này, rất recommend',
  'Có video hướng dẫn không bạn? Học qua video dễ hơn',
  'Mình đã share cho team, mọi người feedback tốt lắm',
  'Bạn ơi, cái phần 3 mình chưa hiểu lắm, giải thích thêm được không?',
  'Đây là best practice rồi, recommend everyone follow',
  'Mình có approach khác, để mình share trong comment tiếp theo',
];

// ─── Seed Data Definitions ─────────────────────────────────────────────────────

interface SeedUser {
  _id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  skills: string[];
  interests: string[];
  githubUrl: string;
  devRole: string;
  onboardingCompleted: boolean;
  isOnline: boolean;
  lastSeenAt: Date | null;
  trustScore: number;
  globalViolationCount: number;
  createdAt: Date;
}

const SEED_USER_DEFINITIONS = [
  {
    email: 'thanhbinhdev@gmail.com',
    username: 'binhdev',
    displayName: 'Nguyễn Thanh Bình',
    bio: 'Fullstack Developer | TypeScript & React | HCM City | Building Zync',
    devRole: 'developer',
    skills: ['typescript', 'react', 'nextjs', 'nodejs', 'express', 'mongodb', 'docker'],
    interests: ['fullstack', 'backend', 'open-source', 'career'],
    githubUrl: 'https://github.com/binhdev',
    avatarUrl: 'https://res.cloudinary.com/binhdev/image/upload/v1775401939/avatars/p9asrwaclhspknl3koq8.jpg',
  },
  {
    email: 'minhdu.khtn@gmail.com',
    username: 'duoccho',
    displayName: 'Nguyễn Minh Đức',
    bio: 'Backend Engineer | Go & Python | HCM City | Scale systems',
    devRole: 'developer',
    skills: ['go', 'python', 'fastapi', 'postgresql', 'redis', 'docker', 'kubernetes'],
    interests: ['backend', 'devops', 'cloud', 'ai-ml'],
    githubUrl: 'https://github.com/duoccho',
    avatarUrl: 'https://res.cloudinary.com/binhdev/image/upload/v1776614290/zync/images/69e2647d1680fe1676223bff/q2hgnnbvyn3xaodsgutu.jpg',
  },
  {
    email: 'linhtran.dev@gmail.com',
    username: 'linhdev',
    displayName: 'Trần Thị Linh',
    bio: 'Frontend Developer | React & Vue | HCM City | UI/UX Enthusiast',
    devRole: 'developer',
    skills: ['react', 'vue', 'javascript', 'typescript', 'nextjs', 'git'],
    interests: ['frontend', 'open-source', 'career'],
    githubUrl: 'https://github.com/linhdev',
    avatarUrl: 'https://res.cloudinary.com/binhdev/image/upload/v1776618723/zync/images/69e2647d1680fe1676223c00/jhehlpuz4mkpolyidqpq.jpg',
  },
  {
    email: 'quangminh.coder@gmail.com',
    username: 'quangminh',
    displayName: 'Bùi Quang Minh',
    bio: 'Mobile Developer | React Native & Flutter | HCM City',
    devRole: 'developer',
    skills: ['react-native', 'flutter', 'javascript', 'typescript', 'nodejs'],
    interests: ['mobile', 'frontend', 'startup'],
    githubUrl: 'https://github.com/quangminh',
    avatarUrl: 'https://res.cloudinary.com/binhdev/image/upload/v1775438102/stories/nuuxxnjehlizhhxvam45.jpg',
  },
  {
    email: 'anhnt.tech@gmail.com',
    username: 'anhnt',
    displayName: 'Nguyễn Thị Anh',
    bio: 'DevOps Engineer | AWS & GCP | CI/CD | HCM City',
    devRole: 'developer',
    skills: ['docker', 'kubernetes', 'aws', 'ci-cd', 'git', 'security'],
    interests: ['devops', 'cloud', 'security'],
    githubUrl: 'https://github.com/anhnt',
    avatarUrl: 'https://res.cloudinary.com/binhdev/image/upload/v1775401939/avatars/p9asrwaclhspknl3koq8.jpg',
  },
  {
    email: 'ductuan.data@gmail.com',
    username: 'ductuan',
    displayName: 'Đặng Đức Tuấn',
    bio: 'Data Engineer | Python & SQL | ETL pipelines | HCM City',
    devRole: 'developer',
    skills: ['python', 'postgresql', 'mongodb', 'docker', 'data-science'],
    interests: ['backend', 'data', 'ai-ml'],
    githubUrl: 'https://github.com/ductuan',
    avatarUrl: 'https://res.cloudinary.com/binhdev/image/upload/v1776614290/zync/images/69e2647d1680fe1676223bff/q2hgnnbvyn3xaodsgutu.jpg',
  },
  {
    email: 'hoanganh.se@gmail.com',
    username: 'hoanganh',
    displayName: 'Hoàng Anh Khoa',
    bio: 'Senior Software Engineer | Java & Spring Boot | HCM City',
    devRole: 'developer',
    skills: ['java', 'spring', 'postgresql', 'docker', 'aws', 'testing'],
    interests: ['backend', 'career', 'fullstack'],
    githubUrl: 'https://github.com/hoanganh',
    avatarUrl: 'https://res.cloudinary.com/binhdev/image/upload/v1776618723/zync/images/69e2647d1680fe1676223c00/jhehlpuz4mkpolyidqpq.jpg',
  },
  {
    email: 'thanhhuong.dev@gmail.com',
    username: 'thanhhuong',
    displayName: 'Lê Thanh Hương',
    bio: 'Frontend Artist | CSS Specialist | Animations | HCM City',
    devRole: 'developer',
    skills: ['react', 'javascript', 'typescript', 'nextjs', 'git'],
    interests: ['frontend', 'open-source', 'freelance'],
    githubUrl: 'https://github.com/thanhhuong',
    avatarUrl: 'https://res.cloudinary.com/binhdev/image/upload/v1775438102/stories/nuuxxnjehlizhhxvam45.jpg',
  },
  {
    email: 'vietphong.uit@gmail.com',
    username: 'vietphong',
    displayName: 'Trần Việt Phong',
    bio: 'Student @ UIT | Learning Fullstack | Seeking mentorship | HCM City',
    devRole: 'student',
    skills: ['javascript', 'react', 'nodejs', 'mongodb'],
    interests: ['frontend', 'backend', 'career'],
    githubUrl: 'https://github.com/vietphong',
    avatarUrl: 'https://res.cloudinary.com/binhdev/image/upload/v1775401939/avatars/p9asrwaclhspknl3koq8.jpg',
  },
  {
    email: 'minhquan.ml@gmail.com',
    username: 'minhquan',
    displayName: 'Nguyễn Minh Quân',
    bio: 'AI/ML Engineer | LLM Fine-tuning | Python | TensorFlow | HCM City',
    devRole: 'developer',
    skills: ['python', 'ai-ml', 'data-science', 'postgresql'],
    interests: ['ai-ml', 'data', 'open-source'],
    githubUrl: 'https://github.com/minhquan',
    avatarUrl: 'https://res.cloudinary.com/binhdev/image/upload/v1776614290/zync/images/69e2647d1680fe1676223bff/q2hgnnbvyn3xaodsgutu.jpg',
  },
  {
    email: 'thanhnam.cyber@gmail.com',
    username: 'thanhnam',
    displayName: 'Lê Thanh Nam',
    bio: 'Security Researcher | Bug Bounty Hunter | CTF Player | HCM City',
    devRole: 'developer',
    skills: ['security', 'python', 'docker', 'ci-cd'],
    interests: ['security', 'open-source', 'freelance'],
    githubUrl: 'https://github.com/thanhnam',
    avatarUrl: 'https://res.cloudinary.com/binhdev/image/upload/v1776618723/zync/images/69e2647d1680fe1676223c00/jhehlpuz4mkpolyidqpq.jpg',
  },
  {
    email: 'huytran.dev@gmail.com',
    username: 'huytran',
    displayName: 'Trần Đức Huy',
    bio: 'Tech Lead | Managing teams | Still love to code | HCM City',
    devRole: 'developer',
    skills: ['typescript', 'react', 'nextjs', 'nodejs', 'postgresql', 'aws'],
    interests: ['fullstack', 'career', 'startup', 'backend'],
    githubUrl: 'https://github.com/huytran',
    avatarUrl: 'https://res.cloudinary.com/binhdev/image/upload/v1775438102/stories/nuuxxnjehlizhhxvam45.jpg',
  },
  {
    email: 'nhattruong.mentor@gmail.com',
    username: 'nhattruong',
    displayName: 'Võ Nhật Trường',
    bio: 'Senior Mentor | 10+ years exp | Career coach | HCM City',
    devRole: 'mentor',
    skills: ['javascript', 'typescript', 'react', 'nodejs', 'python', 'java', 'security'],
    interests: ['career', 'open-source', 'startup', 'fullstack'],
    githubUrl: 'https://github.com/nhattruong',
    avatarUrl: 'https://res.cloudinary.com/binhdev/image/upload/v1775401939/avatars/p9asrwaclhspknl3koq8.jpg',
  },
  {
    email: 'phuongthao.design@gmail.com',
    username: 'phuongthao',
    displayName: 'Nguyễn Phương Thảo',
    bio: 'UI/UX Designer | Frontend Dev | Design Systems | HCM City',
    devRole: 'developer',
    skills: ['react', 'javascript', 'typescript', 'nextjs', 'git'],
    interests: ['frontend', 'career', 'freelance'],
    githubUrl: 'https://github.com/phuongthao',
    avatarUrl: 'https://res.cloudinary.com/binhdev/image/upload/v1776614290/zync/images/69e2647d1680fe1676223bff/q2hgnnbvyn3xaodsgutu.jpg',
  },
  {
    email: 'vanphap.dev@gmail.com',
    username: 'vanphap',
    displayName: 'Lê Văn Pháp',
    bio: 'Game Developer | Unity & Godot | Indie Game Lover | HCM City',
    devRole: 'developer',
    skills: ['c-sharp', 'javascript', 'docker'],
    interests: ['gamedev', 'open-source', 'freelance'],
    githubUrl: 'https://github.com/vanphap',
    avatarUrl: 'https://res.cloudinary.com/binhdev/image/upload/v1776618723/zync/images/69e2647d1680fe1676223c00/jhehlpuz4mkpolyidqpq.jpg',
  },
  {
    email: 'thienphuoc@gmail.com',
    username: 'thienphuoc',
    displayName: 'Trần Thiện Phước',
    bio: 'Junior Dev | Learning everyday | React beginner | HCM City',
    devRole: 'student',
    skills: ['javascript', 'react', 'typescript'],
    interests: ['frontend', 'career'],
    githubUrl: 'https://github.com/thienphuoc',
    avatarUrl: 'https://res.cloudinary.com/binhdev/image/upload/v1775438102/stories/nuuxxnjehlizhhxvam45.jpg',
  },
  {
    email: 'ngoclinh.recruit@gmail.com',
    username: 'ngoclinh',
    displayName: 'Trần Ngọc Linh',
    bio: 'Tech Recruiter | IT Hiring | HCM City | Connecting talent',
    devRole: 'recruiter',
    skills: [],
    interests: ['career', 'startup'],
    githubUrl: '',
    avatarUrl: AVATAR_URLS[13],
  },
  {
    email: 'khanhduy.pmc@gmail.com',
    username: 'khanhduy',
    displayName: 'Đặng Khanh Duy',
    bio: 'DevOps | SRE | Docker & K8s | HCM City',
    devRole: 'developer',
    skills: ['docker', 'kubernetes', 'aws', 'ci-cd', 'postgresql', 'redis'],
    interests: ['devops', 'cloud', 'security'],
    githubUrl: 'https://github.com/khanhduy',
    avatarUrl: AVATAR_URLS[14],
  },
  {
    email: 'thanhlong.dev@gmail.com',
    username: 'thanhlong',
    displayName: 'Hoàng Thanh Long',
    bio: 'Backend Developer | Go & Rust | Performance tuning | HCM City',
    devRole: 'developer',
    skills: ['go', 'rust', 'postgresql', 'redis', 'docker'],
    interests: ['backend', 'devops', 'security'],
    githubUrl: 'https://github.com/thanhlong',
    avatarUrl: AVATAR_URLS[15],
  },
  {
    email: 'mytien.uit@gmail.com',
    username: 'mytien',
    displayName: 'Lê My Tiên',
    bio: 'CS Student @ UIT | Algorithms | Open source contributor | HCM City',
    devRole: 'student',
    skills: ['python', 'javascript', 'git', 'testing'],
    interests: ['frontend', 'backend', 'open-source', 'career'],
    githubUrl: 'https://github.com/mytien',
    avatarUrl: AVATAR_URLS[16],
  },
  {
    email: 'ducthanh.recruit@gmail.com',
    username: 'ducthanh',
    displayName: 'Phạm Đức Thành',
    bio: 'Senior Recruiter | Tech Hiring | Remote-first | HCM City',
    devRole: 'recruiter',
    skills: [],
    interests: ['career', 'startup'],
    githubUrl: '',
    avatarUrl: AVATAR_URLS[17],
  },
];

// Bổ sung thêm 15 user ngẫu nhiên để đạt ~35 user
const EXTRA_USER_TEMPLATES: Array<{
  prefix: string; name: string; role: string;
  bio_template: string;
  skills: string[];
  interests: string[];
}> = [
  { prefix: 'dev01', name: 'Phạm Hùng Cường', role: 'developer', bio_template: 'Fullstack Dev | %skill1% & %skill2% | HCM City', skills: ['typescript', 'react', 'nodejs', 'mongodb'], interests: ['fullstack', 'career'] },
  { prefix: 'dev02', name: 'Ngô Hoàng Nam', role: 'developer', bio_template: 'Backend Dev | Go enthusiast | HCM City', skills: ['go', 'postgresql', 'redis', 'docker'], interests: ['backend', 'devops'] },
  { prefix: 'dev03', name: 'Trương Minh Tuấn', role: 'developer', bio_template: 'React Native Developer | Mobile-first | HCM City', skills: ['react-native', 'javascript', 'typescript'], interests: ['mobile', 'frontend'] },
  { prefix: 'dev04', name: 'Lý Thanh Vân', role: 'developer', bio_template: 'Python Developer | Data lover | HCM City', skills: ['python', 'postgresql', 'data-science'], interests: ['backend', 'data'] },
  { prefix: 'dev05', name: 'Đinh Gia Bảo', role: 'developer', bio_template: 'Cloud Engineer | AWS Certified | HCM City', skills: ['aws', 'docker', 'kubernetes', 'ci-cd'], interests: ['devops', 'cloud'] },
  { prefix: 'dev06', name: 'Võ Thị Mai Lan', role: 'developer', bio_template: 'Frontend Dev | Next.js Wizard | HCM City', skills: ['react', 'vue', 'javascript', 'typescript'], interests: ['frontend', 'freelance'] },
  { prefix: 'dev07', name: 'Bùi Đình Phong', role: 'student', bio_template: 'Student @ VNU | Learning coding | HCM City', skills: ['javascript', 'python', 'git'], interests: ['frontend', 'backend', 'career'] },
  { prefix: 'dev08', name: 'Nguyễn Hữu Thắng', role: 'developer', bio_template: 'Tech Lead | 7+ years | Team management | HCM City', skills: ['typescript', 'react', 'nodejs', 'postgresql'], interests: ['fullstack', 'career', 'startup'] },
  { prefix: 'dev09', name: 'Chu Thị Hương Giang', role: 'developer', bio_template: 'QA Engineer | Test automation | HCM City', skills: ['testing', 'python', 'docker', 'ci-cd'], interests: ['devops', 'security', 'career'] },
  { prefix: 'dev10', name: 'Hồ Quang Vinh', role: 'developer', bio_template: 'Blockchain Dev | Web3 enthusiast | Remote', skills: ['javascript', 'react', 'security'], interests: ['open-source', 'startup'] },
  { prefix: 'dev11', name: 'Trịnh Minh Châu', role: 'student', bio_template: 'CS Student @ BK | Algorithms & CP | HCM City', skills: ['python', 'javascript', 'git'], interests: ['backend', 'open-source'] },
  { prefix: 'dev12', name: 'Phan Thị Thu Hà', role: 'developer', bio_template: 'Product Manager & Dev | Building products | HCM City', skills: ['typescript', 'react', 'nodejs'], interests: ['fullstack', 'startup', 'career'] },
  { prefix: 'dev13', name: 'Đặng Nhật Minh', role: 'developer', bio_template: 'iOS Developer | Swift & SwiftUI | HCM City', skills: ['swift', 'kotlin'], interests: ['mobile', 'career'] },
  { prefix: 'dev14', name: 'Lê Khánh Vy', role: 'developer', bio_template: 'Freelance Dev | WordPress & React | Remote', skills: ['javascript', 'react', 'typescript'], interests: ['frontend', 'freelance'] },
  { prefix: 'dev15', name: 'Trần Đăng Khoa', role: 'developer', bio_template: 'System Admin | Linux lover | HCM City', skills: ['docker', 'kubernetes', 'security', 'aws'], interests: ['devops', 'security', 'cloud'] },
];

// ─── Main Seeding Logic ────────────────────────────────────────────────────────

async function clearAllCollections(): Promise<void> {
  logger.info('Clearing all seed-related collections...');
  await Promise.all([
    NotificationModel.deleteMany({}),
    CallEventModel.deleteMany({}),
    CallParticipantModel.deleteMany({}),
    CallSessionModel.deleteMany({}),
    ModerationLogModel.deleteMany({}),
    PostViewModel.deleteMany({}),
    CommentModel.deleteMany({}),
    PostModel.deleteMany({}),
    MessageReactionUserModel.deleteMany({}),
    MessageReactionSummaryModel.deleteMany({}),
    MessageStatusModel.deleteMany({}),
    MessageModel.deleteMany({}),
    ConversationMemberModel.deleteMany({}),
    ConversationModel.deleteMany({}),
    FriendshipModel.deleteMany({}),
    UserModel.deleteMany({}),
    NotificationPreferenceModel.deleteMany({}),
  ]);
  logger.info('All collections cleared.');
}

async function seedUsers(): Promise<SeedUser[]> {
  logger.info('Seeding users...');

  // Delete existing seed users
  const existingEmails = [
    ...SEED_USER_DEFINITIONS.map((u) => u.email),
    ...EXTRA_USER_TEMPLATES.map((u) => `${u.prefix}@zync.dev`),
  ];
  await UserModel.deleteMany({ email: { $in: existingEmails } });

  const createdUsers: SeedUser[] = [];

  // Seed main users
  for (const def of SEED_USER_DEFINITIONS) {
    const accountAge = randInt(ACCOUNT_AGE_MIN, ACCOUNT_AGE_MAX);
    const isOnline = Math.random() < 0.2; // 20% online
    const lastSeenOffset = isOnline ? 0 : randInt(0, ONE_DAY * 3);

    const user = await UserModel.create({
      email: def.email,
      username: def.username,
      displayName: def.displayName,
      bio: def.bio,
      avatarUrl: def.avatarUrl,
      passwordHash: PASSWORD_HASH,
      skills: def.skills,
      interests: def.interests,
      githubUrl: def.githubUrl || undefined,
      devRole: def.devRole,
      onboardingCompleted: Math.random() > 0.1,
      trustScore: randInt(85, 100),
      globalViolationCount: Math.random() < 0.1 ? randInt(1, 3) : 0,
      isOnline,
      lastSeenAt: isOnline ? null : new Date(NOW - lastSeenOffset),
      createdAt: new Date(NOW - accountAge),
      updatedAt: new Date(NOW - Math.floor(accountAge * 0.3)),
    });

    createdUsers.push({
      _id: user._id.toString(),
      email: user.email!,
      username: user.username!,
      displayName: user.displayName,
      bio: user.bio!,
      avatarUrl: user.avatarUrl || '',
      skills: user.skills || [],
      interests: user.interests || [],
      githubUrl: user.githubUrl || '',
      devRole: user.devRole!,
      onboardingCompleted: user.onboardingCompleted,
      isOnline: user.isOnline,
      lastSeenAt: user.lastSeenAt,
      trustScore: user.trustScore,
      globalViolationCount: user.globalViolationCount,
      createdAt: user.createdAt,
    });
  }

  // Seed extra users
  for (const tmpl of EXTRA_USER_TEMPLATES) {
    const accountAge = randInt(ONE_DAY * 5, ACCOUNT_AGE_MAX);
    const email = `${tmpl.prefix}@zync.dev`;
    const bio = tmpl.bio_template
      .replace('%skill1%', tmpl.skills[0] || 'JavaScript')
      .replace('%skill2%', tmpl.skills[1] || 'React');

    const user = await UserModel.create({
      email,
      username: tmpl.prefix,
      displayName: tmpl.name,
      bio,
      avatarUrl: pickOne(AVATAR_URLS),
      passwordHash: PASSWORD_HASH,
      skills: pickRandom(tmpl.skills, randInt(2, 5)),
      interests: pickRandom(tmpl.interests, randInt(1, 3)),
      devRole: tmpl.role,
      onboardingCompleted: Math.random() > 0.15,
      trustScore: randInt(80, 100),
      globalViolationCount: 0,
      isOnline: Math.random() < 0.15,
      lastSeenAt: Math.random() < 0.5 ? new Date(NOW - randInt(0, ONE_DAY * 7)) : null,
      createdAt: new Date(NOW - accountAge),
      updatedAt: new Date(NOW - Math.floor(accountAge * 0.2)),
    });

    createdUsers.push({
      _id: user._id.toString(),
      email: user.email!,
      username: user.username!,
      displayName: user.displayName,
      bio: user.bio!,
      avatarUrl: user.avatarUrl || '',
      skills: user.skills || [],
      interests: user.interests || [],
      githubUrl: '',
      devRole: user.devRole!,
      onboardingCompleted: user.onboardingCompleted,
      isOnline: user.isOnline,
      lastSeenAt: user.lastSeenAt,
      trustScore: user.trustScore,
      globalViolationCount: user.globalViolationCount,
      createdAt: user.createdAt,
    });
  }

  logger.info(`Seeded ${createdUsers.length} users`);
  return createdUsers;
}

async function seedFriendships(users: SeedUser[]): Promise<void> {
  logger.info('Seeding friendships...');

  const friendships: Array<{ userId: string; friendId: string; status: 'pending' | 'accepted' | 'blocked' }> = [];

  // Friendship graph: main user (binhdev) has friends
  const mainUser = users.find((u) => u.username === 'binhdev')!;
  const otherUsers = users.filter((u) => u.username !== 'binhdev');

  for (const friend of otherUsers.slice(0, 20)) {
    const rand = Math.random();
    if (rand < 0.55) {
      // Accepted friendship (both sides)
      friendships.push({ userId: mainUser._id, friendId: friend._id, status: 'accepted' });
      friendships.push({ userId: friend._id, friendId: mainUser._id, status: 'accepted' });
    } else if (rand < 0.75) {
      // Pending request
      friendships.push({ userId: mainUser._id, friendId: friend._id, status: 'pending' });
    } else if (rand < 0.85) {
      // Incoming request
      friendships.push({ userId: friend._id, friendId: mainUser._id, status: 'pending' });
    } else {
      // Blocked
      friendships.push({ userId: mainUser._id, friendId: friend._id, status: 'blocked' });
    }
  }

  // Add friend connections between other users
  for (let i = 0; i < otherUsers.length - 1; i++) {
    for (let j = i + 1; j < Math.min(i + 5, otherUsers.length); j++) {
      if (Math.random() < 0.4) {
        friendships.push({ userId: otherUsers[i]._id, friendId: otherUsers[j]._id, status: 'accepted' });
        friendships.push({ userId: otherUsers[j]._id, friendId: otherUsers[i]._id, status: 'accepted' });
      }
    }
  }

  await FriendshipModel.insertMany(friendships);
  logger.info(`Seeded ${friendships.length} friendship records`);
}

async function seedConversations(users: SeedUser[]): Promise<void> {
  logger.info('Seeding conversations and messages...');

  const mainUser = users.find((u) => u.username === 'binhdev')!;
  const friends = users.filter((u) => u.username !== 'binhdev');

  // ─── Direct Conversations ───────────────────────────────────────────────────
  const conversationIds: string[] = [];

  for (const friend of friends.slice(0, 12)) {
    const convType = pickOne(['tech', 'casual', 'urgent'] as const);
    const messagePool = DIRECT_MESSAGES_POOL[convType];
    const msgCount = randInt(3, Math.min(messagePool.length, 12));

    // Chọn ngẫu nhiên n tin nhắn và phân bổ thời gian
    const selectedMessages = pickRandom(messagePool, msgCount);
    const startTime = NOW - ONE_DAY * randInt(1, 20);
    const timestamps = randomTimestampsBetween(startTime, NOW, selectedMessages.length);

    // Tạo conversation
    const conversation = await ConversationModel.create({
      type: 'direct',
      adminIds: [],
      lastMessage: {
        content: selectedMessages[selectedMessages.length - 1]?.content || '',
        senderId: selectedMessages[selectedMessages.length - 1]?.sender === 'a' ? mainUser._id : friend._id,
        sentAt: new Date(timestamps[timestamps.length - 1]),
      },
      unreadCounts: {
        [mainUser._id]: randInt(0, 3),
        [friend._id]: randInt(0, 2),
      },
      createdAt: new Date(startTime - ONE_DAY * randInt(1, 5)),
    });

    conversationIds.push(conversation._id.toString());

    await ConversationMemberModel.insertMany([
      { conversationId: conversation._id.toString(), userId: mainUser._id, role: 'member', joinedAt: new Date(startTime - ONE_DAY * 5) },
      { conversationId: conversation._id.toString(), userId: friend._id, role: 'member', joinedAt: new Date(startTime - ONE_DAY * 3) },
    ]);

    // Tạo messages
    const insertedMessages = await MessageModel.insertMany(
      selectedMessages.map((msg, idx) => ({
        conversationId: conversation._id.toString(),
        senderId: msg.sender === 'a' ? mainUser._id : friend._id,
        content: msg.content,
        type: (msg.type || 'text') as 'text' | 'image' | 'video' | 'audio' | 'sticker' | `file/${string}` | 'system-recall',
        mediaUrl: msg.mediaUrl,
        idempotencyKey: ik(),
        reactions: [],
        isDeleted: false,
        createdAt: new Date(timestamps[idx]),
        updatedAt: new Date(timestamps[idx]),
      })),
    );

    // Message status
    const messageStatuses = insertedMessages.flatMap((msg, idx) => {
      const source = selectedMessages[idx];
      const senderId = msg.senderId.toString();
      const receiverId = senderId === mainUser._id ? friend._id : mainUser._id;
      const isRead = timestamps[idx] < NOW - ONE_DAY * randInt(0, 3);
      return [
        { messageId: msg._id.toString(), userId: senderId, status: 'read' as const },
        { messageId: msg._id.toString(), userId: receiverId, status: isRead ? 'read' : pickOne(['delivered', 'sent'] as const) },
      ];
    });
    await MessageStatusModel.insertMany(messageStatuses);
  }

  // ─── Group Conversations ────────────────────────────────────────────────────
  const groupDefs = [
    { name: 'Zync Core Team', category: 'general' as const, memberCount: 5 },
    { name: 'Backend Warriors', category: 'backend' as const, memberCount: 6 },
    { name: 'Frontend Guild', category: 'frontend' as const, memberCount: 4 },
    { name: 'DevOps Squad', category: 'devops' as const, memberCount: 4 },
    { name: 'AI/ML Community', category: 'ai-ml' as const, memberCount: 5 },
    { name: 'Job Opportunities', category: 'career' as const, memberCount: 8 },
    { name: 'Show & Tell Friday', category: 'general' as const, memberCount: 7 },
  ];

  for (const groupDef of groupDefs) {
    const members = [mainUser, ...pickRandom(friends, groupDef.memberCount - 1)];
    const memberIds = members.map((m) => m._id);

    const startTime = NOW - ONE_DAY * randInt(5, 25);
    const msgCount = randInt(8, 20);
    const timestamps = randomTimestampsBetween(startTime, NOW, msgCount);

    const selectedMsgs = pickRandom(GROUP_MESSAGES_POOL, msgCount);

    const conversation = await ConversationModel.create({
      type: 'group',
      name: groupDef.name,
      avatarUrl: pickOne(AVATAR_URLS),
      createdBy: mainUser._id,
      adminIds: [mainUser._id, ...pickRandom(members.slice(1), 1).map((m) => m._id)],
      category: groupDef.category,
      memberCount: members.length,
      lastMessage: {
        content: selectedMsgs[selectedMsgs.length - 1],
        senderId: pickOne(members)._id,
        sentAt: new Date(timestamps[timestamps.length - 1]),
      },
      unreadCounts: members.reduce<Record<string, number>>((acc, m) => {
        acc[m._id] = randInt(0, 5);
        return acc;
      }, {}),
      createdAt: new Date(startTime - ONE_DAY),
    });

    conversationIds.push(conversation._id.toString());

    await ConversationMemberModel.insertMany(
      members.map((m) => ({
        conversationId: conversation._id.toString(),
        userId: m._id,
        role: m._id === mainUser._id ? 'admin' : pickOne(['admin', 'member'] as const),
        joinedAt: new Date(startTime - ONE_DAY + randInt(0, ONE_DAY)),
      })),
    );

    // Tạo messages với sender ngẫu nhiên
    const insertedMessages = await MessageModel.insertMany(
      selectedMsgs.map((content, idx) => {
        const sender = pickOne(members);
        return {
          conversationId: conversation._id.toString(),
          senderId: sender._id,
          content,
          type: 'text' as const,
          idempotencyKey: ik(),
          reactions: [],
          isDeleted: false,
          createdAt: new Date(timestamps[idx]),
          updatedAt: new Date(timestamps[idx]),
        };
      }),
    );

    // Message status: everyone who is not sender is either delivered or read
    const messageStatuses = insertedMessages.flatMap((msg) => {
      const senderId = msg.senderId.toString();
      return members
        .filter((m) => m._id !== senderId)
        .map((m) => ({
          messageId: msg._id.toString(),
          userId: m._id,
          status: pickOne(['read', 'read', 'delivered'] as const),
        }));
    });
    await MessageStatusModel.insertMany(messageStatuses);
  }

  // ─── Sticker Messages ───────────────────────────────────────────────────────
  // Add a few sticker messages in some conversations
  const stickerConversations = conversationIds.slice(0, 5);
  for (const convId of stickerConversations) {
    const conv = await ConversationModel.findById(convId).lean();
    if (!conv) continue;

    const memberDocs = await ConversationMemberModel.find({ conversationId: convId }).lean();
    if (memberDocs.length < 2) continue;

    const [member1, member2] = memberDocs;
    const stickerCount = randInt(1, 4);
    const stickerTimestamps = randomTimestampsBetween(NOW - ONE_DAY * 5, NOW, stickerCount);

    const stickers = [
      { emoji: '👍', alt: 'Tuyệt vời!' },
      { emoji: '❤️', alt: 'Yêu thích' },
      { emoji: '😂', alt: 'Haha' },
      { emoji: '🔥', alt: 'Quá hot!' },
    ];

    await MessageModel.insertMany(
      stickers.slice(0, stickerCount).map((s, idx) => ({
        conversationId: convId,
        senderId: idx % 2 === 0 ? member1.userId : member2.userId,
        content: s.alt,
        type: 'sticker' as const,
        idempotencyKey: ik(),
        reactions: [],
        isDeleted: false,
        createdAt: new Date(stickerTimestamps[idx]),
        updatedAt: new Date(stickerTimestamps[idx]),
      })),
    );
  }

  logger.info(`Seeded direct + group conversations with messages`);
}

async function seedPosts(users: SeedUser[]): Promise<void> {
  logger.info('Seeding posts...');

  const activeUsers = users.filter((u) => u.onboardingCompleted);
  const postCount = randInt(18, 25);

  for (let i = 0; i < postCount; i++) {
    const author = pickOne(activeUsers);
    const title = pickOne(POST_TITLES_POOL);
    const content = pickOne(POST_CONTENTS_POOL);
    const createdAt = new Date(randomTimestamp(1.2));
    const likedBy = pickRandom(activeUsers.filter((u) => u._id !== author._id), randInt(2, 10));
    const bookmarkedBy = pickRandom(activeUsers.filter((u) => u._id !== author._id), randInt(1, 5));

    const post = await PostModel.create({
      authorId: author._id,
      title,
      content,
      tags: pickRandom(['typescript', 'react', 'nodejs', 'python', 'devops', 'career', 'ai-ml', 'mongodb', 'docker', 'security'], randInt(2, 5)),
      type: pickOne(['discussion', 'question', 'til', 'showcase', 'tutorial'] as const),
      likesCount: likedBy.length,
      commentsCount: 0,
      viewsCount: randInt(10, 200),
      likedBy: likedBy.map((u) => u._id),
      bookmarkedBy: bookmarkedBy.map((u) => u._id),
      favoritedBy: [],
      status: 'published',
      createdAt,
      updatedAt: createdAt,
    });

    // Comments for this post
    const commentCount = randInt(2, 8);
    const commentTimestamps = randomTimestampsBetween(createdAt.getTime(), NOW, commentCount);

    const insertedComments = await CommentModel.insertMany(
      Array.from({ length: commentCount }, (_, idx) => {
        const commenter = pickOne(activeUsers.filter((u) => u._id !== author._id));
        const commentLikers = pickRandom(activeUsers.filter((u) => u._id !== commenter._id), randInt(0, 4));
        return {
          postId: post._id.toString(),
          authorId: commenter._id,
          content: pickOne(COMMENT_CONTENTS_POOL),
          codeSnippet: idx === 0 && Math.random() < 0.3 ? '// code example\nconsole.log("Hello World");' : undefined,
          parentId: idx > 0 && Math.random() < 0.3 ? undefined : undefined,
          likesCount: commentLikers.length,
          likedBy: commentLikers.map((u) => u._id),
          createdAt: new Date(commentTimestamps[idx]),
          updatedAt: new Date(commentTimestamps[idx]),
        };
      }),
    );

    // Update post comment count
    post.commentsCount = insertedComments.length;
    await post.save();

    // Post views
    const views = pickRandom(users.filter((u) => u._id !== author._id), randInt(5, 20));
    await PostViewModel.insertMany(
      views.map((viewer) => ({
        postId: post._id.toString(),
        viewerKey: viewer._id,
        lastViewedAt: new Date(createdAt.getTime() + randInt(0, ONE_DAY)),
      })),
    );
  }

  logger.info('Seeded posts with comments and views');
}

async function seedNotifications(users: SeedUser[]): Promise<void> {
  logger.info('Seeding notifications...');

  const mainUser = users.find((u) => u.username === 'binhdev')!;
  const friends = users.filter((u) => u.username !== 'binhdev');

  const notifications: Array<{
    userId: string;
    type: 'new_message' | 'friend_request' | 'friend_accepted' | 'group_invite' | 'post_like' | 'post_comment' | 'post_bookmark' | 'community_post';
    title: string;
    body: string;
    fromUserId?: string;
    conversationId?: string;
    read: boolean;
    createdAt: Date;
  }> = [];

  // Friend request notifications
  for (const friend of friends.slice(0, 5)) {
    notifications.push({
      userId: mainUser._id,
      type: 'friend_request',
      title: 'Lời mời kết bạn mới',
      body: `${friend.displayName} đã gửi lời mời kết bạn`,
      fromUserId: friend._id,
      read: Math.random() < 0.5,
      createdAt: new Date(NOW - randInt(0, ONE_DAY * 5)),
    });
  }

  // Message notifications (unread)
  const convs = await ConversationModel.find({ type: 'direct' }).limit(3).lean();
  for (const conv of convs) {
    const senderId = conv.lastMessage?.senderId;
    if (!senderId || senderId === mainUser._id) continue;
    const sender = users.find((u) => u._id === senderId);
    if (!sender) continue;

    notifications.push({
      userId: mainUser._id,
      type: 'new_message',
      title: 'Tin nhắn mới',
      body: conv.lastMessage?.content || 'Bạn có tin nhắn mới',
      fromUserId: sender._id,
      conversationId: conv._id.toString(),
      read: false,
      createdAt: new Date(NOW - randInt(0, ONE_HOUR * 3)),
    });
  }

  // Post activity notifications
  const posts = await PostModel.find({ authorId: mainUser._id }).limit(5).lean();
  for (const post of posts) {
    const liker = pickOne(friends);
    notifications.push({
      userId: mainUser._id,
      type: 'post_like',
      title: 'Bài viết được thích',
      body: `${liker.displayName} đã thích bài viết "${post.title.slice(0, 30)}..."`,
      fromUserId: liker._id,
      read: Math.random() < 0.6,
      createdAt: new Date(NOW - randInt(0, ONE_DAY * 2)),
    });
  }

  // Community post notifications
  for (const friend of friends.slice(5, 8)) {
    notifications.push({
      userId: mainUser._id,
      type: 'community_post',
      title: 'Bài viết mới từ bạn bè',
      body: `${friend.displayName} đã đăng bài viết mới`,
      fromUserId: friend._id,
      read: Math.random() < 0.4,
      createdAt: new Date(NOW - randInt(0, ONE_DAY)),
    });
  }

  // Friend accepted notifications
  for (const friend of friends.slice(0, 3)) {
    notifications.push({
      userId: mainUser._id,
      type: 'friend_accepted',
      title: 'Chấp nhận lời mời kết bạn',
      body: `${friend.displayName} đã chấp nhận lời mời kết bạn`,
      fromUserId: friend._id,
      read: Math.random() < 0.7,
      createdAt: new Date(NOW - randInt(ONE_DAY, ONE_WEEK)),
    });
  }

  await NotificationModel.insertMany(notifications);
  logger.info(`Seeded ${notifications.length} notifications`);
}

async function seedCalls(users: SeedUser[]): Promise<void> {
  logger.info('Seeding call sessions...');

  const mainUser = users.find((u) => u.username === 'binhdev')!;
  const friends = users.filter((u) => u.username !== 'binhdev');

  const callSessions: Array<{
    conversationId?: string;
    callType: 'video';
    mode: 'p2p' | 'sfu';
    status: 'ringing' | 'connecting' | 'connected' | 'ended' | 'missed' | 'rejected';
    initiatedBy: string;
    participantIds: string[];
    startedAt?: Date;
    endedAt?: Date;
    endedReason?: string;
    createdAt: Date;
  }> = [];

  const callTimestamps = randomTimestampsBetween(NOW - ONE_WEEK, NOW, 8);

  for (let i = 0; i < 8; i++) {
    const friend = pickOne(friends);
    const status = pickOne(['connected', 'connected', 'missed', 'rejected', 'ended'] as const);
    const createdAt = new Date(callTimestamps[i]);

    const session: typeof callSessions[0] = {
      conversationId: undefined,
      callType: 'video',
      mode: 'p2p',
      status,
      initiatedBy: i % 2 === 0 ? mainUser._id : friend._id,
      participantIds: [mainUser._id, friend._id],
      createdAt,
    };

    if (status === 'connected') {
      session.startedAt = new Date(createdAt.getTime() + randInt(5_000, 15_000));
      session.endedAt = new Date(session.startedAt.getTime() + randInt(60_000, 600_000)); // 1-10 phút
      session.endedReason = 'normal_end';
    } else if (status === 'missed') {
      session.timeoutAt = new Date(createdAt.getTime() + 30_000);
      session.endedAt = session.timeoutAt;
      session.endedReason = 'timeout';
    } else if (status === 'rejected') {
      session.endedAt = new Date(createdAt.getTime() + randInt(2_000, 8_000));
      session.endedReason = 'rejected';
    } else if (status === 'ended') {
      session.startedAt = new Date(createdAt.getTime() + randInt(3_000, 10_000));
      session.endedAt = new Date(session.startedAt.getTime() + randInt(10_000, 300_000));
      session.endedReason = 'normal_end';
    }

    const doc = await CallSessionModel.create(session);
    const sessionId = doc._id.toString();

    // Call participants
    const participantDocs = [
      {
        sessionId,
        userId: mainUser._id,
        role: i % 2 === 0 ? 'caller' : 'callee' as const,
        status: status === 'connected' || status === 'ended' ? 'joined' : pickOne(['invited', 'missed', 'left'] as const),
        joinedAt: session.startedAt,
        leftAt: session.endedAt && session.participantIds[0] === mainUser._id ? session.endedAt : undefined,
      },
      {
        sessionId,
        userId: friend._id,
        role: i % 2 === 0 ? 'callee' : 'caller' as const,
        status: status === 'connected' ? 'joined' : pickOne(['invited', 'rejected', 'missed', 'joined'] as const),
        joinedAt: status === 'connected' ? new Date((session.startedAt?.getTime() || 0) + randInt(1_000, 5_000)) : undefined,
        leftAt: session.endedAt ? new Date(session.endedAt.getTime() - randInt(0, 30_000)) : undefined,
      },
    ];
    await CallParticipantModel.insertMany(participantDocs);

    // Call events
    const events = [
      { sessionId, actorUserId: session.initiatedBy, type: 'call_invite', createdAt },
    ];
    if (session.startedAt) {
      events.push({ sessionId, actorUserId: session.initiatedBy, type: 'call_accepted', createdAt: session.startedAt });
    }
    if (session.endedAt) {
      events.push({ sessionId, actorUserId: session.initiatedBy, type: 'call_ended', createdAt: session.endedAt });
    }
    await CallEventModel.insertMany(events);
  }

  logger.info('Seeded call sessions');
}

async function seedModerationLogs(users: SeedUser[]): Promise<void> {
  logger.info('Seeding moderation logs...');

  const activeUsers = users.slice(0, 5);
  const sampleMessages = await MessageModel.find({ type: 'text' }).limit(20).lean();

  const logs = sampleMessages.slice(0, 5).map((msg) => ({
    messageId: msg._id.toString(),
    conversationId: msg.conversationId,
    senderId: msg.senderId.toString(),
    contentType: 'text' as const,
    contentText: msg.content?.slice(0, 200),
    label: pickOne(['safe', 'safe', 'safe', 'warning'] as const),
    confidence: randFloat(0.85, 0.99),
    reason: 'Content passed automated filter',
    action: pickOne(['pass', 'pass', 'flag'] as const),
    source: pickOne(['gemini', 'keyword_filter'] as const),
    createdAt: msg.createdAt,
  }));

  if (logs.length > 0) {
    await ModerationLogModel.insertMany(logs);
  }

  logger.info('Seeded moderation logs');
}

async function seedNotificationPreferences(users: SeedUser[]): Promise<void> {
  logger.info('Seeding notification preferences...');

  await NotificationPreferenceModel.insertMany(
    users.map((user) => ({
      userId: user._id,
      mutedConversations: [],
      pinnedConversations: [],
      enablePush: Math.random() > 0.1,
      enableSound: Math.random() > 0.2,
      enableBadge: true,
    })),
  );

  logger.info('Seeded notification preferences');
}

// ─── Sticker Packs ─────────────────────────────────────────────────────────────

async function ensureStickerPacks(): Promise<void> {
  const count = await StickerPackModel.countDocuments();
  if (count > 0) {
    logger.info(`Sticker packs already exist (${count}), skipping`);
    return;
  }

  const CDN_URL = process.env.STICKER_CDN_URL || 'https://res.cloudinary.com/dfzp860lh/image/upload/';

  const packs = [
    {
      packId: 'tra-loi-nhanh',
      packName: 'Trả lời nhanh',
      packDescription: 'Sticker trả lời nhanh cho mọi tình huống',
      order: 1,
      stickers: [
        { stickerId: 'quick-1', mediaUrl: `${CDN_URL}v1776575279/zapynoel_thumb_l35beo.png`, alt: 'Tuyệt vời!', category: 'quick' },
        { stickerId: 'quick-2', mediaUrl: `${CDN_URL}v1776575335/webpc_ah8lie.png`, alt: 'Ok!', category: 'quick' },
        { stickerId: 'quick-3', mediaUrl: `${CDN_URL}v1776575409/cotsongzookiz_thumb_e2tg3f.png`, alt: 'Haha!', category: 'quick' },
      ],
    },
    {
      packId: 'tho',
      packName: 'Thỏ',
      packDescription: 'Sticker thỏ dễ thương',
      order: 2,
      stickers: [
        { stickerId: 'owl-1', mediaUrl: `${CDN_URL}v1776575531/webpc_1_xpdzqn.png`, alt: 'Cú vui vẻ', category: 'owl' },
        { stickerId: 'owl-2', mediaUrl: `${CDN_URL}v1776575555/webpc_2_z2xtvf.png`, alt: 'Cú buồn', category: 'owl' },
        { stickerId: 'owl-3', mediaUrl: `${CDN_URL}v1776575602/webpc_3_lidlph.png`, alt: 'Cú tức giận', category: 'owl' },
      ],
    },
  ];

  await StickerPackModel.insertMany(packs);
  logger.info('Seeded sticker packs');
}

// ─── Main ──────────────────────────────────────────────────────────────────────

const ONE_HOUR = 3_600_000;

async function seed(): Promise<void> {
  try {
    logger.info('=== Starting comprehensive 1-month seed data generation ===');
    logger.info(`Time range: ${new Date(NOW - ONE_MONTH).toISOString()} → ${new Date(NOW).toISOString()}`);

    await connectDatabase();
    logger.info('Connected to database');

    // Clear existing seed data
    await clearAllCollections();

    // Seed sticker packs first (reference data)
    await ensureStickerPacks();

    // Seed in dependency order
    const users = await seedUsers();
    await seedFriendships(users);
    await seedConversations(users);
    await seedPosts(users);
    await seedNotifications(users);
    await seedCalls(users);
    await seedModerationLogs(users);
    await seedNotificationPreferences(users);

    // ─── Summary ───────────────────────────────────────────────────────────────
    logger.info('');
    logger.info('========================================');
    logger.info('=== SEED DATA GENERATION COMPLETE ===');
    logger.info('========================================');
    logger.info('');
    logger.info('Tài khoản đăng nhập (email / password):');
    logger.info(`  Password chung: ${DEFAULT_PASSWORD}`);
    logger.info('');
    const mainUsers = users.slice(0, 10);
    for (const user of mainUsers) {
      logger.info(`  - ${user.displayName} (@${user.username}) | ${user.email}`);
    }
    logger.info(`  ... và ${users.length - 10} user khác`);
    logger.info('');
    logger.info('Thống kê dữ liệu:');

    const stats = await Promise.all([
      UserModel.countDocuments(),
      FriendshipModel.countDocuments(),
      ConversationModel.countDocuments(),
      MessageModel.countDocuments(),
      PostModel.countDocuments(),
      CommentModel.countDocuments(),
      NotificationModel.countDocuments(),
      CallSessionModel.countDocuments(),
    ]);

    logger.info(`  - Users: ${stats[0]}`);
    logger.info(`  - Friendships: ${stats[1]}`);
    logger.info(`  - Conversations: ${stats[2]}`);
    logger.info(`  - Messages: ${stats[3]}`);
    logger.info(`  - Posts: ${stats[4]}`);
    logger.info(`  - Comments: ${stats[5]}`);
    logger.info(`  - Notifications: ${stats[6]}`);
    logger.info(`  - Call Sessions: ${stats[7]}`);
    logger.info('');
    logger.info('Phân bổ thời gian: ~70% hoạt động 7 ngày gần nhất');
    logger.info('                    ~20% tuần 2-3 trước');
    logger.info('                    ~10% tuần thứ 4 trước');
  } catch (error) {
    logger.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
}

void seed();
