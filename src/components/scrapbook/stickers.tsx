import type { SvgSticker } from "@/lib/scrapbook/model";

/** Illustrated stickers (viewBox 0 0 100 100). Outlined by the .os-sticker filter. */
export function SvgStickerArt({ id }: { id: SvgSticker }) {
  switch (id) {
    case "heart":
      return (
        <svg viewBox="0 0 100 100" className="block h-auto w-full">
          <path d="M50 88C22 70 6 54 6 34 6 20 17 10 30 10c9 0 16 5 20 12 4-7 11-12 20-12 13 0 24 10 24 24 0 20-16 36-44 54Z" fill="#f07c95" />
          <path d="M26 26c-6 3-8 9-7 15" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".7" />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 100 100" className="block h-auto w-full">
          <path d="m50 6 13 29 31 3-23 21 7 31-28-16-28 16 7-31L6 38l31-3Z" fill="#ffc94d" stroke="#e7a51f" strokeWidth="3" strokeLinejoin="round" />
        </svg>
      );
    case "xoxo":
      return (
        <svg viewBox="0 0 140 70" className="block h-auto w-full">
          <rect x="4" y="6" width="132" height="58" rx="29" fill="#ff8fab" />
          <text x="70" y="47" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="700" fontSize="34" fill="#fff">
            xoxo
          </text>
        </svg>
      );
    case "love-stamp":
      return (
        <svg viewBox="0 0 100 120" className="block h-auto w-full">
          <path
            d="M8 4h84v6a5 5 0 0 0 0 10v10a5 5 0 0 0 0 10v10a5 5 0 0 0 0 10v10a5 5 0 0 0 0 10v10a5 5 0 0 0 0 10v10H8v-10a5 5 0 0 0 0-10V80a5 5 0 0 0 0-10V60a5 5 0 0 0 0-10V40a5 5 0 0 0 0-10V20a5 5 0 0 0 0-10Z"
            fill="#fff8ee"
          />
          <rect x="18" y="16" width="64" height="72" fill="#e9a0a8" />
          <path d="M50 74C36 65 28 57 28 47c0-7 5-12 11-12 5 0 9 3 11 6 2-3 6-6 11-6 6 0 11 5 11 12 0 10-8 18-22 27Z" fill="#fff" />
          <text x="50" y="106" textAnchor="middle" fontFamily="'Courier New', monospace" fontWeight="700" fontSize="13" fill="#7a4a4a">
            LOVE ♡ 2
          </text>
        </svg>
      );
    case "arrow":
      return (
        <svg viewBox="0 0 120 70" className="block h-auto w-full">
          <path d="M8 52c24-4 50-18 88-36" fill="none" stroke="#3b2f2a" strokeWidth="6" strokeLinecap="round" />
          <path d="M80 10l18 5-8 17" fill="none" stroke="#3b2f2a" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "flower":
      return (
        <svg viewBox="0 0 100 100" className="block h-auto w-full">
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="50" cy="26" rx="15" ry="23" fill="#ffb7c5" transform={`rotate(${r} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="14" fill="#ffd166" />
        </svg>
      );
    case "smile":
      return (
        <svg viewBox="0 0 100 100" className="block h-auto w-full">
          <circle cx="50" cy="50" r="44" fill="#ffd84d" />
          <circle cx="36" cy="42" r="6" fill="#3b2f2a" />
          <circle cx="64" cy="42" r="6" fill="#3b2f2a" />
          <path d="M30 60c10 14 30 14 40 0" fill="none" stroke="#3b2f2a" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
    case "ticket":
      return (
        <svg viewBox="0 0 160 80" className="block h-auto w-full">
          <path d="M8 8h144v20a12 12 0 0 0 0 24v20H8V52a12 12 0 0 0 0-24Z" fill="#9fd3c7" />
          <path d="M112 12v56" stroke="#fff" strokeWidth="3" strokeDasharray="5 5" />
          <text x="60" y="48" textAnchor="middle" fontFamily="'Courier New', monospace" fontWeight="700" fontSize="18" fill="#1f4f47">
            ADMIT 2
          </text>
        </svg>
      );
  }
}
