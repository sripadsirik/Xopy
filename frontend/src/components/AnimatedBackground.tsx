import { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let time = 0;
    const draw = () => {
      if (prefersReducedMotion) {
        // Static fallback: just draw the spotlights once
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const drawSpot = (cx: number, cy: number, r: number, color: string) => {
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, color);
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        };
        drawSpot(w * 0.2, h * 0.15, h * 0.6, 'rgba(212, 168, 83, 0.025)');
        drawSpot(w * 0.75, h * 0.6, h * 0.55, 'rgba(123, 159, 212, 0.02)');
        drawSpot(w * 0.5, h * 0.85, h * 0.45, 'rgba(200, 149, 108, 0.015)');
        return; // Don't loop
      }

      time += 0.002;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Warm spotlight orbs — slow drifting like theater stage lights
      const drawSpotlight = (cx: number, cy: number, r: number, color: string) => {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, color);
        g.addColorStop(0.4, color.replace(/[\d.]+\)$/, '0)'));
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      };

      // Gold spotlight — upper left, slow drift
      drawSpotlight(
        w * 0.2 + Math.sin(time * 0.4) * 30,
        h * 0.15 + Math.cos(time * 0.3) * 20,
        h * 0.6,
        `rgba(212, 168, 83, ${0.02 + Math.sin(time * 0.5) * 0.008})`
      );

      // Cool blue spotlight — right side
      drawSpotlight(
        w * 0.75 + Math.cos(time * 0.35) * 25,
        h * 0.6 + Math.sin(time * 0.25) * 25,
        h * 0.55,
        `rgba(123, 159, 212, ${0.018 + Math.cos(time * 0.6) * 0.006})`
      );

      // Warm amber — bottom center
      drawSpotlight(
        w * 0.5 + Math.sin(time * 0.2) * 40,
        h * 0.85 + Math.cos(time * 0.35) * 15,
        h * 0.45,
        `rgba(200, 149, 108, ${0.014 + Math.sin(time * 0.4) * 0.005})`
      );

      // Subtle light beam from top — like a projector
      const beamX = w * 0.5 + Math.sin(time * 0.15) * w * 0.1;
      const beamGrad = ctx.createLinearGradient(beamX - 80, 0, beamX + 80, h * 0.7);
      beamGrad.addColorStop(0, 'rgba(212, 168, 83, 0.012)');
      beamGrad.addColorStop(0.5, 'rgba(212, 168, 83, 0.004)');
      beamGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(beamX - 20, 0);
      ctx.lineTo(beamX - 200, h * 0.7);
      ctx.lineTo(beamX + 200, h * 0.7);
      ctx.lineTo(beamX + 20, 0);
      ctx.closePath();
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
