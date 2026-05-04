'use client';

interface LoginLoadingModalProps {
  open: boolean;
  message?: string;
}

export function LoginLoadingModal({ open, message = 'Đang xử lý...' }: LoginLoadingModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ animation: 'loginModalFadeIn 0.15s ease-out' }}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 flex flex-col items-center gap-5 rounded-3xl border border-[#1a5c4a]/70 bg-[#062a21]/95 px-10 py-9 shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
        style={{ animation: 'loginModalScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Spinner ring */}
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-[3px] border-[#0a3b2f]" />
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-[#1a7f64] border-r-[#1a7f64]" />
          <div className="absolute inset-[6px] animate-spin rounded-full border-[2px] border-transparent border-b-[#3dd9a0] border-l-[#3dd9a0] [animation-duration:1.4s] [animation-direction:reverse]" />
          <div className="absolute inset-3 rounded-full border border-[#0d3228]" />
        </div>

        {/* Pulsing dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block h-2 w-2 rounded-full bg-[#3dd9a0]"
              style={{
                animation: `loginDotPulse 1.2s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>

        <p className="font-ui-title text-base text-[#e4fff5]">{message}</p>
      </div>

      <style jsx>{`
        @keyframes loginModalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes loginModalScaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes loginDotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
