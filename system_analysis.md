# Mo ta he thong ZYNC - Use case, class diagram, co so ly thuyet

## 1) Tinh huong hoat dong (Use case + Activity + Sequence)

### 1.1 Use case: Dang tai bai viet

#### Use case
- Tac nhan: Nguoi dung (User)
- Muc tieu: Dang bai viet len he thong de chia se voi cong dong/ban be
- Tien dieu kien:
  - Nguoi dung da dang nhap
  - Mang hoat dong binh thuong
- Hau dieu kien:
  - Bai viet moi duoc luu vao co so du lieu
  - Bai viet xuat hien tren newsfeed
  - Thong bao cap nhat (neu co)
- Luong chinh:
  1) Nguoi dung mo man hinh tao bai viet
  2) Nguoi dung nhap noi dung, dinh kem anh/video (tuy chon)
  3) Nguoi dung nhan "Dang bai"
  4) He thong kiem tra du lieu (noi dung, dinh kem)
  5) He thong luu bai viet vao DB
  6) He thong cap nhat newsfeed va tra ve ket qua
- Luong thay the/ngoai le:
  - A1) Du lieu khong hop le: hien thi loi, yeu cau sua
  - A2) Upload file that bai: bao loi, cho phep thu lai
  - A3) Mat ket noi: luu nhap tam thoi, thong bao thu lai

#### Activity (mo ta luong hoat dong)
- Bat dau
- Mo man hinh tao bai
- Nhap noi dung
- (Tuy chon) Chon anh/video
- Nhan dang bai
- Kiem tra du lieu
  - Neu loi -> hien thi loi -> quay lai nhap
  - Neu hop le -> luu DB
- Cap nhat newsfeed
- Ket thuc

#### Sequence (mo ta trinh tu tuong tac)
- User -> Mobile/Web UI: Nhap noi dung + nhan Dang bai
- UI -> API Gateway: POST /posts
- API Gateway -> Post Service: validate + create post
- Post Service -> Media Service: upload file (neu co)
- Post Service -> Database: insert post
- Post Service -> Socket Service: emit new-post
- Post Service -> API Gateway: tra ve ket qua
- API Gateway -> UI: response
- UI -> User: hien thi bai viet moi

### 1.2 Use case: Tao nhom

#### Use case
- Tac nhan: Nguoi dung (User)
- Muc tieu: Tao nhom de trao doi/quan ly cong dong nho
- Tien dieu kien:
  - Nguoi dung da dang nhap
- Hau dieu kien:
  - Nhom moi duoc tao
  - Nguoi dung la chu nhom (Owner)
- Luong chinh:
  1) Nguoi dung mo man hinh tao nhom
  2) Nguoi dung nhap ten nhom, mo ta, anh dai dien (tuy chon)
  3) Nguoi dung chon che do cong khai/kin
  4) Nguoi dung nhan "Tao nhom"
  5) He thong kiem tra du lieu
  6) He thong luu nhom vao DB
  7) He thong tra ve ket qua
- Luong thay the/ngoai le:
  - B1) Ten nhom bi trung: bao loi, yeu cau doi ten
  - B2) Upload anh that bai: bao loi, cho phep thu lai

#### Activity (mo ta luong hoat dong)
- Bat dau
- Mo man hinh tao nhom
- Nhap thong tin nhom
- (Tuy chon) Chon anh dai dien
- Chon che do cong khai/kin
- Nhan tao nhom
- Kiem tra du lieu
  - Neu loi -> hien thi loi -> quay lai nhap
  - Neu hop le -> luu DB
- Tao chu nhom va quyen quan tri
- Ket thuc

#### Sequence (mo ta trinh tu tuong tac)
- User -> Mobile/Web UI: Nhap thong tin + nhan Tao nhom
- UI -> API Gateway: POST /groups
- API Gateway -> Group Service: validate + create group
- Group Service -> Media Service: upload avatar (neu co)
- Group Service -> Database: insert group
- Group Service -> Notification/Socket: thong bao tao nhom
- Group Service -> API Gateway: tra ve ket qua
- API Gateway -> UI: response
- UI -> User: hien thi nhom moi

## 2) So do class (mo ta tong quat)

- User
  - id, name, email, avatarUrl, status
  - Methods: updateProfile(), follow(), joinGroup()
- Post
  - id, authorId, content, media, privacy, createdAt
  - Methods: edit(), delete(), addReaction()
- Comment
  - id, postId, authorId, content, createdAt
  - Methods: edit(), delete()
- Group
  - id, name, description, ownerId, privacy, avatarUrl
  - Methods: addMember(), removeMember(), changePrivacy()
- Message
  - id, senderId, roomId, content, type, createdAt
  - Methods: edit(), delete()
- Room/Channel
  - id, type, members, lastMessage
  - Methods: addMember(), removeMember()
- Notification
  - id, receiverId, type, payload, isRead
  - Methods: markRead()
- Media
  - id, url, type, size, ownerId
  - Methods: validate(), remove()

Quan he chinh:
- User 1..* Post
- Post 1..* Comment
- User 1..* Comment
- User *..* Group (qua GroupMember)
- Group 1..* Post
- Room 1..* Message

## 3) Co so ly thuyet va cong nghe su dung

- Kien truc client-server, chia thanh Mobile, Web va Server
- Giao tiep real-time bang Socket.io
- API theo chuan REST
- Quan ly trang thai client bang Redux Toolkit/Zustand (neu su dung)
- Luu tru du lieu bang MongoDB (NoSQL)
- Xac thuc JWT
- Frontend: React, React Native, Expo
- Web: Next.js, Tailwind CSS
- Backend: Node.js, Express (hoac NestJS neu ap dung)
- Tich hop thong bao in-app va realtime
- Docker ho tro deploy va phat trien
