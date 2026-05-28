# Phân tích Use Case

## 1. Tên hệ thống

Zync Platform - Nền tảng nhắn tin, cộng đồng và trợ lý AI cho developer

## 2. Actors

| Actor | Vai trò | Ghi chú |
|---|---|---|
| Khách | Người chưa đăng nhập | Có thể đăng ký, đăng nhập, khôi phục mật khẩu |
| Người dùng | Tài khoản đã xác thực | Actor chính sử dụng chat, bạn bè, hồ sơ, cộng đồng, thông báo và AI |
| Thành viên hội thoại | Người dùng thuộc một hội thoại 1-1 hoặc nhóm | Có quyền nhắn tin, xem lịch sử, gọi, dùng AI trong phạm vi hội thoại |
| Quản trị nhóm | Thành viên có quyền quản trị nhóm/kênh | Quản lý thông tin nhóm, thành viên, vai trò và thiết lập duyệt thành viên |
| Chủ nội dung | Người tạo bài viết cộng đồng | Có quyền sửa/xóa nội dung của mình và xem tương tác liên quan |
| Quản trị viên | Vai trò quản trị hệ thống | Quản lý kiểm duyệt nội dung và gói sticker theo chức năng hiện có |

## 3. Use case chính

| ID | Use case chính | Mô tả ngắn |
|---|---|---|
| UC01 | Quản lý xác thực | Đăng ký, đăng nhập, xác thực OTP, đăng xuất và khôi phục tài khoản |
| UC02 | Quản lý tài khoản | Xem, cập nhật hồ sơ, cài đặt tài khoản và thiết bị nhận thông báo |
| UC03 | Khám phá người dùng | Tìm kiếm, xem hồ sơ công khai và khám phá developer theo kỹ năng |
| UC04 | Quản lý bạn bè | Gửi, xử lý lời mời kết bạn, hủy kết bạn, chặn và bỏ chặn người dùng |
| UC05 | Quản lý hội thoại | Xem danh sách hội thoại và tạo hoặc mở hội thoại trực tiếp |
| UC06 | Nhắn tin | Gửi, xem, phản hồi, chuyển tiếp, thu hồi và xóa tin nhắn |
| UC07 | Quản lý nhóm và kênh | Tạo nhóm/kênh, tham gia, rời, cập nhật thông tin và quản lý thành viên |
| UC08 | Gọi thoại và video | Tạo, nhận, từ chối, kết thúc và theo dõi phiên gọi |
| UC10 | Quản lý bài viết cộng đồng | Tạo, xem, sửa, xóa, tương tác và bình luận bài viết |
| UC11 | Khám phá nội dung cộng đồng | Xem feed, trending, tìm kênh, người dùng và bài viết liên quan |
| UC12 | Quản lý thông báo | Xem, đánh dấu đã đọc, cài đặt thông báo, tắt/bật thông báo hội thoại |
| UC13 | Sử dụng trợ lý AI | Tóm tắt hội thoại, quản lý việc cần làm, tìm kiếm ngữ nghĩa và tạo ghi chú nhóm |
| UC14 | Quản lý media và sticker | Chuẩn bị media để chia sẻ và sử dụng sticker trong hội thoại |
| UC15 | Quản trị kiểm duyệt | Xem nội dung bị gắn cờ, xem thống kê và xử lý kết quả kiểm duyệt |
| UC16 | Quản trị sticker | Tạo và quản lý gói sticker dùng trong hệ thống |

## 4. Use case con

