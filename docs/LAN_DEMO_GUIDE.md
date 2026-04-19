# LAN Demo Guide (Local + LAN)

Muc tieu: giu nguyen cach chay local nhu cu, va co them cach demo cho nhieu nguoi trong cung Wi-Fi truy cap he thong tu may cua ban.

## 1. Co anh huong den local cu khong?

Khong.

- Cac lenh cu van giu nguyen:
  - `npm run dev:server`
  - `npm run dev:web`
  - `npm run dev:mobile`
- Cac lenh `:lan` la che do bo sung, chi dung khi can demo LAN.

## 2. Lenh chay demo LAN

Chay tai root monorepo, moi lenh mot terminal:

1. Backend:
   - `npm run dev:server:lan`
2. Web:
   - `npm run dev:web:lan`
3. Mobile (Expo LAN):
   - `npm run dev:mobile:lan`

Sau do, may khac trong cung Wi-Fi mo:

- Web: `http://<LAN_IP_CUA_MAY_BAN>:3001`
- Meo: khi chay `dev:web:lan`, terminal se in them dong `LAN: http://<ip>:3001` de copy nhanh.
- `dev:web:lan` cung bat `NEXT_PUBLIC_LAN_DEMO_WARN=true` de hien thong bao ro khi camera/WebRTC bi chan do HTTP LAN.

## 3. Lay LAN IP cua may ban (Windows)

Chay:

```powershell
ipconfig
```

Lay gia tri `IPv4 Address` cua card Wi-Fi dang dung, vi du `192.168.1.10`.

## 4. Co can config IP vao code khong?

Tom tat: **khong can sua code**.

- Server:
  - `dev:server:lan` tu set `HOST=0.0.0.0`.
- Web:
  - Da co fallback tu dong theo host dang mo tren browser.
  - Neu mo bang `http://192.168.x.x:3001` thi web se goi API/WS ve cung IP do.
- Mobile:
  - `expo start --lan` thuong tu detect host.
  - Khuyen nghi tao `apps/mobile/.env` de on dinh hon khi demo:
    - `EXPO_PUBLIC_API_URL=http://<LAN_IP_CUA_MAY_BAN>:3000/api`
    - `EXPO_PUBLIC_SOCKET_URL=http://<LAN_IP_CUA_MAY_BAN>:3000`

## 5. Camera/WebRTC tren HTTP LAN (Giai phap 1: Browser Flags)

Ban chat:
- Trinh duyet mac dinh chi trust `localhost`/`127.0.0.1` cho secure-context APIs.
- Khi mo bang `http://192.168.x.x:3001`, camera/screen-share/WebRTC co the bi chan.
- Cach nay ep browser treat LAN origin nhu secure origin de test noi bo.

Ap dung cho:
- Chrome
- Edge
- Brave
- CocCoc

### Buoc 1: Mo trang flags dung cho browser

Tren may client (may vao link demo), mo URL:

- Chrome: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
- Edge: `edge://flags/#unsafely-treat-insecure-origin-as-secure`
- Brave: `brave://flags/#unsafely-treat-insecure-origin-as-secure`
- CocCoc: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`

### Buoc 2: Enable va nhap origin LAN

Tai dong `Insecure origins treated as secure`:

1. Chuyen tu `Disabled` sang `Enabled`.
2. Nhap origin can trust vao text box, vi du:
   - `http://192.168.1.32:3001`

Neu can nhieu origin, nhap cach nhau bang dau phay.

### Buoc 3: Relaunch browser

Nhan `Relaunch`/`Restart` de browser ap dung cau hinh moi.

### Vi du 3 may A/B/C

- May A (server): chay code, IP `192.168.1.32`.
- May B va C (client): mo browser va cau hinh flags nhu tren.
- Sau khi relaunch, truy cap:
  - `http://192.168.1.32:3001/home`
- Luc nay browser se co the hien popup xin quyen camera/micro thay vi chan cung do insecure context.

Luu y:
- Cau hinh nay chi nen dung cho test noi bo.
- Moi may client can tu cau hinh rieng.

## 6. Demo matrix nhanh

1. Chi local tren may dev:
   - Dung lenh khong co `:lan`.
2. Demo web cho nguoi khac trong cung Wi-Fi:
   - `dev:server:lan` + `dev:web:lan`.
3. Demo ca mobile (Expo Go) cho nguoi khac:
   - Them `dev:mobile:lan`, quet QR trong cung Wi-Fi.

## 7. Neu may khac khong vao duoc

1. Kiem tra cung Wi-Fi.
2. Kiem tra URL dung IP LAN (khong dung `localhost` tren may client).
3. Mo firewall inbound cho port:
   - `3000` (backend)
   - `3001` (web)
   - Expo ports (thuong `8081`, va mot so truong hop `19000/19001`).
4. Test nhanh tu may khac:
   - `http://<LAN_IP_CUA_MAY_BAN>:3000/health`
   - Neu ra JSON `status: ok` la backend da mo LAN.

## 8. Luu y CORS

- Mode local thuong: Socket CORS dung danh sach `CORS_ORIGINS`.
- Mode LAN (`HOST=0.0.0.0` qua `dev:server:lan`): Socket CORS duoc mo rong de demo LAN.
- Production: cau hinh `CORS_ORIGINS` dung domain/IP duoc phep.
