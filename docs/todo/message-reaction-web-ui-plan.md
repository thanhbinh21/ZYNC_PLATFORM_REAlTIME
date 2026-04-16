# Message Reaction Web UI Plan

## 1) Muc tieu UX

Muc tieu UI web cho reaction tren message:
1. Hover vao message -> hien nut reaction mac dinh (emoji like rong).
2. Hover vao nut reaction -> hien reaction picker (pill emoji).
3. Chon emoji -> cap nhat nhanh tren UI.
4. Hien reaction summary pill ben duoi message:
- chi hien toi da 3 emoji dau,
- hien tong so reaction.
5. Click reaction summary pill -> mo bang thong ke:
- tab Tat ca,
- tab theo tung emoji,
- danh sach user va thong ke reaction.
6. Sau khi user da react:
- nut reaction mac dinh doi thanh emoji cuoi cung user do da chon (lastEmoji).
7. Khi nut reaction da doi thanh lastEmoji:
- click truc tiep vao nut do se react them 1 lan nua bang chinh lastEmoji (quick-add).
7. Khi hover vao nut reaction da doi:
- picker co them nut X de xoa toan bo reaction cua user do tren message.
8. Bam X:
- tru so luong reaction tuong ung trong summary,
- emoji nao count = 0 thi bien mat,
- nut reaction tro lai emoji like rong.

## 2) Thanh phan UI can tao

### 2.1 MessageReactionTrigger

Chuc nang:
- Hien ben canh bubble khi hover message.
- Trang thai:
  - Chua react: hien icon like rong.
  - Da react: hien `lastEmoji` cua current user.

Props de xuat:
- messageId
- conversationId
- myLastEmoji: string | null
- onOpenPicker
- onQuickAddLastEmoji

### 2.2 MessageReactionPicker

Chuc nang:
- Pill emoji nhanh (vd: 👍 ❤️ 🤣 😳 😭 😡).
- Neu user da react thi hien them nut X o cuoi.

Props:
- visible
- emojiOptions: string[]
- canClearAllMine: boolean
- onPick(emoji)
- onClearAllMine()
- onClose()

Behavior:
- Hover trigger -> mo picker.
- Hover ra khoi trigger va picker -> dong picker (co delay nho 80-120ms de tranh flicker).

### 2.3 MessageReactionSummaryPill

Chuc nang:
- Hien duoi message bubble sau khi co reaction.
- Render:
  - toi da 3 emoji co count cao nhat,
  - tong so reaction.

Rule:
- Neu tong reaction = 0 -> khong hien pill.

Props:
- messageId
- topEmojis: Array<{ emoji: string; count: number }>
- totalCount: number
- onOpenDetails()

### 2.4 MessageReactionDetailsModal

Chuc nang:
- Popup thong ke reaction chi tiet.

Layout:
- Cot trai:
  - Tab Tat ca + count tong.
  - Tab moi emoji + count.
- Cot phai:
  - danh sach user.
  - o tab Tat ca: hien danh sach emoji user da react + tong count.
  - o tab emoji: hien user va count cua emoji do.

Props:
- open
- messageId
- summary
- detailRows
- onClose

## 3) State management de xuat

State theo messageId:
- myLastEmoji: string | null
- myEmojiCounts: Record<string, number>
- summary:
  - totalCount: number
  - emojiCounts: Record<string, number>
- details:
  - rowsByAll
  - rowsByEmoji

State cap conversation:
- reactionBaselineReady: boolean
- baselineTs: string | null

Store de xuat:
- `reactionStateByMessageId` trong store message/chat panel.

## 4) Luong thao tac UI + Socket

### 4.0 Join chat / reconnect (baseline hydration)

B1. Load message history.
B2. Hydrate reaction baseline cho visible messages:
- tu data reaction di kem history (neu co),
- hoac API summary/details,
- hoac `reaction_snapshot` neu backend phat event nay.
B3. Dat `reactionBaselineReady = true` roi moi xu ly `reaction_updated` nhu delta stream.
B4. Khi reconnect/missed-event: refetch baseline cho visible range.

### 4.1 Chon emoji (upsert)

B1. User hover trigger -> picker mo.
B2. User click emoji.
B3. Client optimistic update ngay:
- tang myEmojiCounts[emoji],
- cap nhat myLastEmoji = emoji,
- tang summary.emojiCounts[emoji],
- tang summary.totalCount.
B4. Emit socket `reaction_upsert` voi payload:
- requestId, conversationId, messageRef, emoji, delta, idempotencyKey.
B5. Nhan `reaction_updated` tu server -> reconcile state.

Note:
- Neu baseline chua ready, optimistic update van co the hien tam, nhung phai reconcile lai sau hydration.

### 4.2 Xoa het reaction cua toi (nut X)

