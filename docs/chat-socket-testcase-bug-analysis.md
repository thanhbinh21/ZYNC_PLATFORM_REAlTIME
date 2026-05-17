# Tong hop testcase va cac loi co the xay ra (Web chat realtime)

## 1) Tong hop lai cac testcase da test

### TH1
- Dieu kien: Vua vao trang /chat, mac dinh vao conversation dau tien.
- TK1 nhan tin bat ky.
- TK2 mo sau, tu dong vao conversation TK1 vua nhan.
- Ket qua: TK1 khong nhan duoc phan hoi da doc.

### TH2
- Dieu kien: Vua vao /chat, mac dinh conversation dau tien.
- TK1 chuyen sang conversation khac roi quay lai conversation cu.
- TK1 nhan tin.
- TK2 mo sau, tu dong vao conversation TK1 vua nhan.
- Ket qua: TK1 nhan duoc phan hoi da doc.

### TH3
- Dieu kien: TK1 va TK2 cung vao /chat, cung o conversation dau tien ngay luc load.
- TK1 nhan tin.
- Ket qua: TK2 khong nhan tin tu TK1; TK1 cung khong nhan phan hoi da doc.

### TH4
- Dieu kien: TK1 va TK2 cung vao /chat, sau do ca hai (hoac toi thieu luong tai moi tab) da chuyen conversation roi quay lai.
- TK1 nhan tin.
- Ket qua: TK2 nhan duoc tin; TK1 nhan duoc phan hoi da doc.

### TH5
- Dieu kien: TK1 va TK2 cung vao /chat; chi TK1 chuyen conversation roi quay lai, TK2 khong chuyen.
- TK1 nhan tin.
- Ket qua: TK2 khong nhan duoc tin; TK1 nhan duoc phan hoi da doc.

### TH6
- Dieu kien: TK1 va TK2 cung vao /chat; chi TK2 chuyen conversation roi quay lai, TK1 khong chuyen.
- TK1 nhan tin.
- Ket qua: TK2 nhan duoc tin; TK1 khong nhan duoc phan hoi da doc.

### TH7
- Dieu kien: Vua vao /chat, mac dinh conversation dau tien.
- TK1 react 1 tin nhan.
- TK2 mo sau, tu dong vao conversation lien quan.
- Ket qua: TK2 nhan react; TK1 bi mat react sau mot thoi gian, phai chuyen conversation roi quay lai moi thay lai.

### TH8
- Dieu kien: TK1 chuyen conversation roi quay lai truoc khi react.
- TK1 react 1 tin.
- TK2 mo sau.
- Ket qua: TK2 nhan react nhung phai chuyen conversation roi quay lai moi thay; TK1 khong bi mat react.

### TH9
- Dieu kien: TK1 va TK2 cung vao /chat va dung o conversation dau tien ngay tu dau.
- TK1 react 1 tin.
- Ket qua: TK2 khong nhan react (phai doi conversation de thay); TK1 mat react sau mot thoi gian (phai doi conversation de thay lai).

### TH10
- Dieu kien: TK1 va TK2 da co hanh vi chuyen conversation roi quay lai truoc khi react.
- TK1 react 1 tin.
- Ket qua: TK2 nhan react; TK1 khong mat react.

### TH11
- Dieu kien: TK1 co chuyen conversation roi quay lai, TK2 khong chuyen.
- TK1 react 1 tin.
- Ket qua: TK2 khong nhan react ngay (phai doi conversation moi thay); TK1 khong mat react.

### TH12
- Dieu kien: TK2 co chuyen conversation roi quay lai, TK1 khong chuyen.
- TK1 react 1 tin.
- Ket qua: TK2 nhan react; TK1 mat react sau mot thoi gian (phai doi conversation moi thay lai).

### Ghi chu da test
- Da tung trien khai co che react voi ACK timeout va tu dong rollback/xoa neu khong nhan ACK socket.

---

## 2) Danh sach tat ca loi co the xay ra (dua tren code hien tai)

