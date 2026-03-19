# Zalo Clone – Hệ thống Nhắn tin Thời gian thực

**Phiên bản:** 2.0 (Production-Grade)  
**Ngày khởi tạo:** 10/03/2026  
**Kiến trúc:** Scaled Modular Monolith (hướng tới Microservices)

---

## Mục tiêu & Phạm vi

Hệ thống nhắn tin tức thời quy mô vài nghìn người dùng, hỗ trợ chat 1-1, nhóm, chia sẻ media, story 24h và quản lý bạn bè. Mục tiêu thay thế ứng dụng chat thương mại với khả năng kiểm soát dữ liệu nội bộ và tối ưu chi phí.

**Phạm vi bao gồm:**
- Web app (Next.js/React) và Mobile (React Native)
- Backend API + Real-time server (Socket.IO)
- Redis (Pub/Sub, Presence, Cache) + Kafka (Message Queue) + MongoDB (Persistence)
- Tích hợp: Twilio (SMS OTP), Resend (Email SMTP), FCM/APNs (Push), Cloudflare R2 / AWS S3 (Media)

---

## Cách chạy Local

> **Hybrid setup** – chỉ chạy Docker cho Redis + Redpanda (~155MB RAM tổng).
> MongoDB, Storage, Email, Push dùng cloud free tier.

```bash
# 1. Clone & cài dependencies
git clone <repo-url>
cd zync-platform
npm install

# 2. Copy env và điền credentials cloud (xem bảng biến môi trường)
cp .env.example .env

# 3. Khởi động Redis + Redpanda (Kafka-compatible)
docker compose -f infra/docker-compose.yml up -d

# Kiểm tra services local:
#   Redis          → redis://localhost:6379
#   Kafka          → localhost:9092  (Redpanda, Kafka-compatible)
#   Redpanda UI    → http://localhost:8080

# 4. Chạy Chat Server
npm run dev:server

# 5. Chạy Web Client
npm run dev:web
```

> **Docker Compose** chỉ chạy 2 service: `redis` + `redpanda` + `redpanda-console`.

---

## Cấu hình & Biến môi trường quan trọng

| Biến | Mô tả | Dev / Staging | Production |
|------|-------|---------------|------------|
| `MONGODB_URI` | MongoDB connection URI | Atlas M0 URI | Atlas M10+ URI (format không đổi) |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` (Docker local) | Upstash: `rediss://...upstash.io:6380` |
| `KAFKA_BROKERS` | Kafka broker (host:port) | `localhost:9092` (Redpanda local) | Upstash Kafka endpoint |
| `KAFKA_SASL_USERNAME` | Kafka SASL username | _(không cần – Redpanda local không có SASL)_ | Từ Upstash console |
| `KAFKA_SASL_PASSWORD` | Kafka SASL password | _(không cần)_ | Từ Upstash console |
| `JWT_SECRET` | Signing key access token | bất kỳ chuỗi | chuỗi ngẫu nhiên ≥ 64 ký tự |
| `JWT_REFRESH_SECRET` | Signing key refresh token | bất kỳ chuỗi | chuỗi ngẫu nhiên ≥ 64 ký tự |
| `OTP_HARDCODE` | Bật OTP cứng (không gửi thật) | `true` | `false` |
| `OTP_HARDCODE_VALUE` | Giá trị OTP cố định | `123456` | _(bỏ trống)_ |
| `SMTP_HOST` | SMTP server | `smtp.resend.com` | `smtp.resend.com` |
| `SMTP_PORT` | SMTP port | `587` | `587` |
| `SMTP_USER` | SMTP username | `resend` (literal) | `resend` (literal) |
| `SMTP_PASS` | SMTP password (Resend API key) | Resend API key (free) | Resend API key (pay-as-you-go) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Từ Cloudinary dashboard | Từ Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Từ Cloudinary console | Từ Cloudinary console |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Từ Cloudinary console | Từ Cloudinary console |
| `CLOUDINARY_UPLOAD_PRESET` | Upload preset name | `zync-media` | `zync-media-prod` |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging key | _(không cần trong dev)_ | key từ Firebase Console |

---

## Giả định (Assumptions)

