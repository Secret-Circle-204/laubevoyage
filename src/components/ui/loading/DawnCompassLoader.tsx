import React from 'react'

export interface DawnCompassLoaderProps {
  /**
   * Predefined size tokens:
   * - 'sm': Compact inline/widget mark (48x32px)
   * - 'md': Standard component luxury loader (240x140px)
   * - 'lg': Full cinematic signature departure (320x220px, responsively scales up to 440px)
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Optional custom classes appended to the root container.
   */
  className?: string

  /**
   * Optional accessibility role.
   * If `aria-label` is provided, defaults to 'status'.
   * If no `aria-label` is provided, remains undefined while `aria-hidden="true"` is set.
   */
  role?: string

  /**
   * Optional accessible label passed by consumer (e.g. localized dictionary string).
   * When omitted, the loader is treated as purely decorative (`aria-hidden="true"`).
   */
  'aria-label'?: string

  /**
   * If true, expands the loader container to occupy the full available viewport height.
   * @default false
   */
  fullScreen?: boolean
}

/**
 * DawnCompassLoader — "The Signature Departure" (Silky Smooth Single-Jet 3D Preloader)
 * 
 * High-end cinematic luxury brand loader for L'Aube Voyage.
 * Evoking private aviation, bespoke travel, and timeless elegance.
 * 
 * Visual Architecture & Silky Smooth 3D Layer Interleaving:
 * 1. Layer 0 (Deep Atmosphere):
 *    - Ambient Celestial Aurora/Halo: Soft breathing radial glow (warm amber `#f58220` into deep cyan `#00aeef`).
 * 2. Layer 1 (Rear Orbit Track):
 *    - Rear Orbital Arc: Receding trajectory behind the upper brand line "L’AUBE".
 * 3. Layer 2 (Lower Brand Line):
 *    - "VOYAGE" rendered in Layer 2, so the jet visibly passes IN FRONT of it.
 * 4. Layer 3 (Foreground Orbit & Continuous Executive Jet):
 *    - Front Orbital Arc: Luminous foreground trajectory with animated flight contrail stream.
 *    - The Single Jet: Follows a continuous, closed, unbroken 3D orbital loop.
 *      Zero opacity toggling, zero duplicate planes, zero glitching at turn vertices.
 *      Smooth sine-wave perspective scaling (scale 1.24 at bottom foreground, scale 0.84 at top rear).
 * 5. Layer 4 (Upper Brand Line):
 *    - "L’AUBE" rendered in Layer 4, so the jet visibly passes BEHIND it.
 * 6. Layer 5 (Luxury Loading Affordance):
 *    - Hairline Luxury Loading Track: Indeterminate sliding light beam signifying active data streaming.
 *    - Pulsing Celestial Waypoint: Rhythmic golden departure beacon.
 * 
 * Invariants:
 * - Pure React Server Component (RSC) — zero client hooks, zero browser APIs, zero JS runtime.
 * - 100% CSS/SVG keyframe animations.
 * - Reduced Motion: Fully static state when `prefers-reduced-motion: reduce` is active.
 * - Decorative by default: `aria-hidden="true"`, zero hardcoded English text in accessibility attributes.
 */
