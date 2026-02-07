// src/components/AnimatedBackground.tsx
import { useEffect, useRef } from "react";

type IconKind = "camera" | "clapper" | "reel" | "tape" | "play";

type Particle = {
  x: number;
  y: number;
  s: number;
  a: number;
  vx: number;
  vy: number;
  r: number;
  vr: number;
  tw: number;
  sp: number;
  kind: IconKind;

  bobAmp: number;
  bobSp: number;
  bobPh: number;

  born: number;
  life: number;
};

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    /* 🔥 SPEED + DENSITY CONTROLS */
    const TIME_SPEED = 2.2;
    const BASE_COUNT = 150;
    const MIN_COUNT = 150;
    const BURST_EVERY = 0.45;
    const BURST_SIZE = 12;

    const resize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

    const kinds: IconKind[] = ["camera", "clapper", "reel", "tape", "play"];

    /* ───────────────────────── Lights ───────────────────────── */

    const drawRadial = (
      cx: number,
      cy: number,
      r: number,
      c0: string,
      c1: string
    ) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, c0);
      g.addColorStop(1, c1);
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    };

    const drawVignette = (w: number, h: number) => {
      const g = ctx.createRadialGradient(
        w * 0.5,
        h * 0.45,
        0,
        w * 0.5,
        h * 0.45,
        Math.max(w, h) * 0.75
      );
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.65, "rgba(0,0,0,0.25)");
      g.addColorStop(1, "rgba(0,0,0,0.72)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    };

    const drawProjectorBeam = (w: number, h: number, t: number) => {
      const beamX = w * 0.5 + Math.sin(t * 0.6) * w * 0.16;
      const grad = ctx.createLinearGradient(beamX, 0, beamX, h * 0.8);

      grad.addColorStop(0, "rgba(212,168,83,0.06)");
      grad.addColorStop(0.3, "rgba(212,168,83,0.02)");
      grad.addColorStop(1, "rgba(212,168,83,0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(beamX - w * 0.02, 0);
      ctx.lineTo(beamX - w * 0.28, h * 0.8);
      ctx.lineTo(beamX + w * 0.28, h * 0.8);
      ctx.lineTo(beamX + w * 0.02, 0);
      ctx.closePath();
      ctx.fill();
    };

    /* 🔥 SIX SPOTLIGHTS TOTAL */
    const drawSpotlights = (w: number, h: number, t: number) => {
      // 1. top-left gold
      drawRadial(
        w * 0.18 + Math.sin(t * 0.9) * w * 0.1,
        h * 0.18 + Math.cos(t * 0.7) * h * 0.06,
        h * 0.6,
        "rgba(212,168,83,0.032)",
        "rgba(212,168,83,0)"
      );

      // 2. top-right blue
      drawRadial(
        w * 0.84 + Math.cos(t * 0.8) * w * 0.08,
        h * 0.28 + Math.sin(t * 0.65) * h * 0.07,
        h * 0.56,
        "rgba(123,159,212,0.022)",
        "rgba(123,159,212,0)"
      );

      // 3. bottom amber
      drawRadial(
        w * 0.52 + Math.sin(t * 0.55) * w * 0.12,
        h * 0.92,
        h * 0.48,
        "rgba(200,149,108,0.022)",
        "rgba(200,149,108,0)"
      );

      // 4. sweeping set light
      drawRadial(
        w * 0.5 + Math.sin(t * 0.7) * w * 0.34,
        h * 0.1,
        h * 0.66,
        "rgba(212,168,83,0.020)",
        "rgba(212,168,83,0)"
      );

      // 5. 🔥 NEW: mid-left cool fill
      drawRadial(
        w * 0.12 + Math.sin(t * 0.95) * w * 0.06,
        h * 0.55 + Math.cos(t * 0.85) * h * 0.08,
        h * 0.50,
        "rgba(123,159,212,0.016)",
        "rgba(123,159,212,0)"
      );

      // 6. 🔥 NEW: right-low warm kicker
      drawRadial(
        w * 0.88 + Math.cos(t * 0.75) * w * 0.05,
        h * 0.72 + Math.sin(t * 0.9) * h * 0.05,
        h * 0.42,
        "rgba(212,168,83,0.018)",
        "rgba(212,168,83,0)"
      );
    };

    /* ───────────────────────── Icons ───────────────────────── */

    const stroke = (a: number) => `rgba(212,168,83,${a})`;

    const withIconStyle = (a: number) => {
      ctx.strokeStyle = stroke(a);
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = stroke(a);
      ctx.shadowBlur = 14;
    };

    const drawIcon = (kind: IconKind, size: number) => {
      ctx.beginPath();
      if (kind === "play") {
        const s = size * 0.7;
        ctx.moveTo(-s * 0.25, -s * 0.45);
        ctx.lineTo(s * 0.55, 0);
        ctx.lineTo(-s * 0.25, s * 0.45);
        ctx.closePath();
      } else {
        ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
      }
      ctx.stroke();
    };

    /* ───────────────────────── Particles ───────────────────────── */

    const particles: Particle[] = [];

    const spawnParticle = (t: number): Particle => ({
      x: Math.random(),
      y: Math.random() * 1.15,
      s: rand(12, 30),
      a: rand(0.06, 0.16),
      vx: rand(-0.0006, 0.0006),
      vy: rand(-0.0012, -0.0004),
      r: rand(0, Math.PI * 2),
      vr: rand(-0.012, 0.012),
      tw: rand(0, Math.PI * 2),
      sp: rand(1.4, 2.8),
      kind: pick(kinds),
      bobAmp: rand(14, 34),
      bobSp: rand(1.4, 3.2),
      bobPh: rand(0, Math.PI * 2),
      born: t,
      life: rand(3.2, 5.5),
    });

    for (let i = 0; i < BASE_COUNT; i++) particles.push(spawnParticle(i * 0.02));

    let lastBurst = 0;
    let t = 0;

    const draw = () => {
      if (prefersReducedMotion) return;

      t += 0.01 * TIME_SPEED;
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      drawSpotlights(w, h, t);
      drawProjectorBeam(w, h, t);

      ctx.globalCompositeOperation = "screen";
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const age = t - p.born;

        const fade =
          clamp01(age / 0.25) * clamp01((p.life - age) / 0.4);

        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;

        if (p.y < -0.2 || age > p.life) {
          particles.splice(i, 1);
          continue;
        }

        const bob = Math.sin(t * p.bobSp + p.bobPh) * p.bobAmp;
        const pop = Math.sin(Math.min(1, age / 0.35) * Math.PI) ** 2 * 28;

        ctx.save();
        ctx.translate(p.x * w, p.y * h + bob - pop);
        ctx.rotate(p.r);
        withIconStyle(p.a * fade);
        drawIcon(p.kind, p.s);
        ctx.restore();
      }

      ctx.globalCompositeOperation = "source-over";

      while (particles.length < MIN_COUNT) particles.push(spawnParticle(t));

      if (t - lastBurst > BURST_EVERY) {
        lastBurst = t;
        for (let i = 0; i < BURST_SIZE; i++) particles.push(spawnParticle(t));
      }

      drawVignette(w, h);

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
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
