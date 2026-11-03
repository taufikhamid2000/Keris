// Original keris emblem: wavy (luk) blade, crescent guard and bird-head hilt, drawn inline so it needs no asset.
export default function KerisEmblem({ className = "" }: { className?: string }) {
  return (
    <svg className={`emblem ${className}`} viewBox="0 0 40 120" aria-hidden="true">
      <defs>
        <linearGradient id="keris-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe3a8" />
          <stop offset="0.55" stopColor="#ffcf8a" />
          <stop offset="1" stopColor="#b8862f" />
        </linearGradient>
      </defs>
      <path
        fill="url(#keris-gold)"
        d="M17 40 Q14 50 18 58 Q22 66 17 74 Q12 82 17 90 Q21 98 18 106 L20 118 L22 106 Q25 98 21 90 Q16 82 21 74 Q26 66 22 58 Q18 50 23 40 Z"
      />
      <path fill="#2f8f8a" d="M20 44 Q18 52 20 58 Q22 52 20 44 Z" />
      <path fill="url(#keris-gold)" d="M8 40 Q20 34 32 38 L30 42 Q20 40 10 43 Z" />
      <path fill="url(#keris-gold)" d="M18 38 Q14 26 20 18 Q26 12 23 6 Q30 10 26 20 Q22 28 22 38 Z" />
    </svg>
  );
}
