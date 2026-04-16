# Message Reaction Mobile UI Plan

## 1) Muc tieu UX (Mobile)

Muc tieu mobile theo dung flow yeu cau:
1. Ban dau tren message CHUA hien summary pill va CHUA hien trigger reaction.
2. User nhan giu vao message -> mo reaction picker.
3. Chon emoji xong moi bat dau hien:
- reaction summary pill ben duoi message,
- trigger reaction mac dinh ben canh message.
4. Khi da co trigger:
- nhan giu vao trigger hoac nhan giu vao message -> mo lai reaction picker.
- picker luc nay co them nut X de bo toan bo reaction cua user tren message.
5. Trigger reaction (chi sau khi da co reaction lan dau):
- Mac dinh trigger co the hien like rong (sau khi remove-all).
- Sau khi user react thi trigger doi thanh lastEmoji.
6. Khi trigger dang la lastEmoji:
- nhan vao trigger (tap) se quick-add them 1 lan reaction bang chinh lastEmoji do.
7. Bam nut X trong picker:
- bo het reaction cua user do,
- tru count trong summary,
- emoji nao = 0 thi bien mat,
- trigger tro lai like rong.

## 2) Thanh phan UI can tao

### 2.1 MessageLongPressLayer

Chuc nang:
- Bat su kien long press tren bubble message.
- Mo reaction picker tai vi tri gan bubble.

Props:
- messageId
- conversationId
- onOpenPicker(anchor)

### 2.2 MessageReactionTriggerMobile

Chuc nang:
- Hien trigger reaction nho ben canh message (chi hien sau khi da co reaction).
- Trang thai:
  - myLastEmoji = null -> like rong.
  - myLastEmoji != null -> hien lastEmoji.

Behavior:
- Tap trigger khi myLastEmoji != null => quick-add.
- Long press trigger => mo picker.

Props:
- messageId
- conversationId
- myLastEmoji
- visible
- onQuickAddLastEmoji
- onOpenPicker

### 2.3 MessageReactionPickerMobile

Chuc nang:
- Hien popup/pill emoji de chon nhanh.
- Khi user da react, hien them nut X de remove-all-mine.

Props:
- visible
- anchor
- emojiOptions
- canClearAllMine
- onPick(emoji)
- onClearAllMine
- onClose

### 2.4 MessageReactionSummaryPillMobile

Chuc nang:
- Hien duoi message sau khi co reaction.

Rule:
- Hien toi da 3 emoji.
- Hien tong so reaction.
- Neu totalCount = 0 thi an pill.

Props:
- messageId
- topEmojis
- totalCount
- onOpenDetails

### 2.5 MessageReactionDetailsModalMobile

Chuc nang:
- Modal thong ke user react.

Layout:
- Cot trai: Tat ca + tab theo emoji.
- Cot phai: danh sach user va count reaction.

Props:
- open
- messageId
- summary
- detailRows
- onClose

## 3) State management de xuat

State theo messageId:
- hasAnyReaction: boolean
- myLastEmoji: string | null
- myEmojiCounts: Record<string, number>
- summary: {
  totalCount: number,
  emojiCounts: Record<string, number>
}
- details rows

Rule hien thi:
- Trigger + Summary chi hien khi totalCount > 0 hoac user da tung react.

## 4) Luong thao tac UI + Socket

### 4.1 Lan react dau tien (long press message)

B1. Long press message -> open picker.
B2. Chon emoji.
B3. Optimistic update:
- myEmojiCounts[emoji] += 1
- myLastEmoji = emoji
- summary.emojiCounts[emoji] += 1
- summary.totalCount += 1
- hien trigger + summary.
B4. Emit `reaction_upsert`.
B5. Reconcile bang `reaction_updated`.

### 4.2 React tiep (long press message/trigger)

B1. Long press message hoac trigger -> open picker (co nut X).
B2. Chon emoji bat ky.
B3. Optimistic update + emit `reaction_upsert`.
B4. Reconcile bang `reaction_updated`.

