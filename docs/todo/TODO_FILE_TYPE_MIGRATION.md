# File Type System Migration

## Objective
Change message type for files from `'file'` to `'file/<filename.extension>'` (e.g., `'file/abc.txt'`, `'file/report.pdf'`, `'file/data.xlsx'`)

**Other types remain unchanged:** `'text'`, `'image'`, `'video'`, `'audio'`, `'sticker'`

---

## Frontend Changes

### 1. `apps/web/src/components/home-dashboard/molecules/message-input.tsx`
**Location:** Lines 37-38, 141
- [ ] Update type definition: `'file'` → `'file' | string` (or create union type)
- [ ] Update `handleUploadFile()` to generate type with actual filename:
  ```typescript
  const messageType = uploadType === 'document' 
    ? `file/${file.name}`  // e.g., 'file/abc.txt', 'file/report.pdf'
    : uploadType;
  ```

### 2. `apps/web/src/hooks/use-messaging.ts`
**Location:** Lines 48, 296
- [ ] Update type definition: `'file'` → `'file' | string` 
- [ ] Keep logic unchanged (just type broadening)

### 3. `apps/web/src/hooks/use-home-dashboard.ts`
**Location:** Lines 467, and around line 365 (message preview logic)
- [ ] Update type definition: `'file'` → `'file' | string`
- [ ] Update message preview check (Line ~365):
  ```typescript
  latestMessage.type === 'file'  // Change to:
  latestMessage.type?.startsWith('file/')  // or check if includes 'file'
  ```

### 4. `apps/web/src/components/home-dashboard/organisms/home-dashboard-chat-panel.tsx`
**Location:** Line 43
- [ ] Update type definition: `'file'` → `'file' | string`

### 5. `apps/web/src/components/home-dashboard/atoms/message-bubble.tsx`
**Location:** Lines 88, 106
- [ ] Update logic checks:
  ```typescript
  // Line 88 - Change from:
  type === 'file'  // To:
  type?.startsWith('file/')
  
  // Line 106 - Change from:
  type === 'file'  // To:
  type?.startsWith('file/')
  ```
- [ ] May need to display file extension in UI (extract from type)

### 6. `apps/web/src/services/socket.ts`
**Location:** Line 76
- [ ] Update type definition: `'file'` → `'file' | string`

---

## Backend Changes

### 1. `packages/shared-types/src/index.ts`
**Location:** Line 45
- [ ] Update MessageType:
  ```typescript
  // From:
  export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker';
  
  // To:
  export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'sticker' | `file/${string}`;
  ```

### 2. `apps/server/src/modules/messages/message.model.ts`
**Location:** Lines 4, 42
- [ ] Update MessageType type (shared)
- [ ] Update enum validation (Line 42):
  ```typescript
  // Keep only base types in enum, validate file/* separately
  enum: ['text', 'image', 'video', 'audio', 'sticker', 'file'];
  ```
  Or use custom validator to allow `file/*` pattern

### 3. `apps/server/src/modules/messages/messages.schema.ts`
**Location:** Lines 14-15
- [ ] Update Zod validation to accept `file/<filename>` pattern:
  ```typescript
  .refine(
    (type) => /^(text|image|video|audio|sticker|file\/.+)$/.test(type),
    { message: 'Invalid message type. Must be: text, image, video, audio, sticker, or file/<filename>' }
  )
  ```

### 4. `apps/server/src/socket/gateway.ts`
**Location:** Lines 296, 322
- [ ] Update allowedMessageTypes validation (Line 296):
  ```typescript
  const isValidMessageType = (type: string): boolean => {
    return ['text', 'image', 'video', 'audio', 'sticker'].includes(type) || 
           type.startsWith('file/');
  };
  ```
- [ ] Use new validator in type check (Line 322)

### 5. `apps/server/src/modules/messages/messages.service.ts`
**Location:** Lines 26, 82, 157, 294
- [ ] Update MessageType type (shared via shared-types)
- [ ] Update any type checks: `type === 'file'` → `type.startsWith('file/')`

### 6. `apps/server/src/workers/message.worker.ts`
**Location:** Lines 17, 92
- [ ] Update MessageType type (shared)
- [ ] Update logic if needed: `type === 'file'` → `type.startsWith('file/')`

---

## Summary

**Total Files to Update:** 12
- Frontend: 6 files
- Backend: 6 files

**Breaking Changes:** YES
- Need to handle both old `'file'` and new `'file/<filename>'` format during transition period
- Database migration may be needed for existing messages

**Type Changes:**
- `'file'` → `'file/<filename>'` (e.g., `'file/abc.txt'`, `'file/report.pdf'`, `'file/data.xlsx'`)
- Type system: `'file'` → `'file' | string` or `` `file/${string}` ``

**Conditional Checks:**
- `type === 'file'` → `type?.startsWith('file/')`
- Validate in schemas using regex pattern: `/^file\/.+$/`

---

## Implementation Order

1. Update shared types first (packages/shared-types)
2. Update backend models & schemas
3. Update backend validation logic
4. Update backend services & workers
5. Update frontend types & hooks
6. Update frontend components & logic
7. Test with both web and server

---

## Testing Checklist

- [ ] Send file message (should show `file/abc.txt`, `file/report.pdf`, `file/data.xlsx`, etc.)
- [ ] File message displays correctly in chat with filename
- [ ] Message history shows file messages with filenames
- [ ] File type icon matches file extension
- [ ] Backward compatibility (old `'file'` messages still work)
- [ ] Auto-mark delivery works with file messages
- [ ] Typing indicator works while uploading files