**Dev & Staging (hybrid: Docker local + cloud free tier):**
- **Redis**: chạy local Docker (`redis:7-alpine`, ~5MB RAM). Upstash 10K cmd/ngày không đủ cho real-time app (mỗi socket event tiêu thụ 3–5 Redis command).
- **Kafka**: chạy local Docker via **Redpanda** (~150MB RAM, không cần Zookeeper, Kafka API 100% tương thích). Upstash Kafka 10K msg/ngày không đủ và SASL/SSL bắt buộc gây phức tạp không cần thiết khi dev.
- **MongoDB Atlas M0**: 512MB storage, shared cluster – đủ cho dev, không có SLA. Cần kết nối internet.
- **Cloudinary**: 25 credits/tháng free (storage + transformations + bandwidth). Upload flow: server tạo signature bằng `CLOUDINARY_API_SECRET` → client upload thẳng lên Cloudinary CDN. Có thể giữ Cloudinary hoặc upgrade plan khi lên production mà không đổi code.
- **Resend**: dùng SMTP relay `smtp.resend.com:587`, API key làm SMTP password, 100 email/ngày free. Dev dùng `OTP_HARDCODE=true` nnên hầu như không tốn quota.
- Tổng RAM local: ~155MB (Redis 5MB + Redpanda 150MB).
- Switch giữa môi trường **chỉ qua file `.env`**, không thay đổi code.

**Production (chỉ đổi `.env`, không đổi code):**
- Upgrade Atlas M0 → M10+ trên Atlas Dashboard, URI format không đổi.
- Đổi `REDIS_URL` sang Upstash `rediss://...` (TLS). Infrastructure code phải hỗ trợ TLS dựa vào URL prefix.
- Đổi `KAFKA_BROKERS` sang Upstash endpoint + thêm `KAFKA_SASL_USERNAME`/`KAFKA_SASL_PASSWORD`. Infrastructure code xử lý SASL khi các biến này tồn tại.
- Cloudinary có thể giữ nguyên hoặc upgrade plan nếu cần dung lượng lớn hơn.
- MongoDB chạy ở chế độ replica set 3 node, Kafka ít nhất 3 partition.
- Các client đã hỗ trợ WebSocket (Socket.IO).

---

## Quyết định kiến trúc (Decisions)

| # | Quyết định | Lý do |
|---|-----------|-------|
| D1 | Dùng Kafka làm message buffer | Đảm bảo durability, tránh mất tin nhắn khi DB chậm |
| D2 | Redis Pub/Sub cho cross-server | Đồng bộ real-time giữa nhiều Chat Server instance |
| D3 | MongoDB làm primary DB | Phù hợp với schema linh hoạt và dữ liệu document |
| D4 | Cursor-based pagination | Tránh offset pagination bị lệch khi có dữ liệu mới |
| D5 | Cloudinary signed upload cho media | Server tạo signature, client upload thẳng lên Cloudinary CDN – không qua server, tích hợp CDN + image transformation miễn phí |
| D6 | Idempotency key cho tin nhắn | Chống gửi trùng do retry từ client |
| D7 | Modular Monolith trước Microservices | Giảm complexity triển khai ở giai đoạn đầu |
| D8 | Hybrid dev: Redis+Kafka local Docker, MongoDB+Cloudinary+Resend cloud | Redis 10K cmd/ngày không đủ cho real-time; Redpanda nhẹ hơn Kafka+ZK 4x; Cloudinary có CDN+transformation miễn phí và giữ nguyên lên production |

---

## Yêu cầu phi chức năng chính

- **Latency:** Tin nhắn < 200ms (p95 < 500ms)
- **Scalability:** 500+ CCU/instance, scale ngang không downtime
- **Availability:** 99.9% uptime
- **Security:** JWT HS256/RS256, HTTPS/WSS bắt buộc, rate limiting
- **Test coverage:** > 80% unit test

---

## Roadmap

