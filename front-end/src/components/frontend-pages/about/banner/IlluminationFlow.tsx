import { useEffect, useRef, useState, useMemo } from 'react';
import { Box } from '@mui/material';

/* ── Tunable Constants ─────────────────────────────────────────────── */
const PARTICLE_COUNT = 7;             // Max particles on screen (4-10 range)
const PARTICLE_MIN_SIZE = 1;          // px
const PARTICLE_MAX_SIZE = 3;          // px
const PARTICLE_MIN_OPACITY = 0.08;
const PARTICLE_MAX_OPACITY = 0.18;
const PARTICLE_MIN_DURATION = 8;      // seconds for full drift across
const PARTICLE_MAX_DURATION = 16;
const PARTICLE_SPAWN_LEFT = 5;        // % from left where particles originate
const PARTICLE_SPAWN_SPREAD = 12;     // % horizontal spread of spawn zone
const PARTICLE_VERTICAL_CENTER = 40;  // % vertical center of spawn zone
const PARTICLE_VERTICAL_SPREAD = 30;  // % vertical spread
const GLOW_COLOR = 'rgba(212, 175, 55, 0.12)';  // Warm gold, very subtle
const CARRIER_COLOR = 'rgba(212, 175, 55, 0.04)'; // Even more subtle for carrier
const PARTICLE_COLOR = '212, 175, 55';             // RGB for particle gold

interface Particle {
  id: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  startX: number;     // % from left
  startY: number;     // % from top
  driftY: number;     // upward drift in px (negative = up)
}

/** Generates a set of randomized particles with staggered spawn times. */
function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    size: PARTICLE_MIN_SIZE + Math.random() * (PARTICLE_MAX_SIZE - PARTICLE_MIN_SIZE),
    opacity: PARTICLE_MIN_OPACITY + Math.random() * (PARTICLE_MAX_OPACITY - PARTICLE_MIN_OPACITY),
    duration: PARTICLE_MIN_DURATION + Math.random() * (PARTICLE_MAX_DURATION - PARTICLE_MIN_DURATION),
    delay: Math.random() * PARTICLE_MAX_DURATION,  // Stagger across the full cycle
    startX: PARTICLE_SPAWN_LEFT + Math.random() * PARTICLE_SPAWN_SPREAD,
    startY: PARTICLE_VERTICAL_CENTER - PARTICLE_VERTICAL_SPREAD / 2 + Math.random() * PARTICLE_VERTICAL_SPREAD,
    driftY: -(10 + Math.random() * 30),  // Slight upward drift (10-40px)
  }));
}

/**
 * <IlluminationFlow />
 *
 * A reverent warm-gold ambient animation overlay for the About hero section.
 * Renders a soft radial glow behind the logo area, a slow carrier gradient,
 * and drifting dust particles — all extremely subtle.
 *
 * Respects prefers-reduced-motion: disables all motion, keeps only a faint
 * static glow.
 */
const IlluminationFlow = () => {
  const [reducedMotion, setReducedMotion] = useState(false);
  const particles = useMemo(() => generateParticles(), []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,  // Behind hero content (content should be zIndex: 1+)

        /* ── Logo Glow: soft radial pulse behind logo area ── */
        '&::before': {
          content: '""',
          position: 'absolute',
          left: '-5%',
          top: '10%',
          width: '40%',
          height: '80%',
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center, ${GLOW_COLOR} 0%, transparent 70%)`,
          animation: reducedMotion ? 'none' : 'illumination-pulse 6s ease-in-out infinite',
          opacity: reducedMotion ? 0.5 : 1,
        },

        /* ── Carrier Glow: elongated gradient that drifts left→right ── */
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '20%',
          left: '-20%',
          width: '40%',
          height: '60%',
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center, ${CARRIER_COLOR} 0%, transparent 60%)`,
          animation: reducedMotion ? 'none' : 'illumination-carrier 20s linear infinite',
          opacity: reducedMotion ? 0 : 1,
        },

        /* ── Keyframe definitions ── */
        '@keyframes illumination-pulse': {
          '0%, 100%': { opacity: 0.5, transform: 'scale(1)' },
          '50%': { opacity: 1, transform: 'scale(1.08)' },
        },
        '@keyframes illumination-carrier': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(300%)' },
        },
        '@keyframes illumination-drift': {
          '0%': {
            transform: 'translate(0, 0)',
            opacity: 0,
          },
          '10%': {
            opacity: 'var(--particle-opacity)',  // Fade in
          },
          '85%': {
            opacity: 'var(--particle-opacity)',
          },
          '100%': {
            // Drift rightward ~60vw with slight upward movement
            transform: 'translate(min(60vw, 500px), var(--particle-drift-y))',
            opacity: 0,  // Fade out — never pop
          },
        },
      }}
    >
      {/* ── Dust Particles ── */}
      {!reducedMotion &&
        particles.map((p) => (
          <Box
            key={p.id}
            sx={{
              position: 'absolute',
              left: `${p.startX}%`,
              top: `${p.startY}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              backgroundColor: `rgba(${PARTICLE_COLOR}, 0.6)`,
              boxShadow: `0 0 ${p.size + 1}px rgba(${PARTICLE_COLOR}, 0.3)`,
              // CSS custom properties for per-particle animation values
              '--particle-opacity': p.opacity,
              '--particle-drift-y': `${p.driftY}px`,
              animation: `illumination-drift ${p.duration}s ${p.delay}s ease-in-out infinite`,
              opacity: 0,  // Start invisible; animation handles fade-in
              willChange: 'transform, opacity',
            } as any}
          />
        ))}
    </Box>
  );
};

export default IlluminationFlow;
