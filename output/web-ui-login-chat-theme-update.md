# Web UI Login & Chat Theme Update

## Muc tieu
- Ha do chang do trang web, giam do sang cua nen trang va tang do doc cho text o light mode.
- Dong bo giao dien login theo shared token/UI system.
- Co dinh khung chat dashboard o trung tam, tranh cam giac bi day xuong duoi hoac tran man hinh.

## Pham vi anh huong
- `apps/web/src/app/globals.css`
- `apps/web/src/app/auth/page.tsx`
- `apps/web/src/components/auth/login/*`
- `apps/web/src/components/home-dashboard/organisms/home-dashboard-screen.tsx`
- `apps/web/src/components/home-dashboard/organisms/home-dashboard-chat-panel.tsx`

## Quyet dinh ky thuat
- Chuyen auth shell sang cung nen light-first voi dashboard, thay vi tiep tuc dung gradient dark cu.
- Tang weight cua text co gia tri noi dung de light mode de doc hon.
- Cat bo cac hex color hardcode trong login UI, thay bang shared tokens va utility classes moi.
- Dat `max-width` cho chat panel va canh giua wrapper cap cao hon de giao dien chat on dinh theo viewport.

## Truoc va sau
- Truoc: login co palette rieng, text nhat va card khong dong bo voi dashboard.
- Sau: login va dashboard cung mot bo token, card/input/button co contrast ro hon, dark mode van giu accent xanh la lam chu dao.
- Truoc: chat panel co the truoc mat tran sang hai ben va bi cam giac roi xuong duoi.
- Sau: chat panel nam giua, co khung fixed hon va giu nhp do on dinh tren man hinh lon.

## Kiem tra
- Da chay check TypeScript cho web va khong bao loi tren cac file da sua.
- Da kiem tra lai cac file lien quan, khong con hardcode mau hex trong login card chinh.