### Phase 1 – Foundation & Infrastructure
- [x] Khởi tạo monorepo (server + web + mobile) <!-- done: 10/03/2026 -->
- [x] Triển khai base project structure – server/web/mobile skeleton <!-- done: 10/03/2026 -->
- [x] Thiết lập CI/CD pipeline (GitHub Actions – typecheck + test) <!-- done: 10/03/2026 -->
- [x] Fix skeleton chạy được local (tsconfig, duplicate import) <!-- done: 10/03/2026 -->
- [x] Fix TypeScript compilation errors (moduleResolution, AxiosError types) <!-- done: 10/03/2026 -->
- [x] Migrate dev setup sang Hybrid: Redis+Redpanda Docker, Atlas M0+Cloudinary+Resend cloud <!-- done: 11/03/2026 -->
- [x] Cập nhật .env.example theo hybrid setup mới <!-- done: 11/03/2026 -->
- [x] Thay aws-sdk sang cloudinary, nâng nodemailer lên v8 (fix high CVE) <!-- done: 11/03/2026 -->
- [x] Fix dotenv path – load .env từ root monorepo <!-- done: 12/03/2026 -->
- [x] Viết README.md chuẩn documentation <!-- done: 12/03/2026 -->
- [x] Verify toàn bộ connections: MongoDB Atlas + Redis + Kafka (Redpanda) <!-- done: 12/03/2026 -->
- [x] Dựng UI theme login web theo mẫu green-glass (responsive desktop/mobile) <!-- done: 15/03/2026 -->
- [x] Refactor Login UI theo Atomic Design từ ảnh mẫu (atoms/molecules/organisms + mock data) <!-- done: 19/03/2026 -->
- [x] Dựng trang chủ Web (Phase 1) theo layout `trangchu.png` và điều hướng sang Auth flow <!-- done: 19/03/2026 -->
- [x] Code lại landing route `/` theo mẫu UI mới (glassmorphism + hero + metrics + CTA + footer) <!-- done: 19/03/2026 -->
- [x] Chuẩn hóa typography toàn hệ thống Web sang font Be Vietnam Pro <!-- done: 19/03/2026 -->

### Phase 2 – Authentication & User Management (Module F1–F4)
- [x] POST /api/auth/register – gửi OTP qua Twilio/Email <!-- done: 15/03/2026 -->
- [x] POST /api/auth/verify-otp – xác thực OTP, trả JWT <!-- done: 15/03/2026 -->
- [x] POST /api/auth/refresh – refresh access token <!-- done: 15/03/2026 -->
- [x] POST /api/auth/logout – thu hồi token, xóa device token <!-- done: 15/03/2026 -->
- [x] Quản lý device tokens (FCM/APNs/Web Push) <!-- done: 15/03/2026 -->
- [x] Rate limit OTP: 3 lần/giờ/IP hoặc SĐT <!-- done: 15/03/2026 -->
- [x] Harden Auth middleware: kiểm tra blacklist token trên mọi route bảo vệ <!-- done: 19/03/2026 -->
- [x] Bổ sung integration test cho users routes (me/profile/device token/revoked token) <!-- done: 19/03/2026 -->
- [x] Cập nhật Web Auth UI tiếng Việt (Đăng nhập/Đăng ký) theo Atomic Design <!-- done: 19/03/2026 -->
- [x] Kết nối Web Auth flow Phase 2: request OTP, verify OTP, lưu access token memory, logout <!-- done: 19/03/2026 -->
- [x] Chuẩn hóa route web auth: `/auth` và chuyển hướng sang Phase 3 sau đăng nhập thành công <!-- done: 19/03/2026 -->
- [x] Bổ sung đăng nhập Email + Password + OTP (request OTP + verify OTP) cho Phase 2 <!-- done: 19/03/2026 -->
- [x] Bổ sung đăng nhập Google bằng Google ID Token (Backend + Web action) <!-- done: 19/03/2026 -->
- [x] Bắt buộc đăng nhập bằng Email + Password + OTP (loại bỏ luồng login OTP-only cho tài khoản đã tồn tại) <!-- done: 19/03/2026 -->
- [x] Bổ sung luồng Quên mật khẩu: request OTP + reset mật khẩu mới <!-- done: 19/03/2026 -->
- [x] Chuẩn hóa OTP gửi thực ngoài môi trường test (OTP hardcode chỉ cho NODE_ENV=test) <!-- done: 19/03/2026 -->
- [x] Fix OTP rate limit nhận diện đúng identifier cho các API dùng trường `email`/`phoneNumber` <!-- done: 19/03/2026 -->
- [x] Xử lý lỗi Resend sandbox rõ ràng (không trả 500 mơ hồ, trả hướng dẫn verify domain/SMTP_FROM) <!-- done: 19/03/2026 -->
- [x] Tạm thời bật lại OTP_HARDCODE cho môi trường dev/non-production, giữ SMTP/SMS cho production deploy <!-- done: 19/03/2026 -->
- [x] Chuẩn hóa chiều rộng UI Web theo container dùng chung cho `/`, `/auth`, `/friends` <!-- done: 19/03/2026 -->
- [x] Nâng cấp landing page `/` với fixed header, scroll section và bố cục chuẩn landing <!-- done: 19/03/2026 -->
- [x] Cân đối lại bố cục trang auth theo hướng center đồng bộ design login <!-- done: 19/03/2026 -->
- [x] Sau đăng nhập thành công chuyển về trang chủ `/` theo thiết kế trang chủ <!-- done: 19/03/2026 -->

