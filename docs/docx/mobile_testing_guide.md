# Hướng Dẫn Kỹ Thuật Test Mobile App (Zync Platform)

Tài liệu này cung cấp các hướng dẫn tốt nhất để thiết lập và chạy thử nghiệm (testing) ứng dụng Zync React Native / Expo trên môi trường dev local – đặc biệt là trên Hệ điều hành Windows.

---

## 1. Môi trường Thực thi (Run Environment)

### Cách 1: Sử dụng điện thoại vật lý qua Expo Go (Được Khuyến Nghị)
Đây là cách nhanh nhất, tốn ít tài nguyên máy tính nhất và mô phỏng được 100% cảm giác native bao gồm cả bàn phím thiết bị và notch/tai thỏ.

1. **Chuẩn bị Device**: Tải ứng dụng **Expo Go** trên App Store (iOS) hoặc Google Play (Android).
2. **Network**: Đảm bảo máy tính Windows và Điện thoại di động đang kết nối **chung một mạng Wi-Fi**.
3. **Run Server Local**: Chạy backend Zync cục bộ: `npm run dev:server` (Backend sẽ mặc định chạy trên cổng `3000`).
4. **Cấu hình API_URL**: Trong điện thoại, nó không hiểu `localhost`. Khởi động Expo với cờ LAN bằng cách chạy trong folder `apps/mobile`:
   ```bash
   npx expo start --lan
   ```
   > **Lưu ý**: Bạn cần tạo file `apps/mobile/.env` và trỏ IP Local của bạn. Ví dụ: `EXPO_PUBLIC_API_URL=http://192.168.1.10:3000/api`
5. Quét mã QR code xuất hiện trên terminal của VSCode thông qua Camera điện thoại (với iOS) hoặc qua app màn hình Expo Go (với Android).

### Cách 2: Trình giả lập Android (Android Studio Emulator)
Tốt nhất khi bạn muốn thiết lập test nhiều màn hình tự động liên tục ngay trên Windows.

1. Cài đặt **Android Studio**.
2. Thiết lập một **Virtual Device (AVD)** (Nên khuyên dùng Pixel 6, API 33+).
3. Khi khởi động giả lập, chạy:
   ```bash
   npm run android
   ```
   *Lưu ý*: Với Android emulator, IP backend `localhost` của môi trường máy gốc phải được map qua địa chỉ `http://10.0.2.2:3000/api`. Chúng tôi đã cấu hình ngầm điều này trong `src/services/api.ts`.

---

## 2. Công cụ & Extension hỗ trợ (Khuyên dùng trên VS Code)

Để code và debug Mobile App hiệu quả trên VSCode, bạn nên cài đặt các công cụ sau:

1. **Expo Tools** (`expo.vscode-expo-tools`)
   Hỗ trợ gảy debug config của hệ sinh thái Expo, autocomplete mạnh cho `app.json` và `expo-router`.

2. **React Native Tools** (`msjsdiag.vscode-react-native`)
   Hỗ trợ đắc lực cho quy trình Debugger React Native. Tính năng gắn breakpoint vào Typescript sẽ hoạt động.

3. **React Developer Tools** (Tiện ích tích hợp web/Flipper)
   Sử dụng để soi cây state UI, xem React component tree. Hoặc có thể cài React Native Debugger. Tuy nhiên, tính năng xem Logs giờ đã tích hợp rất tốt trên màn hình terminal của `npx expo start`.

4. **Trình Monitor Redux/Zustand**
   Có thể bọc store Zustand bằng DevTools middleware `devtools(store)` để dễ debug dòng dữ liệu chạy. 

---

## 3. Quy trình Test Mạch Auth (Mã OTP)

Luồng Authentication của dự án Mobile đang tái sử dụng cùng service với Web.

- Khi chạy ở môi trường DEV (kiểm tra file biến môi trường gốc của repo `zync-platform/.env`), hãy chắc chắn thiết lập `OTP_HARDCODE=true` và `OTP_HARDCODE_VALUE=123456`.
- Bất kì số điện thoại hoặc email nào bạn nhập ở trang "Đăng nhập", "Đăng ký" hay "Quên mật khẩu", bạn chỉ cần nhập luôn mã **123456** ở màn Verify OTP tiếp theo mà không cần phải chờ nhận SMS hay Email.
- Backend Log của máy chủ `apps/server` (cửa sổ node terminal) cũng sẽ tự log dòng OTP được gen ra nếu tính năng Hardcode bị tắt.

---

## 4. Xử lý Lỗi Chặn Mạng Phổ Biến Trên Windows

Trong trường hợp ứng dụng Expo Go báo **"Network Response Failed"** khi gọi API Login:
- **Nguyên nhân**: Tường lửa Windows (Windows Defender Firewall) chặn kết nối vào port `3000` hoặc chặn IP LAN.
- **Khắc phục**:
   1. Mở "Windows Defender Firewall" -> "Advanced settings".
   2. Tab "Inbound Rules" -> "New Rule...".
   3. Chọn "Port" -> TCP -> Nhập số cụ thể `3000`.
   4. Allow the connection.
   Hoặc nhanh nhất: Chuyển mạng Wifi từ chế độ "Public" sang "Private" trên Windows Settings.
