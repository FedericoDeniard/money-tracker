export function LogoBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ filter: "grayscale(1)", opacity: 0.08 }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="44 39 160 160"
          style={{
            width: "min(60vw, 60vh)",
            height: "min(60vw, 60vh)",
          }}
          fill="none"
        >
          {/* Shadow for subtle volume */}
          <path
            d="M80 50 L176 50 C184.837 50 192 57.1634 192 66 L192 196 L176 186 L160 196 L144 186 L128 196 L112 186 L96 196 L80 186 L64 196 L64 66 C64 57.1634 71.1634 50 80 50Z"
            fill="#E2E8F0"
          />

          {/* Receipt body */}
          <path
            d="M76 46 L172 46 C180.837 46 188 53.1634 188 62 L188 192 L172 182 L156 192 L140 182 L124 192 L108 182 L92 192 L76 182 L60 192 L60 62 C60 53.1634 67.1634 46 76 46Z"
            fill="#F8FAFC"
            stroke="#0F172A"
            strokeWidth="8"
            strokeLinejoin="round"
          />

          {/* Data lines */}
          <line
            x1="88"
            y1="80"
            x2="136"
            y2="80"
            stroke="#0F172A"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <line
            x1="88"
            y1="104"
            x2="160"
            y2="104"
            stroke="#94A3B8"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <line
            x1="88"
            y1="128"
            x2="120"
            y2="128"
            stroke="#94A3B8"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Eyes */}
          <circle cx="104" cy="164" r="8" fill="#0F172A" />
          <circle cx="144" cy="164" r="8" fill="#0F172A" />

          {/* Cheeks */}
          <ellipse
            cx="86"
            cy="170"
            rx="8"
            ry="5"
            fill="#F472B6"
            opacity="0.8"
          />
          <ellipse
            cx="162"
            cy="170"
            rx="8"
            ry="5"
            fill="#F472B6"
            opacity="0.8"
          />

          {/* Smile */}
          <path
            d="M118 168 Q124 176 130 168"
            stroke="#0F172A"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
