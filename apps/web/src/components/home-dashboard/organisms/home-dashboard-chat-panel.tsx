interface ChatListItem {
  id: string;
  name: string;
  preview: string;
  time: string;
  initials: string;
  active?: boolean;
  online?: boolean;
}

const chatItems: ChatListItem[] = [
  {
    id: 'c1',
    name: 'Minh Quân',
    preview: 'Đã gửi cho bạn một tệp đính kèm...',
    time: '12:45',
    initials: 'MQ',
    active: true,
    online: true,
  },
  {
    id: 'c2',
    name: 'Lan Phương',
    preview: 'Hẹn gặp bạn lúc 3h chiều nhé!',
    time: 'SÁNG NAY',
    initials: 'LP',
    online: true,
  },
  {
    id: 'c3',
    name: 'Duy Tùng',
    preview: 'Cảm ơn bạn nhiều nha.',
    time: 'HÔM QUA',
    initials: 'DT',
  },
  {
    id: 'c4',
    name: 'Bảo Nam',
    preview: 'Dự án đã hoàn thành rồi.',
    time: 'THỨ 3',
    initials: 'BN',
  },
];

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M6.9 4.2 9 3l2.3 3.7-1.3 1.2a13.8 13.8 0 0 0 6 6l1.2-1.3 3.8 2.3-1.3 2.2a2.3 2.3 0 0 1-2.4 1C9.4 17.5 6.5 14.6 4.8 6.7a2.3 2.3 0 0 1 1-2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <rect x="3.5" y="6.5" width="12" height="11" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="m15.5 10 5-2.6v9.2l-5-2.6V10Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 10.6V16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="7.6" r="1" fill="currentColor" />
    </svg>
  );
}

function AttachIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M9.8 12.8 14.7 8a3 3 0 1 1 4.2 4.2l-6.4 6.5a4.8 4.8 0 1 1-6.9-6.8l6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="10" r="1.6" fill="currentColor" />
      <path d="m6 16 3.5-3.5 2.8 2.8 2.2-2.2 3.5 2.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SmileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
      <path d="M8.3 14.2c.8 1.2 2 1.8 3.7 1.8s3-.6 3.7-1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="m4 19 17-7L4 5l1.3 5.1h7.1v3.8H5.3L4 19Z" />
    </svg>
  );
}