### Phase 3 – Friends & Contacts (Module F5–F9)
- [x] Gửi / chấp nhận / từ chối lời mời kết bạn <!-- done: 19/03/2026 -->
- [x] Hủy kết bạn, chặn/bỏ chặn người dùng <!-- done: 19/03/2026 -->
- [x] API danh sách bạn bè với cursor pagination <!-- done: 19/03/2026 -->
- [x] Cache friends list trong Redis (TTL 10 phút) <!-- done: 19/03/2026 -->
- [ ] (Optional) Đồng bộ danh bạ điện thoại
- [x] Bổ sung API `GET /api/friends/requests` và `GET /api/users/search` phục vụ UI luồng kết bạn <!-- done: 19/03/2026 -->
- [x] Dựng Friends Dashboard Web (search/send request/incoming-outgoing/list/unfriend/block) tại route `/friends` <!-- done: 19/03/2026 -->

### Phase 4 – Group Management (Module F10–F16)
- [ ] Tạo nhóm (tối đa 100 thành viên)
- [ ] Cập nhật thông tin nhóm (admin only)
- [ ] Thêm / xóa thành viên, rời nhóm
- [ ] Phân quyền admin/member
- [ ] Xóa nhóm (admin only)
- [ ] Socket event `group_updated` khi có thay đổi

### Phase 5 – Real-time Messaging (Module F17–F21)
- [ ] WebSocket server với Socket.IO + Redis adapter
- [ ] Gửi/nhận tin nhắn văn bản + emoji (1-1 và nhóm)
- [ ] Upload media qua pre-signed URL flow
- [ ] Message status: sent → delivered → read (2 tick xanh)
- [ ] Typing indicator (TTL 3 giây trong Redis)
- [ ] Đồng bộ đa thiết bị (multi-device sync)
- [ ] Kafka consumer: batch insert vào MongoDB
- [ ] Idempotency key chống gửi trùng

### Phase 6 – Presence & Stories (Module F22–F25)
- [ ] Hiển thị online/offline với bạn bè
- [ ] "Hoạt động lần cuối" khi offline
- [ ] Đăng story text/ảnh (TTL 24h với MongoDB TTL index)
- [ ] Danh sách người đã xem story

### Phase 7 – Notifications (Module F26)
- [ ] Push notification khi có tin nhắn mới + user offline
- [ ] Tích hợp FCM (Android/Web) và APNs (iOS)
- [ ] Kafka consumer worker xử lý gửi notification

### Phase 8 – Quality & Hardening
- [ ] Unit test coverage > 80% (Jest + React Testing Library)
- [ ] Integration test: API + Socket.IO + Kafka mock
- [ ] Load test: Artillery/K6 – 1000 user, 500 msg/s
- [ ] Resilience test: kill Redis/Kafka/MongoDB primary
- [ ] Security test: OWASP Top 10, penetration testing cơ bản
- [ ] Swagger/OpenAPI documentation đầy đủ

### Phase 9 – Observability & Production
- [ ] Prometheus metrics (prom-client, Kafka exporter, MongoDB exporter)
- [ ] Grafana dashboard: CCU, throughput, consumer lag, event loop
- [ ] Log aggregation: Fluentd → Elasticsearch → Kibana
- [ ] Alert: Slack/PagerDuty khi CPU >80%, error rate >1%
- [ ] Backup strategy: MongoDB daily + EBS snapshot + restore test
- [ ] Cấu hình Kubernetes + Helm chart (staging/production)
- [ ] Blue-green deployment lên production

---

## Testing Notes

- Dùng MongoDB Memory Server cho integration test (không cần instance thật).
- Kafka mock dùng `kafkajs` với in-memory mode.
- Socket.IO test dùng `socket.io-client` kết nối test server.
- Load test script lưu tại `tests/load/`.

---

## Feature Notes

- **Idempotency:** Client phải tự sinh UUID cho mỗi `send_message`. Server check Redis 5 phút trước khi ghi MongoDB.
- **Cursor pagination:** Dùng `createdAt` + `_id` làm cursor, tránh `skip()`.
- **Story expiry:** MongoDB TTL index trên `expiresAt`, không cần cronjob riêng.
- **Presence refresh:** Client WebSocket heartbeat 30 giây để giữ online status trong Redis.
