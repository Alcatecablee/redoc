import React from 'react';

import React from 'react';

const SOURCES = [
  { key: 'stack', label: 'Stack Overflow', subtitle: 'Q&A' },
  { key: 'github', label: 'GitHub Issues', subtitle: 'Code' },
  { key: 'youtube', label: 'YouTube', subtitle: 'Tutorials' },
  { key: 'reddit', label: 'Reddit', subtitle: 'Community' },
  { key: 'devto', label: 'DEV.to', subtitle: 'Articles' },
  { key: 'codeproject', label: 'CodeProject', subtitle: 'Examples' },
  { key: 'stackex', label: 'Stack Exchange', subtitle: 'Expert Qs' },
  { key: 'quora', label: 'Quora', subtitle: 'Insights' },
  { key: 'official', label: 'Official Forums', subtitle: 'Product Forums' }
];

export default function PipelineVisualization() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center">
        {/* Left: Animated SVG visual (enterprise style) */}
        <div className="flex-shrink-0 w-full md:w-1/2 flex justify-center">
          <div className="relative w-[392px] h-[258px]">
            <svg viewBox="0 0 392 258" className="w-full h-full" fill="none" aria-hidden>
              <g opacity="0.08" stroke="#ffffff" strokeDasharray="1 1">
                {Array.from({ length: 16 }).map((_, i) => (
                  <line key={`h-${i}`} x2="392" y1={15.5 + i * 16} y2={15.5 + i * 16} />
                ))}
                {Array.from({ length: 24 }).map((_, i) => (
                  <line key={`v-${i}`} x1={12 + i * 16} x2={12 + i * 16} y1="0" y2="256" />
                ))}
              </g>

              <defs>
                <linearGradient id="bluePulse" x1="0" x2="1">
                  <stop offset="0%" stopColor="#2EB9DF" stopOpacity="0" />
                  <stop offset="20%" stopColor="#2EB9DF" stopOpacity="1" />
                  <stop offset="100%" stopColor="#2EB9DF" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="pinkPulse" x1="0" x2="1">
                  <stop offset="0%" stopColor="#FF4A81" stopOpacity="0" />
                  <stop offset="30%" stopColor="#DF6CF6" stopOpacity="1" />
                  <stop offset="100%" stopColor="#0196FF" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="orangePulse" x1="0" x2="1">
                  <stop offset="0%" stopColor="#FF7432" stopOpacity="0" />
                  <stop offset="25%" stopColor="#F7CC4B" stopOpacity="1" />
                  <stop offset="100%" stopColor="#F7CC4B" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Pulses along key paths (mirrors provided attachments) */}
              <path d="M349 130L73 130" stroke="url(#bluePulse)" strokeWidth={2} strokeLinecap="round" className="pulse pulse-fast" />
              <path d="M547 130L822 130" stroke="url(#orangePulse)" strokeWidth={2} strokeLinecap="round" transform="translate(-155,0)" className="pulse pulse-medium" />
              <path d="M388 184L73 198" stroke="url(#pinkPulse)" strokeWidth={2} strokeLinecap="round" className="pulse pulse-slow" />

              {/* Central CPU / Card */}
              <g transform="translate(96,56)">
                <rect x="80" y="22" width="120" height="80" rx="10" fill="#0b1220" stroke="#66ffe430" strokeWidth={1} />
                <text x="140" y="70" textAnchor="middle" fill="#66ffe4" fontSize={12} fontWeight={700}>DOC SNAP</text>
                <rect x="124" y="40" width="32" height="32" rx="6" fill="#0f1724" opacity="0.2" />
              </g>
            </svg>

            {/* Decorative pulses managed with CSS for stagger and glow */}
            <style>{`
              .pulse { stroke-dasharray: 480; stroke-dashoffset: 480; opacity: 0.95; }
              @keyframes pulse-forward { to { stroke-dashoffset: 0; } }
              .pulse-fast { animation: pulse-forward 1.4s linear infinite; }
              .pulse-medium { animation: pulse-forward 2.4s linear infinite; }
              .pulse-slow { animation: pulse-forward 3.6s linear infinite; }
              @media (prefers-reduced-motion: reduce) { .pulse { animation: none !important; } }
            `}</style>
          </div>
        </div>

        {/* Right: Step flow with sources and final stages */}
        <div className="flex-1 w-full md:w-1/2">
          <div className="space-y-4">
            <div className="text-sm text-primary-400 font-medium">Website URL Input</div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-gradient-to-br from-white/6 to-white/3 flex items-center justify-center text-sm font-semibold text-white/90">1</div>
              <div className="text-white font-semibold">Site Discovery & Crawling</div>
            </div>

            <div className="mt-2">
              <div className="text-white font-semibold mb-2">Multi-Source Research Engine</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {SOURCES.map((s) => (
                  <div key={s.key} className="flex items-start gap-2 p-2 rounded-md bg-white/3 hover:bg-white/5 transition-colors">
                    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-tr from-[#3291FF] to-[#61DAFB] flex items-center justify-center text-xs font-bold text-black">{s.label[0]}</div>
                    <div>
                      <div className="text-xs font-medium text-white">{s.label}</div>
                      <div className="text-[11px] text-white/70">{s.subtitle}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <div className="text-white font-semibold mb-1">AI Content Synthesis</div>
              <div className="text-sm text-white/80">GPT-4o powered synthesis producing structured documentation.</div>
            </div>

            <div className="mt-3">
              <div className="text-white font-semibold mb-1">SEO Optimization (Pro/Enterprise)</div>
              <ul className="text-sm text-white/70 list-disc list-inside space-y-1">
                <li>Metadata Generation</li>
                <li>Schema Markup</li>
                <li>Sitemap Creation</li>
                <li>Keyword Optimization</li>
              </ul>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-green-500/20 flex items-center justify-center text-green-300 font-semibold">✓</div>
              <div>
                <div className="text-white font-semibold">Professional Documentation Output</div>
                <div className="text-sm text-white/70">Downloadable, SEO-ready docs tailored to your product.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
