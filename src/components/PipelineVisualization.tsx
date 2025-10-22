import React from 'react';

export default function PipelineVisualization() {
  return (
    <div className="pipeline-visual w-[392px] h-[258px] relative">
      <div className="pipeline-grid absolute inset-0">
        <svg className="w-full h-full" viewBox="0 0 392 258" fill="none" aria-hidden>
          <g opacity="0.08" stroke="currentColor" strokeDasharray="1 1">
            {Array.from({ length: 16 }).map((_, i) => (
              <line key={`h-${i}`} x2="392" y1={15.5 + i * 16} y2={15.5 + i * 16} />
            ))}
            {Array.from({ length: 24 }).map((_, i) => (
              <line key={`v-${i}`} x1={12 + i * 16} x2={12 + i * 16} y1="0" y2="256" />
            ))}
          </g>

          {/* Animated pulses (overlay strokes) */}
          <defs>
            <linearGradient id="gradA" x1="0" x2="1">
              <stop offset="0%" stopColor="#2EB9DF" stopOpacity="0" />
              <stop offset="20%" stopColor="#2EB9DF" stopOpacity="1" />
              <stop offset="100%" stopColor="#2EB9DF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gradB" x1="0" x2="1">
              <stop offset="0%" stopColor="#FF4A81" stopOpacity="0" />
              <stop offset="25%" stopColor="#DF6CF6" stopOpacity="1" />
              <stop offset="100%" stopColor="#0196FF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gradC" x1="0" x2="1">
              <stop offset="0%" stopColor="#FF7432" stopOpacity="0" />
              <stop offset="25%" stopColor="#F7CC4B" stopOpacity="1" />
              <stop offset="100%" stopColor="#F7CC4B" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Example animated strokes that follow the same routes as the attached visual */}
          <path
            d="M349 130L5 130"
            stroke="url(#gradA)"
            strokeWidth={2}
            strokeLinecap="round"
            className="pulse-path pulse-fast"
          />

          <path
            d="M547 130L822 130"
            stroke="url(#gradC)"
            strokeWidth={2}
            strokeLinecap="round"
            transform="translate(-155,-0)"
            className="pulse-path pulse-slow"
          />

          <path
            d="M547 150L633 150C635.209 150 637 151.791 637 154"
            stroke="url(#gradB)"
            strokeWidth={2}
            strokeLinecap="round"
            className="pulse-path pulse-medium"
          />

          {/* CPU center mark */}
          <g className="cpu-core" transform="translate(104,44)">
            <rect x="120" y="12" width="88" height="64" rx="6" fill="#0f1724" stroke="#ffffff1a" />
            <text x="164" y="54" fill="#66ffe4" fontSize={10} fontWeight={700} textAnchor="middle">Powered By</text>
          </g>
        </svg>
      </div>
    </div>
  );
}