export function HomeDashboardChatPanel() {
  return (
    <section className="mt-4 min-h-[calc(100vh-8.2rem)] overflow-hidden rounded-3xl border border-[#104136] bg-[#031c16]">
      <div className="grid min-h-[calc(100vh-8.2rem)] grid-cols-1 xl:grid-cols-[300px_1fr]">
        <aside className="border-r border-[#114538] bg-[linear-gradient(180deg,#06271f_0%,#052019_100%)] p-4">
          <h2 className="font-ui-title text-[1.95rem] text-[#e6fff5]">Tin nhắn</h2>

          <label className="mt-4 flex h-11 items-center gap-2 rounded-xl bg-[#12392f] px-3 text-[#88bca9]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm cuộc hội thoại"
              className="font-ui-content w-full bg-transparent text-sm text-[#d8f7ec] outline-none placeholder:text-[#90b8a9]"
            />
          </label>

          <div className="mt-4 space-y-2">
            {chatItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                  item.active
                    ? 'border-[#2de3b3] bg-[#103a30]'
                    : 'border-transparent hover:border-[#204d40] hover:bg-[#0b3027]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-11 w-11 rounded-full bg-[#2f6657] text-[#dffef1]">
                    <span className="font-ui-title flex h-full w-full items-center justify-center text-sm">{item.initials}</span>
                    {item.online && <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-[#3aefbf]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-ui-title truncate text-[1rem] text-[#e6fff6]">{item.name}</p>
                      <p className="font-ui-meta text-[0.64rem] uppercase tracking-[0.06em] text-[#9ac7b7]">{item.time}</p>
                    </div>
                    <p className="font-ui-content truncate text-sm text-[#9fc6b8]">{item.preview}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <article className="flex min-h-[calc(100vh-8.2rem)] flex-col bg-[linear-gradient(180deg,#031d17_0%,#02140f_100%)]">
          <header className="flex items-center justify-between border-b border-[#114538] px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 rounded-full bg-[#376f5f]">
                <span className="font-ui-title flex h-full w-full items-center justify-center text-sm text-[#e6fff5]">MQ</span>
                <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-[#33e2b3]" />
              </div>
              <div>
                <p className="font-ui-title text-[1rem] text-[#e4fff4]">Minh Quân</p>
                <p className="font-ui-content text-xs text-[#53e1b5]">đang hoạt động</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[#a8d8c7]">
              <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0d342a] hover:bg-[#16473a]">
                <PhoneIcon />
              </button>
              <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0d342a] hover:bg-[#16473a]">
                <VideoIcon />
              </button>
              <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0d342a] hover:bg-[#16473a]">
                <InfoIcon />
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div className="flex justify-center">
              <span className="font-ui-meta rounded-full bg-[#0d2f26] px-3 py-1 text-[0.62rem] uppercase tracking-[0.14em] text-[#87b3a4]">HÔM NAY</span>
            </div>

            <div className="max-w-[62%] rounded-2xl bg-[#102b24] px-4 py-3 text-[#d8f8ec]">
              <p className="zync-chat-message font-ui-content">Chào buổi sáng! Bạn đã xem qua bản thiết kế ZYNC mới chưa?</p>
              <p className="font-ui-meta mt-2 text-[0.66rem] text-[#88b8a7]">09:15</p>
            </div>

            <div className="ml-auto max-w-[62%] rounded-2xl bg-[#35e1b7] px-4 py-3 text-[#05382e]">
              <p className="zync-chat-message font-ui-content">Mình vừa xem xong, trông tuyệt lắm! Đặc biệt là phần bảng màu Verdant Nexus ấy.</p>
              <p className="font-ui-meta mt-2 text-right text-[0.66rem] text-[#0e5e4c]">09:18</p>
            </div>

            <div className="ml-auto max-w-[62%] rounded-2xl bg-[#35e1b7] px-4 py-3 text-[#05382e]">
              <p className="zync-chat-message font-ui-content">Bạn định khi nào thì bắt đầu code phần Layout?</p>
              <p className="font-ui-meta mt-2 text-right text-[0.66rem] text-[#0e5e4c]">09:20</p>
            </div>

            <div className="max-w-[62%] rounded-2xl bg-[#102b24] px-4 py-3 text-[#d8f8ec]">
              <p className="zync-chat-message font-ui-content">Chắc là chiều nay thôi. À mình gửi kèm file spec của UI để bạn xem trước nhé.</p>
              <div className="mt-3 rounded-xl border border-[#1b5142] bg-[#0b3329] p-3">
                <p className="font-ui-title text-sm text-[#e3fff5]">ZYNC_Design_Spec.pdf</p>
                <p className="font-ui-meta mt-1 text-[0.65rem] text-[#88b5a6]">2.4 MB</p>
              </div>
              <p className="font-ui-meta mt-2 text-[0.66rem] text-[#88b8a7]">12:45</p>
            </div>

            <p className="font-ui-content text-sm italic text-[#99c2b3]">Minh Quân đang soạn tin...</p>
          </div>

          <footer className="border-t border-[#114538] px-4 py-3">
            <div className="flex items-center gap-2 rounded-2xl bg-[#0d2c24] px-3 py-2">
              <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#96c5b5] hover:bg-[#164336]">
                <AttachIcon />
              </button>
              <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#96c5b5] hover:bg-[#164336]">
                <ImageIcon />
              </button>
              <input
                type="text"
                placeholder="Nhập tin nhắn..."
                className="font-ui-content h-10 flex-1 bg-transparent px-1 text-sm text-[#dffcf2] outline-none placeholder:text-[#80ac9d]"
              />
              <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#96c5b5] hover:bg-[#164336]">
                <SmileIcon />
              </button>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#33deb3] text-[#043329] transition hover:brightness-110"
              >
                <SendIcon />
              </button>
            </div>
          </footer>
        </article>
      </div>
    </section>
  );
}