| ID | Use case con | Thuộc use case chính | Loại quan hệ đề xuất | Lý do |
|---|---|---|---|---|
| UC01.1 | Đăng ký tài khoản | Quản lý xác thực | association-only | Khách chủ động tạo tài khoản mới |
| UC01.2 | Xác thực OTP | Quản lý xác thực | include | Bắt buộc trong đăng ký, đăng nhập bằng mật khẩu và khôi phục mật khẩu |
| UC01.3 | Đăng nhập | Quản lý xác thực | association-only | Khách truy cập hệ thống bằng tài khoản đã có |
| UC01.4 | Đăng nhập bằng Google | Quản lý xác thực | extend | Là tùy chọn thay thế đăng nhập bằng email/mật khẩu |
| UC01.5 | Khôi phục mật khẩu | Quản lý xác thực | association-only | Khách xử lý khi quên mật khẩu |
| UC01.6 | Đổi mật khẩu | Quản lý xác thực | association-only | Người dùng đổi mật khẩu khi đã đăng nhập |
| UC01.7 | Đăng xuất | Quản lý xác thực | association-only | Người dùng kết thúc phiên đăng nhập |
| UC02.1 | Xem hồ sơ cá nhân | Quản lý tài khoản | association-only | Người dùng xem thông tin tài khoản của mình |
| UC02.2 | Cập nhật hồ sơ cá nhân | Quản lý tài khoản | association-only | Người dùng sửa display name, bio, kỹ năng, liên kết cá nhân |
| UC02.3 | Cập nhật cài đặt tài khoản | Quản lý tài khoản | association-only | Người dùng thay đổi theme, tùy chọn riêng tư hoặc thiết lập cá nhân |
| UC02.4 | Hoàn tất onboarding | Quản lý tài khoản | extend | Chỉ xảy ra với tài khoản chưa hoàn tất thiết lập ban đầu |
| UC02.5 | Đăng ký thiết bị nhận thông báo | Quản lý tài khoản | include | Cần để nhận push notification trên thiết bị |
| UC03.1 | Tìm kiếm người dùng | Khám phá người dùng | association-only | Người dùng tìm người khác theo username/email/từ khóa |
| UC03.2 | Xem hồ sơ công khai | Khám phá người dùng | association-only | Người dùng xem thông tin công khai của người khác |
| UC03.3 | Khám phá developer nổi bật | Khám phá người dùng | extend | Dựa trên kỹ năng, tags hoặc gợi ý khám phá |
| UC03.4 | Xem trạng thái hoạt động | Khám phá người dùng | extend | Hiển thị presence/last seen khi có dữ liệu phù hợp |
| UC04.1 | Xem danh sách bạn bè | Quản lý bạn bè | association-only | Người dùng xem danh sách quan hệ hiện có |
| UC04.2 | Gửi lời mời kết bạn | Quản lý bạn bè | association-only | Người dùng bắt đầu kết nối với người khác |
| UC04.3 | Xem lời mời kết bạn | Quản lý bạn bè | association-only | Người dùng xem lời mời đến và đã gửi |
| UC04.4 | Chấp nhận lời mời kết bạn | Quản lý bạn bè | extend | Chỉ xảy ra khi có lời mời đang chờ |
| UC04.5 | Từ chối lời mời kết bạn | Quản lý bạn bè | extend | Chỉ xảy ra khi có lời mời đang chờ |
| UC04.6 | Hủy kết bạn | Quản lý bạn bè | extend | Chỉ xảy ra với quan hệ bạn bè hiện có |
| UC04.7 | Chặn người dùng | Quản lý bạn bè | extend | Tùy chọn khi người dùng muốn ngăn tương tác |
| UC04.8 | Bỏ chặn người dùng | Quản lý bạn bè | extend | Chỉ xảy ra với người đang bị chặn |
| UC05.1 | Xem danh sách hội thoại | Quản lý hội thoại | association-only | Người dùng xem các hội thoại hiện có |
| UC05.2 | Tạo hội thoại trực tiếp | Quản lý hội thoại | association-only | Người dùng mở hoặc tạo chat 1-1 với người khác |
| UC05.3 | Mở hội thoại từ hồ sơ hoặc bạn bè | Quản lý hội thoại | extend | Chỉ xảy ra từ luồng điều hướng liên quan |
| UC06.1 | Gửi tin nhắn văn bản | Nhắn tin | association-only | Hành vi nhắn tin cơ bản |
| UC06.2 | Gửi media | Nhắn tin | extend | Tùy chọn khi người dùng đính kèm ảnh, video, audio hoặc file |
| UC06.3 | Gửi sticker | Nhắn tin | extend | Tùy chọn khi người dùng chọn sticker |
| UC06.4 | Xem lịch sử tin nhắn | Nhắn tin | association-only | Thành viên hội thoại xem nội dung đã trao đổi |
| UC06.5 | Đánh dấu tin nhắn đã đọc | Nhắn tin | association-only | Người dùng xác nhận đã đọc tin nhắn |
| UC06.6 | Thả phản ứng tin nhắn | Nhắn tin | extend | Tùy chọn tương tác với tin nhắn |
| UC06.7 | Xem chi tiết phản ứng tin nhắn | Nhắn tin | extend | Chỉ xảy ra khi tin nhắn có phản ứng |
| UC06.8 | Chuyển tiếp tin nhắn | Nhắn tin | extend | Tùy chọn chia sẻ tin nhắn sang hội thoại khác |
| UC06.9 | Thu hồi tin nhắn | Nhắn tin | extend | Chỉ xảy ra khi người gửi muốn thu hồi tin nhắn |
| UC06.10 | Xóa tin nhắn phía mình | Nhắn tin | extend | Chỉ ảnh hưởng trải nghiệm của người dùng hiện tại |
| UC06.11 | Kiểm duyệt nội dung tin nhắn | Nhắn tin | include | Nội dung tin nhắn cần được kiểm duyệt trước hoặc trong quá trình xử lý |
| UC07.1 | Tạo nhóm | Quản lý nhóm và kênh | association-only | Người dùng tạo nhóm chat mới |
| UC07.2 | Cập nhật thông tin nhóm | Quản lý nhóm và kênh | association-only | Quản trị nhóm đổi tên, ảnh hoặc mô tả nhóm |
| UC07.3 | Thêm thành viên nhóm | Quản lý nhóm và kênh | association-only | Quản trị nhóm thêm người vào nhóm |
| UC07.4 | Xóa thành viên nhóm | Quản lý nhóm và kênh | association-only | Quản trị nhóm loại thành viên khỏi nhóm |
| UC07.5 | Rời nhóm | Quản lý nhóm và kênh | association-only | Thành viên tự rời nhóm |
| UC07.6 | Phân quyền thành viên | Quản lý nhóm và kênh | association-only | Quản trị nhóm gán vai trò admin/member |
| UC07.7 | Thiết lập duyệt thành viên | Quản lý nhóm và kênh | association-only | Chủ nhóm bật/tắt yêu cầu phê duyệt thành viên |
| UC07.8 | Giải tán nhóm | Quản lý nhóm và kênh | association-only | Quản trị nhóm xóa nhóm |
| UC07.9 | Khám phá kênh công khai | Quản lý nhóm và kênh | extend | Tùy chọn trong luồng khám phá |
| UC07.10 | Tham gia kênh công khai | Quản lý nhóm và kênh | extend | Chỉ xảy ra với kênh công khai |
| UC08.1 | Bắt đầu cuộc gọi | Gọi thoại và video | association-only | Người dùng tạo phiên gọi thoại hoặc video |
| UC08.2 | Nhận cuộc gọi | Gọi thoại và video | association-only | Người nhận chấp nhận cuộc gọi đến |
| UC08.3 | Từ chối cuộc gọi | Gọi thoại và video | extend | Chỉ xảy ra khi có cuộc gọi đến |
| UC08.4 | Kết thúc cuộc gọi | Gọi thoại và video | association-only | Người tham gia kết thúc phiên gọi |
| UC08.5 | Xem cuộc gọi đang hoạt động | Gọi thoại và video | extend | Chỉ khi người dùng có phiên gọi đang mở |
| UC08.6 | Gọi nhóm | Gọi thoại và video | extend | Chỉ áp dụng trong hội thoại nhóm |
| UC08.7 | Kiểm tra quyền thành viên hội thoại | Gọi thoại và video | include | Người gọi phải thuộc hội thoại liên quan |
| UC10.1 | Tạo bài viết | Quản lý bài viết cộng đồng | association-only | Người dùng đăng bài trong cộng đồng |
| UC10.2 | Xem chi tiết bài viết | Quản lý bài viết cộng đồng | association-only | Người dùng đọc nội dung bài viết |
| UC10.3 | Sửa bài viết | Quản lý bài viết cộng đồng | extend | Chỉ chủ nội dung được sửa bài viết của mình |
| UC10.4 | Xóa bài viết | Quản lý bài viết cộng đồng | extend | Chỉ chủ nội dung được xóa bài viết của mình |
| UC10.5 | Thích bài viết | Quản lý bài viết cộng đồng | extend | Tùy chọn tương tác với bài viết |
| UC10.6 | Lưu bài viết | Quản lý bài viết cộng đồng | extend | Tùy chọn bookmark/favorite bài viết |
| UC10.7 | Bình luận bài viết | Quản lý bài viết cộng đồng | extend | Tùy chọn tham gia thảo luận |
| UC10.8 | Xem bình luận bài viết | Quản lý bài viết cộng đồng | association-only | Người dùng đọc thảo luận dưới bài viết |
| UC10.9 | Kiểm duyệt nội dung bài viết | Quản lý bài viết cộng đồng | include | Nội dung cộng đồng cần được kiểm duyệt |
| UC11.1 | Xem feed cá nhân | Khám phá nội dung cộng đồng | association-only | Người dùng xem dòng nội dung phù hợp |
| UC11.2 | Xem bài viết thịnh hành | Khám phá nội dung cộng đồng | association-only | Người dùng xem nội dung trending |
| UC11.3 | Xem bài viết theo tác giả | Khám phá nội dung cộng đồng | extend | Chỉ khi người dùng quan tâm một tác giả cụ thể |
| UC11.4 | Tìm kiếm đa luồng | Khám phá nội dung cộng đồng | association-only | Người dùng tìm kênh, người dùng và bài viết |
| UC12.1 | Xem danh sách thông báo | Quản lý thông báo | association-only | Người dùng xem các thông báo đã nhận |
| UC12.2 | Xem số thông báo chưa đọc | Quản lý thông báo | association-only | Người dùng biết số lượng thông báo mới |
| UC12.3 | Đánh dấu thông báo đã đọc | Quản lý thông báo | association-only | Người dùng xử lý từng thông báo |
| UC12.4 | Đánh dấu tất cả đã đọc | Quản lý thông báo | extend | Tùy chọn xử lý hàng loạt |
| UC12.5 | Cập nhật tùy chọn thông báo | Quản lý thông báo | association-only | Người dùng chọn loại thông báo muốn nhận |
| UC12.6 | Tắt thông báo hội thoại | Quản lý thông báo | extend | Tùy chọn mute một hội thoại |
| UC12.7 | Bật lại thông báo hội thoại | Quản lý thông báo | extend | Chỉ xảy ra với hội thoại đang bị tắt thông báo |
| UC12.8 | Ghim hội thoại | Quản lý thông báo | extend | Tùy chọn ưu tiên hội thoại |
| UC12.9 | Bỏ ghim hội thoại | Quản lý thông báo | extend | Chỉ xảy ra với hội thoại đang được ghim |
| UC13.1 | Tóm tắt hội thoại | Sử dụng trợ lý AI | association-only | Người dùng tạo hoặc xem digest hội thoại |
| UC13.2 | Tạo lại tóm tắt | Sử dụng trợ lý AI | extend | Chỉ khi người dùng muốn sinh lại kết quả |
| UC13.3 | Quản lý việc cần làm AI | Sử dụng trợ lý AI | association-only | Người dùng xem, tạo, hoàn thành hoặc bỏ qua task từ AI |
| UC13.4 | Tìm kiếm ngữ nghĩa trong tin nhắn | Sử dụng trợ lý AI | association-only | Người dùng hỏi tự nhiên và nhận kết quả có nguồn |
| UC13.5 | Tạo ghi chú nhóm | Sử dụng trợ lý AI | association-only | Người dùng tạo note từ nội dung chat nhóm |
| UC13.6 | Quản lý ghi chú nhóm | Sử dụng trợ lý AI | extend | Ghim, bỏ ghim, xóa hoặc tạo lại ghi chú |
| UC13.7 | Cài đặt AI theo hội thoại | Sử dụng trợ lý AI | extend | Người dùng bật/tắt tính năng AI cho từng hội thoại |
| UC13.8 | Truy xuất nguồn AI | Sử dụng trợ lý AI | include | Kết quả AI cần dẫn về tin nhắn nguồn để kiểm chứng |
| UC14.1 | Chuẩn bị media tải lên | Quản lý media và sticker | association-only | Người dùng chuẩn bị ảnh, video, audio hoặc file để chia sẻ |
| UC14.2 | Xác nhận media đã tải lên | Quản lý media và sticker | include | Media cần được xác nhận trước khi dùng trong nội dung |
| UC14.3 | Xóa media đã tải lên | Quản lý media và sticker | extend | Chỉ khi người dùng hoặc hệ thống cần gỡ media |
| UC14.4 | Xem gói sticker | Quản lý media và sticker | association-only | Người dùng xem danh sách sticker có thể dùng |
| UC14.5 | Chọn sticker | Quản lý media và sticker | association-only | Người dùng chọn sticker để gửi trong hội thoại |
| UC15.1 | Xem danh sách nội dung bị gắn cờ | Quản trị kiểm duyệt | association-only | Quản trị viên xem nội dung cần xử lý |
| UC15.2 | Xem thống kê kiểm duyệt | Quản trị kiểm duyệt | association-only | Quản trị viên theo dõi số lượng và mức độ vi phạm |
| UC15.3 | Duyệt kết quả kiểm duyệt | Quản trị kiểm duyệt | association-only | Quản trị viên quyết định pass/block/mute user |
| UC16.1 | Tạo gói sticker | Quản trị sticker | association-only | Quản trị viên tạo gói sticker mới |
| UC16.2 | Cập nhật gói sticker | Quản trị sticker | extend | Chỉ khi cần sửa nội dung gói sticker |
| UC16.3 | Xóa gói sticker | Quản trị sticker | extend | Chỉ khi cần loại bỏ gói sticker |