### 4.3 Quick-add bang tap trigger lastEmoji

B1. Trigger dang hien lastEmoji.
B2. User tap trigger.
B3. Optimistic update:
- myEmojiCounts[lastEmoji] += 1
- summary.emojiCounts[lastEmoji] += 1
- summary.totalCount += 1
- myLastEmoji giu nguyen.
B4. Emit `reaction_upsert` voi emoji = lastEmoji, delta = 1.
B5. Reconcile bang `reaction_updated`.

### 4.4 Remove all mine bang nut X

B1. Long press message/trigger -> picker co nut X.
B2. Tap X.
B3. Optimistic update:
- tru toan bo myEmojiCounts ra khoi summary,
- remove emoji count = 0,
- myEmojiCounts = {},
- myLastEmoji = null,
- neu summary.totalCount = 0 -> an summary.
B4. Emit `reaction_remove_all_mine`.
B5. Reconcile bang `reaction_updated`.

## 5) Quy tac hien thi can dam bao

1. Ban dau khong co trigger/sumary pill.
2. Sau react dau tien moi hien trigger + summary.
3. Trigger:
- null => like rong (chi xet khi trigger dang duoc hien),
- co lastEmoji => hien lastEmoji.
4. Tap trigger lastEmoji = quick-add.
5. Long press trigger/message = mo picker.
6. Picker khi da react phai co nut X.
7. Remove-all xong -> trigger ve like rong.

## 6) Du lieu Socket can cho mobile

Event `reaction_updated` nen co:
- conversationId
- messageId
- messageRef
- summary { totalCount, emojiCounts }
- userState { userId, myLastEmoji, myEmojiCounts, totalCount }
- actor { userId, action, emoji, delta }
- updatedAt

## 7) Edge cases

1. Long press conflict voi cac action khac (reply/forward/menu).
2. Tap trigger lien tuc nhanh khi dang quick-add.
3. Picker overlap voi keyboard/navigation bar.
4. Reconnect socket va out-of-order event.
5. Message bi recall/delete trong luc mo picker.

## 8) Performance

1. Optimistic update tai local store de UI muot.
2. Batch delta neu user tap trigger rat nhanh.
3. Memo render summary pill + trigger theo messageId.
4. Debounce open/close picker tranh nhap nhay.

## 9) Test plan mobile

### 9.1 Flow co ban
- [ ] Long press message mo picker.
- [ ] Chon emoji lan dau -> hien trigger + summary.
- [ ] Long press trigger mo picker.
- [ ] Picker co nut X khi user da react.

### 9.2 Trigger behavior
- [ ] Trigger hien lastEmoji dung.
- [ ] Tap trigger lastEmoji -> quick-add dung emoji.
- [ ] Sau remove-all trigger tro ve like rong.

### 9.3 Summary + Modal
- [ ] Summary chi hien toi da 3 emoji + total.
- [ ] Emoji count = 0 thi bien mat.
- [ ] Bam summary mo modal thong ke dung tab/count.

### 9.4 Realtime
- [ ] Mobile A react -> Mobile/Web B cap nhat ngay.
- [ ] Mobile A quick-add -> tong count doi dung.
- [ ] Mobile A remove-all -> B cap nhat dung.

## 10) Task checklist mobile

### A. Components
- [ ] MessageLongPressLayer
- [ ] MessageReactionTriggerMobile
- [ ] MessageReactionPickerMobile
- [ ] MessageReactionSummaryPillMobile
- [ ] MessageReactionDetailsModalMobile

### B. State + hooks
- [ ] Tao reaction state by messageId
- [ ] Them optimistic reducer cho upsert/remove/quick-add
- [ ] Them reconcile reducer tu socket payload

### C. Socket integration
- [ ] Emit reaction_upsert
- [ ] Emit reaction_remove_all_mine
- [ ] Listen reaction_ack/reaction_updated/reaction_error

### D. QA
- [ ] Test tren iOS + Android
- [ ] Test voi web client dong thoi
- [ ] Polish UX long press/picker animation