B1. User hover trigger da react -> picker co them nut X.
B2. User click X.
B3. Client optimistic update ngay:
- tru toan bo myEmojiCounts ra khoi summary,
- xoa emoji count = 0,
- dat myEmojiCounts = {},
- dat myLastEmoji = null.
B4. Emit socket `reaction_remove_all_mine`.
B5. Nhan `reaction_updated` -> reconcile state.

### 4.3 Quick-add bang trigger lastEmoji

B1. Trigger dang hien lastEmoji (user da co reaction truoc do).
B2. User click trigger.
B3. Client optimistic update ngay:
- tang myEmojiCounts[lastEmoji] them 1,
- tang summary.emojiCounts[lastEmoji] them 1,
- tang summary.totalCount them 1,
- myLastEmoji giu nguyen.
B4. Emit socket `reaction_upsert` voi emoji = lastEmoji, delta = 1.
B5. Nhan `reaction_updated` -> reconcile state.

## 5) Quy tac hien thi theo yeu cau

1. Trigger icon:
- myLastEmoji != null => hien myLastEmoji.
- myLastEmoji == null => hien like rong.

2. Summary pill duoi message:
- Hien toi da 3 emoji dau theo count giam dan.
- Hien `totalCount`.

3. Modal thong ke:
- Tab Tat ca hien tong count.
- Moi tab emoji hien count emoji do.
- Cot phai hien user + reaction stats.

4. Khi bo reaction bang X:
- summary phai tru dung theo emojiCounts cua user.
- emoji count ve 0 phai remove khoi UI.
- trigger icon tro lai like rong.

5. Khi trigger dang la lastEmoji va user click vao trigger:
- phai tang them reaction cho dung lastEmoji do.
- trigger tiep tuc giu nguyen lastEmoji.

## 6) API/Socket data contracts can backend dam bao

Event `reaction_updated` nen tra:
- conversationId
- messageId
- messageRef
- summary: { totalCount, emojiCounts }
- actor: { userId, action, emoji, delta }
- userState (cho current actor):
  - myEmojiCounts
  - myLastEmoji
- updatedAt

Luu y:
- `reaction_updated` la delta event, khong thay cho initial snapshot.
- Web can co luong baseline hydration de user vao sau thay dung state.

Neu khong tra userState day du:
- frontend can tu tinh tu local state + summary.

## 7) Edge cases can xu ly

1. Hover flicker trigger/picker.
2. Click emoji lien tuc nhanh (batch delta).
3. Reconnect socket (re-fetch summary).
4. Message bi recall/delete trong luc dang react.
5. Out-of-order event (dung updatedAt/version de reconcile).
6. User click trigger lastEmoji lien tuc nhanh (coalesce delta + idempotency).
7. Virtualized list: message moi mount phai co du lieu baseline truoc khi render summary on-screen.

## 8) Performance

1. Virtualized list cho message dai.
2. Memo render summary pill theo messageId.
3. Debounce hover open/close picker.
4. Coalesce optimistic updates khi click nhanh.

## 9) Test plan web

### 9.1 UI behavior
- [ ] Hover message -> hien trigger.
- [ ] Hover trigger -> hien picker.
- [ ] Picker co nut X khi user da react.
- [ ] Trigger hien lastEmoji dung.
- [ ] Xoa het -> trigger ve like rong.
- [ ] Trigger lastEmoji click -> quick-add dung emoji.

### 9.2 Summary
- [ ] Summary hien toi da 3 emoji.
- [ ] Tong count dung.
- [ ] Emoji count = 0 bi remove.

### 9.3 Modal
- [ ] Open modal tu summary pill.
- [ ] Tab Tat ca dung count.
- [ ] Tab emoji dung danh sach user + count.

### 9.4 Realtime
- [ ] Client A react -> Client B update ngay.
- [ ] Client A remove all mine -> Client B cap nhat dung.
- [ ] Client A quick-add bang trigger -> Client B thay doi tong count dung.

### 9.5 Baseline hydration
- [ ] User vao sau van thay dung reaction cu (khong can doi user khac react).
- [ ] Reconnect xong state reaction duoc reconcile dung.
- [ ] Virtualized message range moi render khong hien sai 0 khi baseline chua ve.

## 10) Task checklist web

### A. Components
- [ ] Tao MessageReactionTrigger
- [ ] Tao MessageReactionPicker
- [ ] Tao MessageReactionSummaryPill
- [ ] Tao MessageReactionDetailsModal

### B. State + hooks
- [ ] Tao reaction state by messageId
- [ ] Them optimistic update reducers
- [ ] Them reconcile tu socket event

### C. Socket integration
- [ ] Emit reaction_upsert
- [ ] Emit reaction_remove_all_mine
- [ ] Listen reaction_ack/reaction_updated/reaction_error

### D. QA
- [ ] Manual test hover/picker/modal
- [ ] Manual test 2 user realtime
- [ ] Fix visual polish