## 5. Quan hệ Actor - Use Case

| Actor | Use case | Loại quan hệ | Ghi chú |
|---|---|---|---|
| Khách | Quản lý xác thực | association | Đăng ký, đăng nhập, khôi phục mật khẩu |
| Người dùng | Quản lý xác thực | association | Đổi mật khẩu, đăng xuất |
| Người dùng | Quản lý tài khoản | association | Quản lý hồ sơ, cài đặt và thiết bị |
| Người dùng | Khám phá người dùng | association | Tìm kiếm và xem hồ sơ người khác |
| Người dùng | Quản lý bạn bè | association | Quản lý quan hệ bạn bè |
| Người dùng | Quản lý hội thoại | association | Xem và tạo hội thoại |
| Người dùng | Nhắn tin | association | Gửi, xem, tương tác với tin nhắn |
| Người dùng | Quản lý nhóm và kênh | association | Tạo nhóm, tham gia kênh, rời nhóm |
| Người dùng | Gọi thoại và video | association | Bắt đầu, nhận hoặc kết thúc cuộc gọi |
| Người dùng | Quản lý bài viết cộng đồng | association | Tạo và tương tác với bài viết |
| Người dùng | Khám phá nội dung cộng đồng | association | Xem feed, trending và tìm kiếm nội dung |
| Người dùng | Quản lý thông báo | association | Xem và cấu hình thông báo |
| Người dùng | Sử dụng trợ lý AI | association | Dùng AI trong phạm vi dữ liệu được phép |
| Người dùng | Quản lý media và sticker | association | Chuẩn bị media và chọn sticker |
| Thành viên hội thoại | Nhắn tin | association | Chỉ trong hội thoại mà actor là thành viên |
| Thành viên hội thoại | Gọi thoại và video | association | Chỉ trong hội thoại mà actor là thành viên |
| Thành viên hội thoại | Sử dụng trợ lý AI | association | Chỉ trên hội thoại có quyền truy cập |
| Quản trị nhóm | Quản lý nhóm và kênh | association | Quản lý thông tin, thành viên và vai trò nhóm |
| Chủ nội dung | Quản lý bài viết cộng đồng | association | Sửa/xóa bài viết của mình |
| Quản trị viên | Quản trị kiểm duyệt | association | Xử lý nội dung bị gắn cờ |
| Quản trị viên | Quản trị sticker | association | Quản lý gói sticker |