export function DawnCompassLoader({
  size = 'md',
  className = '',
  role,
  'aria-label': ariaLabel,
  fullScreen = false,
}: DawnCompassLoaderProps) {
  const resolvedRole = role ?? (ariaLabel ? 'status' : undefined)
  const isDecorative = !ariaLabel
  const fullScreenClasses = fullScreen
    ? 'w-full min-h-[calc(100vh-5rem)] flex-grow dark:bg-[radial-gradient(ellipse_75%_55%_at_50%_44%,rgba(245,130,32,0.14)_0%,transparent_50%),radial-gradient(ellipse_85%_65%_at_50%_35%,rgba(46,49,146,0.35)_0%,rgba(30,33,102,0.25)_40%,transparent_75%),radial-gradient(circle_at_50%_50%,#0b0d1b_0%,#05060b_100%)]'
    : ''

  return (
    <div
      className={`dawn-compass-loader inline-flex items-center justify-center select-none relative ${fullScreenClasses} ${className}`}
      role={resolvedRole}
      aria-label={ariaLabel}
      aria-hidden={isDecorative ? true : undefined}
    >
      <style>{`
        /* =====================================================================
           L'AUBE VOYAGE — "The Signature Departure" Silky Motion Engine
           Single unbroken 3D orbit loop. Zero glitching. Pure aerodynamic grace.
           ===================================================================== */
        
        /* 1. Continuous Orbit Timing */
        @keyframes dawnJetOrbitLg {
          0% {
            offset-distance: 0%;
          }
          100% {
            offset-distance: 100%;
          }
        }
        @keyframes dawnJetOrbitMd {
          0% {
            offset-distance: 0%;
          }
          100% {
            offset-distance: 100%;
          }
        }
        @keyframes dawnJetOrbitSm {
          0% {
            offset-distance: 0%;
          }
          100% {
            offset-distance: 100%;
          }
        }

        /* 2. Smooth Perspective 3D Scaling & Depth Illumination */
        @keyframes dawnJet3DScaleLg {
          0% {
            transform: scale(0.92);
            filter: drop-shadow(0 0 6px rgba(245,130,32,0.55));
          }
          25% {
            transform: scale(0.76); /* Far Point: Directly behind L'AUBE in distance */
            filter: drop-shadow(0 0 3px rgba(245,130,32,0.35));
          }
          50% {
            transform: scale(0.92);
            filter: drop-shadow(0 0 6px rgba(245,130,32,0.55));
          }
          75% {
            transform: scale(1.16); /* Near Point: Directly in front of VOYAGE up close */
            filter: drop-shadow(0 0 12px rgba(245,130,32,0.95)) drop-shadow(0 3px 5px rgba(0,0,0,0.8));
          }
          100% {
            transform: scale(0.92);
            filter: drop-shadow(0 0 6px rgba(245,130,32,0.55));
          }
        }
        @keyframes dawnJet3DScaleMd {
          0% {
            transform: scale(0.92);
            filter: drop-shadow(0 0 5px rgba(245,130,32,0.45));
          }
          25% {
            transform: scale(0.76); /* Behind L'AUBE in distance */
            filter: drop-shadow(0 0 3px rgba(245,130,32,0.3));
          }
          50% {
            transform: scale(0.92);
            filter: drop-shadow(0 0 5px rgba(245,130,32,0.45));
          }
          75% {
            transform: scale(1.15); /* In front of VOYAGE up close */
            filter: drop-shadow(0 0 9px rgba(245,130,32,0.85));
          }
          100% {
            transform: scale(0.92);
            filter: drop-shadow(0 0 5px rgba(245,130,32,0.45));
          }
        }

        /* 3. Active Flight Contrail Stream */
        @keyframes dawnStreamDash {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -140;
          }
        }
        .dawn-orbit-stream {
          animation: dawnStreamDash 3s linear infinite;
        }

        /* 4. Cinematic Shimmer Bar */
        @keyframes dawnShimmerSweep {
          0% {
            transform: translateX(-160px);
            opacity: 0;
          }
          20% {
            opacity: 0.95;
          }
          60% {
            opacity: 0.95;
          }
          85% {
            transform: translateX(160px);
            opacity: 0;
          }
          100% {
            transform: translateX(160px);
            opacity: 0;
          }
        }
        .dawn-shimmer-beam {
          animation: dawnShimmerSweep 3.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        /* 5. Atmospheric Celestial Halo Breathing */
        @keyframes dawnHaloBreathe {
          0%, 100% {
            transform: scale(0.92);
            opacity: 0.24;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.48;
          }
        }
        .dawn-halo-lg {
          transform-origin: 160px 82px;
          animation: dawnHaloBreathe 4.5s ease-in-out infinite;
        }
        .dawn-halo-md {
          transform-origin: 120px 60px;
          animation: dawnHaloBreathe 4.5s ease-in-out infinite;
        }

        /* 6. Luxury Loading Beam */
        @keyframes dawnLoadingBarSweep {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(300%);
          }
        }
        .dawn-loading-beam {
          animation: dawnLoadingBarSweep 2.2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }

        /* 7. Celestial Waypoint Pulse */
        @keyframes dawnWaypointPulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.9);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.15);
          }
        }
        .dawn-waypoint {
          animation: dawnWaypointPulse 2.4s ease-in-out infinite;
        }

        /* Size LG Single Jet */
        .dawn-signature-jet-lg {
          offset-path: path("M 50,82 A 110,32 0 0,0 270,82 A 110,32 0 0,0 50,82");
          offset-rotate: auto;
          offset-anchor: 0px 0px;
          animation: dawnJetOrbitLg 7.2s linear infinite;
        }
        .dawn-signature-jet-lg > g {
          transform-origin: 0px 0px;
          animation: dawnJet3DScaleLg 7.2s ease-in-out infinite;
        }

        /* Size MD Single Jet */
        .dawn-signature-jet-md {
          offset-path: path("M 42,60 A 78,22 0 0,0 198,60 A 78,22 0 0,0 42,60");
          offset-rotate: auto;
          offset-anchor: 0px 0px;
          animation: dawnJetOrbitMd 6.5s linear infinite;
        }
        .dawn-signature-jet-md > g {
          transform-origin: 0px 0px;
          animation: dawnJet3DScaleMd 6.5s ease-in-out infinite;
        }

        /* Size SM Single Jet */
        .dawn-signature-jet-sm {
          offset-path: path("M 10,16 A 14,5.5 0 0,0 38,16 A 14,5.5 0 0,0 10,16");
          offset-rotate: auto;
          offset-anchor: 0px 0px;
          animation: dawnJetOrbitSm 5.5s linear infinite;
        }
        .dawn-signature-jet-sm > g {
          transform-origin: 0px 0px;
        }

        /* Static Reduced Motion Override */
        @media (prefers-reduced-motion: reduce) {
          .dawn-compass-loader,
          .dawn-compass-loader * {
            animation: none !important;
            transition: none !important;
          }
          .dawn-signature-jet-lg {
            offset-distance: 75% !important; /* Rests calmly at bottom center in foreground */
          }
          .dawn-signature-jet-lg > g {
            transform: scale(1.05) !important;
          }
          .dawn-signature-jet-md {
            offset-distance: 75% !important;
          }
          .dawn-signature-jet-md > g {
            transform: scale(1.05) !important;
          }
          .dawn-signature-jet-sm {
            offset-distance: 75% !important;
          }
          .dawn-shimmer-beam,
          .dawn-loading-beam {
            display: none !important;
          }
        }
      `}</style>

      {/* ===================================================================
          SIZE: LG — Full Cinematic Signature Departure (320x220px, Two Lines)
          =================================================================== */}
      {size === 'lg' && (
        <svg
          viewBox="0 0 320 220"
          width="320"
          height="220"
          className="w-[260px] sm:w-[320px] md:w-[350px] max-w-full h-auto overflow-visible motion-reduce:animate-none"
          aria-hidden="true"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Atmospheric Breathing Aura */}
            <radialGradient id="dawn-halo-lg-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-accent, #f58220)" stopOpacity="0.32" />
              <stop offset="45%" stopColor="#2e3191" stopOpacity="0.25" />
              <stop offset="80%" stopColor="var(--color-secondary, #00aeef)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>

            {/* Rear Orbit Gradient (Receding behind L'AUBE) */}
            <linearGradient id="dawn-orbit-rear-lg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2e3191" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#2e3191" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--color-secondary, #00aeef)" stopOpacity="0.3" />
            </linearGradient>

            {/* Front Orbit Gradient (Luminous foreground in front of VOYAGE) */}
            <linearGradient id="dawn-orbit-front-lg-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-secondary, #00aeef)" stopOpacity="0.5" />
              <stop offset="35%" stopColor="var(--color-accent, #f58220)" stopOpacity="1" />
              <stop offset="70%" stopColor="#ffaa5b" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--color-accent, #f58220)" stopOpacity="0.5" />
            </linearGradient>

            {/* Shimmer Mask for Brand Typography */}
            <linearGradient id="dawn-shimmer-lg-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-accent, #f58220)" stopOpacity="0" />
              <stop offset="50%" stopColor="#ffaa5b" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--color-accent, #f58220)" stopOpacity="0" />
            </linearGradient>

            <clipPath id="dawn-clip-laube-lg">
              <text
                x="160"
                y="64"
                textAnchor="middle"
                dominantBaseline="central"
                className="font-hornbill font-light text-[25px] tracking-[0.32em]"
                letterSpacing="0.32em"
              >
                L’AUBE
              </text>
            </clipPath>
            <clipPath id="dawn-clip-voyage-lg">
              <text
                x="160"
                y="96"
                textAnchor="middle"
                dominantBaseline="central"
                className="font-hornbill font-light text-[19px] tracking-[0.42em]"
                letterSpacing="0.42em"
              >
                VOYAGE
              </text>
            </clipPath>

            {/* Indeterminate Luxury Loading Track Beam */}
            <linearGradient id="dawn-load-lg-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00adee" stopOpacity="0" />
              <stop offset="30%" stopColor="#00adee" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#f48120" stopOpacity="1" />
              <stop offset="100%" stopColor="#ffaa5b" stopOpacity="0" />
            </linearGradient>

            <clipPath id="dawn-load-clip-lg">
              <rect x="0" y="0" width="140" height="1.5" rx="0.75" />
            </clipPath>
          </defs>

          {/* ===================================================================
               LAYER 0: ATMOSPHERIC CELESTIAL HALO (Deep Background)
               =================================================================== */}
          <circle cx="160" cy="82" r="75" fill="url(#dawn-halo-lg-grad)" className="dawn-halo-lg pointer-events-none" />

          {/* ===================================================================
               LAYER 1: REAR ORBIT TRACK (Passes BEHIND L'AUBE)
               =================================================================== */}
          <g transform="rotate(-10 160 82)">
            <path
              d="M 270,82 A 110,32 0 0,0 50,82"
              stroke="url(#dawn-orbit-rear-lg-grad)"
              strokeWidth="1.2"
              strokeDasharray="5 7"
              strokeLinecap="round"
              className="opacity-60 pointer-events-none"
            />
            <path
              d="M 270,82 A 110,32 0 0,0 50,82"
              stroke="currentColor"
              strokeWidth="0.75"
              className="text-foreground/15 dark:text-white/15 pointer-events-none"
            />
          </g>

          {/* ===================================================================
               LAYER 2: LINE 2 — VOYAGE (Sits BEHIND the Jet)
               In the official logo, VOYAGE is iconic Sky Cyan (#00ADEE)!
               =================================================================== */}
          <text
            x="160"
            y="96"
            textAnchor="middle"
            dominantBaseline="central"
            className="font-hornbill font-light text-[19px] fill-[#00adee] tracking-[0.42em]"
            letterSpacing="0.42em"
          >
            VOYAGE
          </text>
          {/* Cinematic Shimmer for VOYAGE */}
          <g clipPath="url(#dawn-clip-voyage-lg)" className="pointer-events-none">
            <rect
              x="85"
              y="74"
              width="150"
              height="42"
              fill="url(#dawn-shimmer-lg-grad)"
              className="dawn-shimmer-beam mix-blend-screen"
            />
          </g>

          {/* ===================================================================
               LAYER 3: FOREGROUND ORBIT & THE SINGLE CONTINUOUS JET
               Sits IN FRONT OF VOYAGE, but BEHIND L'AUBE!
               =================================================================== */}
          <g transform="rotate(-10 160 82)">
            {/* Front Orbit Arc (in front of VOYAGE) */}
            <path
              d="M 50,82 A 110,32 0 0,0 270,82"
              stroke="url(#dawn-orbit-front-lg-grad)"
              strokeWidth="1.6"
              strokeLinecap="round"
              className="pointer-events-none"
            />

            {/* Active Luminous Flight Stream / Contrail */}
            <path
              d="M 50,82 A 110,32 0 0,0 270,82"
              stroke="url(#dawn-orbit-front-lg-grad)"
              strokeWidth="2.4"
              strokeDasharray="14 30"
              strokeLinecap="round"
              className="dawn-orbit-stream pointer-events-none"
              filter="drop-shadow(0 0 6px rgba(244,129,32,0.75))"
            />

            {/* THE SINGLE CONTINUOUS EXECUTIVE JET (Unbroken 3D Flight) */}
            <g className="dawn-signature-jet-lg">
              <g>
                {/* Supersonic Contrail / Engine Flare (#00ADEE) */}
                <ellipse
                  cx="-11.5"
                  cy="0"
                  rx="3.5"
                  ry="1.5"
                  className="fill-[#00adee] opacity-90"
                />
                {/* Perfectly Centered Executive Jet Silhouette (#F48120) */}
                <path
                  d="M10,0 L4,-1.4 L1.5,-1.8 L-2.5,-8.5 L-4.5,-7.5 L-2,-1.5 L-5.5,-1.2 L-8.5,-3.5 L-9.5,-3 L-10,0 L-9.5,3 L-8.5,3.5 L-5.5,1.2 L-2,1.5 L-4.5,7.5 L-2.5,8.5 L1.5,1.8 L4,1.4 Z"
                  className="fill-[#f48120]"
                />
                {/* Cockpit Glass Gleam */}
                <path
                  d="M4.5,0 L2.2,-0.8 L0.8,-0.8 L2.2,0.8 Z"
                  fill="#ffffff"
                  opacity="0.95"
                />
              </g>
            </g>
          </g>

          {/* ===================================================================
               LAYER 4: LINE 1 — L'AUBE (Sits IN FRONT OF the Jet)
               In official logo: Deep Indigo (#2E3191) in light, Crisp White in dark!
               =================================================================== */}
          <text
            x="160"
            y="64"
            textAnchor="middle"
            dominantBaseline="central"
            className="font-hornbill font-light text-[25px] fill-[#2e3191] dark:fill-white tracking-[0.32em]"
            letterSpacing="0.32em"
          >
            L’AUBE
          </text>
          {/* Cinematic Shimmer for L'AUBE */}
          <g clipPath="url(#dawn-clip-laube-lg)" className="pointer-events-none">
            <rect
              x="85"
              y="40"
              width="150"
              height="48"
              fill="url(#dawn-shimmer-lg-grad)"
              className="dawn-shimmer-beam mix-blend-screen"
            />
          </g>

          {/* ===================================================================
               LAYER 5: LUXURY LOADING BAR & CELESTIAL DEPARTURE STATUS
               =================================================================== */}
          {/* Hairline Luxury Loading Track */}
          <g transform="translate(90, 142)" className="pointer-events-none">
            <rect
              x="0"
              y="0"
              width="140"
              height="1.5"
              rx="0.75"
              className="fill-foreground/15 dark:fill-white/15"
            />
            <g clipPath="url(#dawn-load-clip-lg)">
              <rect
                x="0"
                y="-1"
                width="55"
                height="3.5"
                fill="url(#dawn-load-lg-grad)"
                className="dawn-loading-beam"
              />
            </g>
          </g>

          {/* Celestial Departure Pulse Waypoint */}
          <circle
            cx="160"
            cy="160"
            r="1.5"
            className="dawn-waypoint fill-[var(--color-accent,#f58220)] pointer-events-none"
          />
        </svg>
      )}

      {/* ===================================================================
          SIZE: MD — Standard Component Luxury Loader (240x140px, Two Lines)
          =================================================================== */}
      {size === 'md' && (
        <svg
          viewBox="0 0 240 140"
          width="240"
          height="140"
          className="w-[240px] max-w-full h-auto overflow-visible motion-reduce:animate-none"
          aria-hidden="true"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="dawn-halo-md-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-accent, #f58220)" stopOpacity="0.28" />
              <stop offset="50%" stopColor="var(--color-secondary, #00aeef)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="var(--color-secondary, #00aeef)" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="dawn-orbit-rear-md-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent, #f58220)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--color-secondary, #00aeef)" stopOpacity="0.2" />
            </linearGradient>

            <linearGradient id="dawn-orbit-front-md-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-secondary, #00aeef)" stopOpacity="0.35" />
              <stop offset="50%" stopColor="var(--color-accent, #f58220)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--color-accent, #f58220)" stopOpacity="0.35" />
            </linearGradient>

            <linearGradient id="dawn-shimmer-md-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-accent, #f58220)" stopOpacity="0" />
              <stop offset="50%" stopColor="#ffaa5b" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--color-accent, #f58220)" stopOpacity="0" />
            </linearGradient>

            <clipPath id="dawn-clip-laube-md">
              <text
                x="120"
                y="48"
                textAnchor="middle"
                dominantBaseline="central"
                className="font-hornbill font-light text-[19px] tracking-[0.3em]"
                letterSpacing="0.3em"
              >
                L’AUBE
              </text>
            </clipPath>
            <clipPath id="dawn-clip-voyage-md">
              <text
                x="120"
                y="72"
                textAnchor="middle"
                dominantBaseline="central"
                className="font-hornbill font-light text-[15px] tracking-[0.38em]"
                letterSpacing="0.38em"
              >
                VOYAGE
              </text>
            </clipPath>

            <linearGradient id="dawn-load-md-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-secondary, #00aeef)" stopOpacity="0" />
              <stop offset="50%" stopColor="var(--color-accent, #f58220)" stopOpacity="1" />
              <stop offset="100%" stopColor="#ffaa5b" stopOpacity="0" />
            </linearGradient>

            <clipPath id="dawn-load-clip-md">
              <rect x="0" y="0" width="100" height="1.2" rx="0.6" />
            </clipPath>
          </defs>

          {/* Halo */}
          <circle cx="120" cy="60" r="55" fill="url(#dawn-halo-md-grad)" className="dawn-halo-md pointer-events-none" />

          {/* Layer 1: Rear Orbit Track */}
          <g transform="rotate(-10 120 60)">
            <path
              d="M 198,60 A 78,22 0 0,0 42,60"
              stroke="url(#dawn-orbit-rear-md-grad)"
              strokeWidth="1"
              strokeDasharray="4 6"
              strokeLinecap="round"
              className="opacity-50 pointer-events-none"
            />
            <path
              d="M 198,60 A 78,22 0 0,0 42,60"
              stroke="currentColor"
              strokeWidth="0.65"
              className="text-foreground/15 dark:text-white/15 pointer-events-none"
            />
          </g>

          {/* Layer 2: VOYAGE (Sits behind Jet) */}
          <text
            x="120"
            y="70"
            textAnchor="middle"
            dominantBaseline="central"
            className="font-hornbill font-light text-[14px] fill-[#00adee] tracking-[0.38em]"
            letterSpacing="0.38em"
          >
            VOYAGE
          </text>
          <g clipPath="url(#dawn-clip-voyage-md)" className="pointer-events-none">
            <rect
              x="60"
              y="54"
              width="120"
              height="32"
              fill="url(#dawn-shimmer-md-grad)"
              className="dawn-shimmer-beam mix-blend-screen"
            />
          </g>

          {/* Layer 3: Foreground Orbit & Single Jet */}
          <g transform="rotate(-10 120 60)">
            <path
              d="M 42,60 A 78,22 0 0,0 198,60"
              stroke="url(#dawn-orbit-front-md-grad)"
              strokeWidth="1.4"
              strokeLinecap="round"
              className="pointer-events-none"
            />
            <path
              d="M 42,60 A 78,22 0 0,0 198,60"
              stroke="url(#dawn-orbit-front-md-grad)"
              strokeWidth="2"
              strokeDasharray="10 20"
              strokeLinecap="round"
              className="dawn-orbit-stream pointer-events-none"
            />

            <g className="dawn-signature-jet-md">
              <g>
                <ellipse
                  cx="-8.5"
                  cy="0"
                  rx="2.5"
                  ry="1.2"
                  className="fill-[#00adee] opacity-90"
                />
                <path
                  d="M7.5,0 L3,-1 L1.2,-1.4 L-2,-6.5 L-3.5,-5.8 L-1.5,-1.2 L-4,-1 L-6.5,-2.5 L-7.2,-2.2 L-7.5,0 L-7.2,2.2 L-6.5,2.5 L-4,1 L-1.5,1.2 L-3.5,5.8 L-2,6.5 L1.2,1.4 L3,1 Z"
                  className="fill-[#f48120]"
                />
                <path
                  d="M3.2,0 L1.5,-0.6 L0.5,-0.6 L1.5,0.6 Z"
                  fill="#ffffff"
                  opacity="0.95"
                />
              </g>
            </g>
          </g>

          {/* Layer 4: L'AUBE (Sits in front of Jet) */}
          <text
            x="120"
            y="48"
            textAnchor="middle"
            dominantBaseline="central"
            className="font-hornbill font-light text-[17.5px] fill-[#2e3191] dark:fill-white tracking-[0.3em]"
            letterSpacing="0.3em"
          >
            L’AUBE
          </text>
          <g clipPath="url(#dawn-clip-laube-md)" className="pointer-events-none">
            <rect
              x="60"
              y="30"
              width="120"
              height="35"
              fill="url(#dawn-shimmer-md-grad)"
              className="dawn-shimmer-beam mix-blend-screen"
            />
          </g>

          {/* Layer 5: Compact Loading Track */}
          <g transform="translate(70, 114)" className="pointer-events-none">
            <rect
              x="0"
              y="0"
              width="100"
              height="1.2"
              rx="0.6"
              className="fill-foreground/15 dark:fill-white/15"
            />
            <g clipPath="url(#dawn-load-clip-md)">
              <rect
                x="0"
                y="-1"
                width="45"
                height="3.2"
                fill="url(#dawn-load-md-grad)"
                className="dawn-loading-beam"
              />
            </g>
          </g>
        </svg>
      )}

      {/* ===================================================================
          SIZE: SM — Compact Minimalist Emblem (48x32px, Legible Micro Mark)
          =================================================================== */}
      {size === 'sm' && (
        <svg
          viewBox="0 0 48 32"
          width="48"
          height="32"
          className="w-[48px] h-[32px] overflow-visible motion-reduce:animate-none"
          aria-hidden="true"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="dawn-orbit-sm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent, #f58220)" stopOpacity="0.7" />
              <stop offset="100%" stopColor="var(--color-secondary, #00aeef)" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Micro Orbit & Jet */}
          <g transform="rotate(-10 24 16)">
            <ellipse
              cx="24"
              cy="16"
              rx="16"
              ry="8"
              stroke="currentColor"
              strokeWidth="0.7"
              className="text-foreground/20 dark:text-white/20 pointer-events-none"
            />
            <path
              d="M 8,16 A 16,8 0 0,0 40,16"
              stroke="url(#dawn-orbit-sm-grad)"
              strokeWidth="1"
              strokeDasharray="4 8"
              strokeLinecap="round"
              className="opacity-70 dark:opacity-85 pointer-events-none"
            />

            <g className="dawn-signature-jet-sm">
              <path
                d="M5,0 L1.8,-0.7 L-1,-3.8 L-1.8,-3.4 L-0.8,-0.7 L-2.8,-0.5 L-4.2,-1.6 L-4,0 L-4.2,1.6 L-2.8,0.5 L-0.8,0.7 L-1.8,3.4 L-1,3.8 L1.8,0.7 Z"
                className="fill-[var(--color-accent,#f58220)]"
              />
            </g>
          </g>

          {/* Micro Horizon Dawn Mark */}
          <path
            d="M17,16 A7,7 0 0,1 31,16 Z"
            fill="var(--color-accent, #f58220)"
            className="opacity-75"
          />
        </svg>
      )}
    </div>
  )
}