## Loi 1: Dung trung 2 instance useHomeDashboard trong cung man chat
- Bang chung:
  - [apps/web/src/app/(dashboard)/layout.tsx#L24](apps/web/src/app/(dashboard)/layout.tsx#L24) dang goi useHomeDashboard o layout.
  - [apps/web/src/app/(dashboard)/chat/page.tsx#L70](apps/web/src/app/(dashboard)/chat/page.tsx#L70) tiep tuc goi useHomeDashboard o page chat.
- RUI RO:
  - 2 instance hook cung dung 1 socket singleton -> dang ky listener de/ghi len nhau.
  - Moi instance co selectedConversationId rieng, nen callback cua instance A co the loc event va bo event cua instance B.
- Trieu chung map testcase:
  - TH3/TH5/TH6 (mat receive_message/read receipt khong on dinh).
  - TH9/TH11/TH12 (reaction cap nhat khong on dinh).

## Loi 2: Socket listener dang ky theo kieu off(event) khong callback -> de "xoa listener cua nguoi khac"
- Bang chung:
  - [apps/web/src/services/socket.ts#L214](apps/web/src/services/socket.ts#L214)
  - [apps/web/src/services/socket.ts#L287](apps/web/src/services/socket.ts#L287)
  - [apps/web/src/services/socket.ts#L980](apps/web/src/services/socket.ts#L980)
  - [apps/web/src/services/socket.ts#L997](apps/web/src/services/socket.ts#L997)
  - [apps/web/src/services/socket.ts#L1021](apps/web/src/services/socket.ts#L1021)
  - [apps/web/src/services/socket.ts#L1062](apps/web/src/services/socket.ts#L1062)
- RUI RO:
  - Bat ky component/hook nao register lai listener se remove tat ca listener event do.
  - Neu cleanup xay ra o 1 noi, noi khac dang dung cung event se bi mat listener.
- Trieu chung map testcase:
  - TH3/TH4/TH5/TH6 voi message va read status.
  - TH7->TH12 voi reaction ack/update.

## Loi 3: useChat dung leave/join theo local state, de xung dot room membership khi nhieu noi cung dieu khien
- Bang chung:
  - [apps/web/src/hooks/use-messaging.ts#L147](apps/web/src/hooks/use-messaging.ts#L147)
  - [apps/web/src/hooks/use-messaging.ts#L149](apps/web/src/hooks/use-messaging.ts#L149)
- RUI RO:
  - Neu co 2 luong state conversation (vi 2 hook instance), 1 luong co the emit leave room ma luong kia van can room do.
  - Dan den user dang o man chat nhung khong con trong conv room socket.
- Trieu chung map testcase:
  - TH3/TH5/TH6 (khong nhan receive_message/read status theo room).

## Loi 4: Mat event o lan vao dau tien do race giua khoi tao socket, join room va dang ky listener
- Bang chung:
  - Join room o gateway la event-driven: [apps/server/src/socket/gateway.ts#L203](apps/server/src/socket/gateway.ts#L203)
  - Message/read/reaction deu broadcast vao room conv:
    - [apps/server/src/socket/chat.controller.ts#L294](apps/server/src/socket/chat.controller.ts#L294)
    - [apps/server/src/socket/chat.controller.ts#L358](apps/server/src/socket/chat.controller.ts#L358)
    - [apps/server/src/socket/reaction.controller.ts#L247](apps/server/src/socket/reaction.controller.ts#L247)
- RUI RO:
  - Neu client chua join room hoac listener dang bi replace dung luc event phat, event se mat.
  - Hanh vi "chuyen conversation roi quay lai" vo tinh giup re-subscribe/re-join nen he thong "tu dung dung".
- Trieu chung map testcase:
  - TH3/TH4 la mau kinh dien cua race nay.

## Loi 5: Reaction optimistic rollback qua ACK timeout gay mat react tam thoi
- Bang chung:
  - Timeout 8s: [apps/web/src/hooks/use-home-dashboard.ts#L168](apps/web/src/hooks/use-home-dashboard.ts#L168)
  - Rollback khi timeout: [apps/web/src/hooks/use-home-dashboard.ts#L838](apps/web/src/hooks/use-home-dashboard.ts#L838)
- RUI RO:
  - Neu reaction_ack/reaction_updated bi bo lo do listener bi replace hoac room mismatch, UI rollback du backend co the da luu.
  - Nhin nhu "mat react", sau do doi conversation/fetch lai thi react hien tro lai.
- Trieu chung map testcase:
  - TH7/TH9/TH12 cuc ky khop.

## Loi 6: Reaction listener cleanup theo unlisten tong quat co the xoa ca luong dang can
- Bang chung:
  - Dang ky: [apps/web/src/hooks/use-home-dashboard.ts#L1088](apps/web/src/hooks/use-home-dashboard.ts#L1088)
  - Cleanup: [apps/web/src/hooks/use-home-dashboard.ts#L1093](apps/web/src/hooks/use-home-dashboard.ts#L1093)
  - unlisten xoa tat ca reaction event: [apps/web/src/services/socket.ts#L986](apps/web/src/services/socket.ts#L986), [apps/web/src/services/socket.ts#L1003](apps/web/src/services/socket.ts#L1003), [apps/web/src/services/socket.ts#L1027](apps/web/src/services/socket.ts#L1027)
- RUI RO:
  - 1 effect cleanup cua instance A co the xoa listener instance B.
- Trieu chung map testcase:
  - TH8->TH12 (reaction cap nhat theo huong bat doi xung giua 2 tab/user).

## Loi 7: getSocket dung auth token khong on dinh khi goi khong truyen token
- Bang chung:
  - [apps/web/src/services/socket.ts#L56](apps/web/src/services/socket.ts#L56)
  - [apps/web/src/services/socket.ts#L80](apps/web/src/services/socket.ts#L80)
- Chi tiet:
  - Ham co resolvedToken, nhung khi tao io lai truyen auth: { token } (bien dau vao), khong phai auth: { token: resolvedToken }.
- RUI RO:
  - Neu caller khong truyen token truc tiep (du cookie co), auth handshake co the nhan undefined.
  - Dan den connect_error, reconnect lap lai, va tiep tuc tao race listener/room.
- Trieu chung map testcase:
  - Co the lam nang hon TH1/TH3/TH7 o lan vao dau.

## Loi 8: Kien truc singleton socket + nhieu hook co side-effect manh tai layout
- Bang chung:
  - Layout chi can userId nhung lai keo toan bo side effects chat/reaction/call qua useHomeDashboard: [apps/web/src/app/(dashboard)/layout.tsx#L24](apps/web/src/app/(dashboard)/layout.tsx#L24)
- RUI RO:
  - Tang so luong subscribe/unsubscribe khong can thiet.
  - Tao "state war" giua layout va chat page.
- Trieu chung map testcase:
  - Tat ca TH co tinh ngau nhien va phu thuoc thao tac "chuyen room roi quay lai".

## Loi 9: Ngan xep Message realtime + History co tinh eventual consistency, de gay "thay lai sau khi doi room"
- Bang chung:
  - Merge message history va realtime o [apps/web/src/hooks/use-home-dashboard.ts#L847](apps/web/src/hooks/use-home-dashboard.ts#L847) va [apps/web/src/hooks/use-messaging.ts#L986](apps/web/src/hooks/use-messaging.ts#L986)
- RUI RO:
  - Khi event realtime bi bo lo, du lieu van co the duoc "hoi phuc" sau lan fetch/merge tiep theo.
  - Cam giac nguoi dung: UI sai tam thoi, doi room moi dung.
- Trieu chung map testcase:
  - TH7/TH8/TH9/TH11/TH12.

## Loi 10: Server phat status_update theo room conv, sender/reader khong o room la mat read receipt
- Bang chung:
  - [apps/server/src/socket/chat.controller.ts#L358](apps/server/src/socket/chat.controller.ts#L358)
- RUI RO:
  - Chi can 1 ben roi room (hoac chua vao room) la read receipt khong den.
- Trieu chung map testcase:
  - TH1/TH3/TH5/TH6.

## Loi 11: useMessageHistory auto fetch + auto-mark read phat status_update async, co the "dung nham cua so"
- Bang chung:
  - Auto fetch khi change conversation: [apps/web/src/hooks/use-messaging.ts#L986](apps/web/src/hooks/use-messaging.ts#L986)
  - Server auto-mark khi get history: [apps/server/src/modules/messages/messages.controller.ts#L116](apps/server/src/modules/messages/messages.controller.ts#L116)
- RUI RO:
  - Neu dung luc listener vua bi off/on, sender co the khong nhan status_update read.
- Trieu chung map testcase:
  - TH1 (TK2 mo vao conversation sau khi TK1 gui, TK1 van co the mat phan hoi read).

## Loi 12: ACK timeout (8s) co the nho hon do tre queue/kafka/reconnect trong mot so tinh huong
- Bang chung:
  - Worker + queue co retry/fallback: [apps/server/src/workers/message.worker.ts#L13](apps/server/src/workers/message.worker.ts#L13)
- RUI RO:
  - Du reaction ack gui som, nhung neu client miss event hoac reconnect trong khoang timeout, rollback se xay ra gia.
- Trieu chung map testcase:
  - TH7/TH9/TH12.

---

## 3) Theo y kien cua Quang Minh: bi loi khoi tao socket o frontend

### Nhan dinh
- Y kien nay rat hop ly va trung tam van de.
- Cum loi "khoi tao socket frontend" hien tai khong chi la 1 bug, ma la tong hop bug:
  - Khoi tao singleton nhung bi goi tu nhieu hook instance.
  - Dang ky listener theo kieu remove-all.
  - Join/leave room bi dieu khien boi nhieu local state.

### Cac loi co the xay ra theo huong "khoi tao socket frontend"
1. Khoi tao socket o layout va page chat cung luc lam trung luong subscribe event.
2. Listener bi overwrite do dung socket.off(event) truoc socket.on(event).
3. Cleanup cua 1 noi xoa listener cua noi khac.
4. Join room conversation dau tien khong on dinh o lan vao dau (race condition).
5. Leave room bi emit boi instance khac lam mat event room dang xem.
6. Reaction ACK listener mat tam thoi -> optimistic rollback -> mat react.
7. Token auth truyen vao handshake co the khong dung bien resolvedToken trong mot so call path.
8. Reconnect + re-subscribe khong duoc quan ly tap trung theo 1 socket orchestrator duy nhat.
9. Event status_update/read receipt bi roi khi listener vua bi thay the.
10. Event reaction_updated bi roi, chi hoi phuc khi doi conversation de refetch/re-hydrate.

### Ket luan ngan
- Chuoi testcase TH1-TH12 khop rat manh voi nhom loi khoi tao va quan ly listener socket o frontend.
- Da dac biet khop voi mo ta "vao lan dau bi loi, doi conversation roi quay lai thi dung".