## 6. Quan hệ Include

| Use case nguồn | Include use case | Lý do include |
|---|---|---|
| Đăng ký tài khoản | Xác thực OTP | Đăng ký yêu cầu xác minh OTP |
| Đăng nhập | Xác thực OTP | Luồng đăng nhập email/mật khẩu yêu cầu OTP |
| Khôi phục mật khẩu | Xác thực OTP | Khôi phục mật khẩu cần xác minh chủ tài khoản |
| Quản lý tài khoản | Đăng ký thiết bị nhận thông báo | Thiết bị cần được đăng ký để nhận push notification |
| Gửi tin nhắn văn bản | Kiểm duyệt nội dung tin nhắn | Tin nhắn cần được kiểm tra nội dung trước hoặc trong quá trình xử lý |
| Gửi media | Chuẩn bị media tải lên | Media phải được chuẩn bị trước khi gửi |
| Gửi media | Xác nhận media đã tải lên | Media cần được xác nhận để sử dụng trong tin nhắn |
| Tạo bài viết | Kiểm duyệt nội dung bài viết | Bài viết cộng đồng cần kiểm duyệt nội dung |
| Bình luận bài viết | Kiểm duyệt nội dung bài viết | Bình luận là nội dung cộng đồng cần kiểm duyệt |
| Bắt đầu cuộc gọi | Kiểm tra quyền thành viên hội thoại | Người gọi phải có quyền trong hội thoại |
| Gọi nhóm | Kiểm tra quyền thành viên hội thoại | Cuộc gọi nhóm chỉ hợp lệ với thành viên nhóm |
| Sử dụng trợ lý AI | Truy xuất nguồn AI | Kết quả AI cần có nguồn kiểm chứng từ tin nhắn |
| Tóm tắt hội thoại | Truy xuất nguồn AI | Digest cần dẫn nguồn tin nhắn |
| Tìm kiếm ngữ nghĩa trong tin nhắn | Truy xuất nguồn AI | Câu trả lời tìm kiếm cần evidence |
| Tạo ghi chú nhóm | Truy xuất nguồn AI | Ghi chú nhóm cần sourceMessageRefs cho quyết định/câu hỏi/action item |

## 7. Quan hệ Extend

| Use case mở rộng | Use case gốc | Điều kiện / Lý do extend |
|---|---|---|
| Đăng nhập bằng Google | Đăng nhập | Người dùng chọn phương thức Google |
| Hoàn tất onboarding | Quản lý tài khoản | Chỉ với tài khoản chưa hoàn tất onboarding |
| Khám phá developer nổi bật | Khám phá người dùng | Khi người dùng muốn tìm người theo kỹ năng/tags |
| Xem trạng thái hoạt động | Khám phá người dùng | Khi có dữ liệu presence/last seen phù hợp |
| Chấp nhận lời mời kết bạn | Quản lý bạn bè | Khi có lời mời đang chờ |
| Từ chối lời mời kết bạn | Quản lý bạn bè | Khi có lời mời đang chờ |
| Hủy kết bạn | Quản lý bạn bè | Khi đã là bạn bè |
| Chặn người dùng | Quản lý bạn bè | Khi người dùng muốn chặn tương tác |
| Bỏ chặn người dùng | Quản lý bạn bè | Khi người dùng đã bị chặn |
| Mở hội thoại từ hồ sơ hoặc bạn bè | Quản lý hội thoại | Khi người dùng đi từ hồ sơ/bạn bè sang chat |
| Gửi media | Nhắn tin | Khi người dùng đính kèm media |
| Gửi sticker | Nhắn tin | Khi người dùng chọn sticker |
| Thả phản ứng tin nhắn | Nhắn tin | Khi người dùng muốn phản ứng với tin nhắn |
| Xem chi tiết phản ứng tin nhắn | Nhắn tin | Khi tin nhắn có phản ứng |
| Chuyển tiếp tin nhắn | Nhắn tin | Khi người dùng muốn chia sẻ tin nhắn sang hội thoại khác |
| Thu hồi tin nhắn | Nhắn tin | Khi người gửi muốn thu hồi tin nhắn |
| Xóa tin nhắn phía mình | Nhắn tin | Khi người dùng muốn ẩn tin nhắn ở phía mình |
| Khám phá kênh công khai | Quản lý nhóm và kênh | Khi người dùng vào luồng khám phá |
| Tham gia kênh công khai | Quản lý nhóm và kênh | Khi kênh là công khai |
| Từ chối cuộc gọi | Gọi thoại và video | Khi có cuộc gọi đến |
| Xem cuộc gọi đang hoạt động | Gọi thoại và video | Khi người dùng có cuộc gọi đang diễn ra |
| Gọi nhóm | Gọi thoại và video | Khi cuộc gọi diễn ra trong hội thoại nhóm |
| Sửa bài viết | Quản lý bài viết cộng đồng | Khi chủ bài viết muốn cập nhật nội dung |
| Xóa bài viết | Quản lý bài viết cộng đồng | Khi chủ bài viết muốn xóa nội dung |
| Thích bài viết | Quản lý bài viết cộng đồng | Khi người dùng muốn tương tác |
| Lưu bài viết | Quản lý bài viết cộng đồng | Khi người dùng muốn bookmark/favorite |
| Bình luận bài viết | Quản lý bài viết cộng đồng | Khi người dùng muốn thảo luận |
| Xem bài viết theo tác giả | Khám phá nội dung cộng đồng | Khi người dùng quan tâm tác giả cụ thể |
| Đánh dấu tất cả đã đọc | Quản lý thông báo | Khi người dùng xử lý hàng loạt |
| Tắt thông báo hội thoại | Quản lý thông báo | Khi người dùng muốn mute hội thoại |
| Bật lại thông báo hội thoại | Quản lý thông báo | Khi hội thoại đang bị mute |
| Ghim hội thoại | Quản lý thông báo | Khi người dùng muốn ưu tiên hội thoại |
| Bỏ ghim hội thoại | Quản lý thông báo | Khi hội thoại đang được ghim |
| Tạo lại tóm tắt | Sử dụng trợ lý AI | Khi người dùng muốn sinh lại digest |
| Quản lý ghi chú nhóm | Sử dụng trợ lý AI | Khi người dùng ghim, bỏ ghim, xóa hoặc tạo lại note |
| Cài đặt AI theo hội thoại | Sử dụng trợ lý AI | Khi người dùng bật/tắt AI theo hội thoại |
| Xóa media đã tải lên | Quản lý media và sticker | Khi cần gỡ media |
| Cập nhật gói sticker | Quản trị sticker | Khi quản trị viên sửa gói sticker |
| Xóa gói sticker | Quản trị sticker | Khi quản trị viên loại bỏ gói sticker |

## 8. Mục bị loại bỏ khỏi Use Case Diagram

| Mục bị loại | Nhóm loại bỏ | Lý do |
|---|---|---|
| Frontend App | Kỹ thuật / implementation | Không phải actor nghiệp vụ |
| Mobile App | Kỹ thuật / implementation | Không phải actor nghiệp vụ |
| Backend Server | Kỹ thuật / implementation | Không phải actor nghiệp vụ |
| API Gateway | Kỹ thuật / implementation | Không phải actor nghiệp vụ |
| REST API | Kỹ thuật / implementation | Là cơ chế triển khai |
| Socket.IO | Hạ tầng nội bộ | Là cơ chế realtime, không phải actor |
| WebRTC | Kỹ thuật / implementation | Là công nghệ media call |
| TURN Server | Hạ tầng nội bộ | Là hạ tầng hỗ trợ kết nối |
| Worker | Hạ tầng nội bộ | Là tiến trình xử lý nền |
| Middleware | Kỹ thuật / implementation | Là lớp xử lý kỹ thuật |
| MongoDB | Hạ tầng nội bộ | Database không phải actor |
| PostgreSQL / Neon / pgvector | Hạ tầng nội bộ | Vector database không phải actor |
| Redis | Hạ tầng nội bộ | Cache/pub-sub/presence nội bộ |
| Kafka / Redpanda | Hạ tầng nội bộ | Message queue nội bộ |
| Cloudinary | Service kỹ thuật | Provider lưu trữ media, không đưa vào actor theo yêu cầu |
| Firebase / FCM / APNs | Service kỹ thuật | Provider push notification, không đưa vào actor |
| Email Service / SMTP / Resend / Gmail SMTP | Service kỹ thuật | Provider gửi OTP, không đưa vào actor |
| AI Provider / Gemini / OpenRouter | Service kỹ thuật | Provider AI, không đưa vào actor |
| Gọi API | Kỹ thuật / implementation | Không phải use case nghiệp vụ |
| Lưu database | Kỹ thuật / implementation | Chi tiết triển khai |
| Generate token / refresh token | Kỹ thuật / implementation | Chi tiết xác thực kỹ thuật |
| Hash password | Kỹ thuật / implementation | Chi tiết bảo mật nội bộ |
| Validate form / validate body | Kỹ thuật / implementation | Không phải mục tiêu nghiệp vụ |
| Upload signed URL / generate signature | Kỹ thuật / implementation | Đã gộp thành Chuẩn bị media tải lên |
| Cache / debounce / dedupe | Kỹ thuật / implementation | Tối ưu kỹ thuật |
| Publish Kafka / consume Kafka | Hạ tầng nội bộ | Chi tiết xử lý nền |
| Render UI / mở modal / chuyển tab | UI / điều hướng | Không phải use case nghiệp vụ |
| Click button / mở popup / đóng popup | UI / điều hướng | Thao tác UI quá nhỏ |
| Loading / queued / processing / ready / failed | Trạng thái / event | Trạng thái xử lý nội bộ |
| Online / offline / last seen | Trạng thái / event | Không vẽ như use case độc lập; chỉ giữ "Xem trạng thái hoạt động" |
| Typing / sent / delivered / read | Trạng thái / event | Không vẽ như use case độc lập; "Đánh dấu đã đọc" giữ ở mức nghiệp vụ |
| Ringing / connected / missed | Trạng thái / event | Trạng thái cuộc gọi |
| Socket connected | Trạng thái / event | Trạng thái kỹ thuật |
| Health check / metrics / logging | Kỹ thuật / implementation | Phục vụ vận hành, không phải use case người dùng |
| Typecheck / test / seed data | Kỹ thuật / implementation | Hoạt động phát triển phần mềm |
| Page loading / dark mode flash fix | UI / điều hướng | Tối ưu giao diện, không phải use case nghiệp vụ |
| Badge count | UI / điều hướng | Chỉ là chỉ báo giao diện |
| Scroll/highlight message | UI / điều hướng | Hành vi điều hướng UI |
| Mutual friends display | Quá nhỏ / bước con | Thông tin phụ trong hồ sơ, không cần use case riêng |
| Chat Info Panel | UI / điều hướng | Vùng giao diện, không phải nghiệp vụ |
| Feed pagination / cursor pagination | Kỹ thuật / implementation | Cách tải dữ liệu |
| Idempotency key | Kỹ thuật / implementation | Chống gửi trùng ở tầng kỹ thuật |
| AI embedding worker | Hạ tầng nội bộ | Chi tiết tạo vector tìm kiếm |
| Prompt guard / model fallback | Kỹ thuật / implementation | Bảo vệ và vận hành AI nội bộ |

## 9. Gợi ý bố cục sơ đồ

| Khu vực | Nội dung |
|---|---|
| Bên trái | Đặt Khách, Người dùng, Thành viên hội thoại |
| Bên phải | Đặt Quản trị nhóm, Chủ nội dung, Quản trị viên |
| Trung tâm | Đặt system boundary tên "Zync Platform" |
| Cột 1 trong boundary | Quản lý xác thực, Quản lý tài khoản, Khám phá người dùng, Quản lý bạn bè |
| Cột 2 trong boundary | Quản lý hội thoại, Nhắn tin, Quản lý nhóm và kênh, Gọi thoại và video |
| Cột 3 trong boundary | Quản lý bài viết cộng đồng, Khám phá nội dung cộng đồng |
| Cột 4 trong boundary | Quản lý thông báo, Sử dụng trợ lý AI, Quản lý media và sticker |
| Cụm quản trị | Đặt Quản trị kiểm duyệt và Quản trị sticker gần actor Quản trị viên |
| Use case con | Đặt gần use case chính tương ứng; không tách quá xa để tránh rối |
| Association actor | Dùng nét liền từ actor đến use case chính |
| Include | Dùng nét đứt từ use case nguồn đến use case bắt buộc |
| Extend | Dùng nét đứt từ use case mở rộng đến use case gốc |
| Thành phần không đưa vào | Không đặt Email Service, Firebase, FCM, APNs, Cloudinary, AI Provider, Gemini, Redis, Kafka, MongoDB, PostgreSQL, Neon, Socket.IO, WebRTC, TURN Server, Worker, Middleware, API Gateway, Backend Server, Frontend App, Mobile App làm actor |
