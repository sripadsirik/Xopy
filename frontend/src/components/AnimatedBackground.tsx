// src/components/AnimatedBackground.tsx
import { useEffect, useMemo, useRef } from "react";

type IconKind = "camera" | "clapper" | "reel" | "tape" | "play";

type Particle = {
  x: number; // 0..1
  y: number; // 0..1
  s: number;
  a: number;
  vx: number;
  vy: number;
  r: number;
  vr: number;
  tw: number;
  sp: number;
  kind: IconKind;
  born: number;
  life: number;
  bobAmp: number;
  bobSp: number;
  bobPh: number;
};

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // offscreen prerendered icon sprites
  const spriteRef = useRef<Record<IconKind, HTMLCanvasElement | null>>({
    camera: null,
    clapper: null,
    reel: null,
    tape: null,
    play: null,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    /* ✅ PERF KNOBS */
    const TARGET_FPS = 45;
    const FRAME_MS = 1000 / TARGET_FPS;

    const DPR_CAP = 1.5; // huge perf win on retina
    const TIME_SPEED = 1.7; // keep motion fast but not insane

    const BASE_COUNT = 90;
    const MIN_COUNT = 90;

    const BURST_EVERY = 0.8; // less frequent
    const BURST_SIZE = 6;

    // spotlights count/strength trimmed
    const ENABLE_SHADOWS = false; // turn on only if you really want glow

    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

    const kinds: IconKind[] = ["camera", "clapper", "reel", "tape", "play"];

    const resize = () => {
      const dpr = Math.max(1, Math.min(DPR_CAP, window.devicePixelRatio || 1));
      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    /* ───────────────────────── Spotlights ───────────────────────── */

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
      g.addColorStop(0.65, "rgba(0,0,0,0.22)");
      g.addColorStop(1, "rgba(0,0,0,0.62)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    };

    // 4 spotlights only (still looks good)
    const drawSpotlights = (w: number, h: number, t: number) => {
      drawRadial(
        w * 0.18 + Math.sin(t * 0.8) * w * 0.08,
        h * 0.18 + Math.cos(t * 0.6) * h * 0.05,
        h * 0.58,
        "rgba(212,168,83,0.020)",
        "rgba(212,168,83,0)"
      );

      drawRadial(
        w * 0.84 + Math.cos(t * 0.7) * w * 0.07,
        h * 0.30 + Math.sin(t * 0.55) * h * 0.06,
        h * 0.54,
        "rgba(123,159,212,0.014)",
        "rgba(123,159,212,0)"
      );

      drawRadial(
        w * 0.52 + Math.sin(t * 0.45) * w * 0.10,
        h * 0.92,
        h * 0.44,
        "rgba(200,149,108,0.012)",
        "rgba(200,149,108,0)"
      );

      const sweepX = w * 0.5 + Math.sin(t * 0.55) * w * 0.28;
      drawRadial(
        sweepX,
        h * 0.10,
        h * 0.62,
        "rgba(212,168,83,0.012)",
        "rgba(212,168,83,0)"
      );
    };

    const drawProjectorBeam = (w: number, h: number, t: number) => {
      const beamX = w * 0.5 + Math.sin(t * 0.55) * w * 0.12;
      const grad = ctx.createLinearGradient(beamX, 0, beamX, h * 0.8);

      grad.addColorStop(0, "rgba(212,168,83,0.030)");
      grad.addColorStop(0.35, "rgba(212,168,83,0.012)");
      grad.addColorStop(1, "rgba(212,168,83,0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(beamX - w * 0.018, 0);
      ctx.lineTo(beamX - w * 0.22, h * 0.8);
      ctx.lineTo(beamX + w * 0.22, h * 0.8);
      ctx.lineTo(beamX + w * 0.018, 0);
      ctx.closePath();
      ctx.fill();
    };

    /* ───────────────────────── Icon Sprites ───────────────────────── */

    const makeSprite = (kind: IconKind) => {
      const s = 80; // sprite resolution
      const c = document.createElement("canvas");
      c.width = s;
      c.height = s;
      const g = c.getContext("2d");
      if (!g) return null;

      g.translate(s / 2, s / 2);
      g.strokeStyle = "rgba(212,168,83,0.95)";
      g.lineWidth = 2;
      g.lineCap = "round";
      g.lineJoin = "round";

      const size = 26;

      const rr = (x: number, y: number, w: number, h: number, r: number) => {
        g.beginPath();
        // @ts-ignore
        g.roundRect(x, y, w, h, r);
        g.stroke();
      };

      if (kind === "camera") {
        rr(-size * 0.9, -size * 0.45, size * 1.8, size * 0.9, 8);
        rr(-size * 0.55, -size * 0.75, size * 0.6, size * 0.3, 6);
        g.beginPath();
        g.arc(0, 0, size * 0.24, 0, Math.PI * 2);
        g.stroke();
      } else if (kind === "clapper") {
        rr(-size * 0.9, -size * 0.25, size * 1.8, size * 0.9, 8);
        rr(-size * 0.9, -size * 0.75, size * 1.8, size * 0.45, 8);
      } else if (kind === "reel") {
        g.beginPath();
        g.arc(0, 0, size * 0.55, 0, Math.PI * 2);
        g.stroke();
        g.beginPath();
        g.arc(0, 0, size * 0.2, 0, Math.PI * 2);
        g.stroke();
      } else if (kind === "tape") {
        rr(-size, -size * 0.35, size * 2, size * 0.7, 10);
        for (let i = 0; i < 5; i++) {
          const hx = -size * 0.65 + (i / 4) * (size * 1.3);
          g.beginPath();
          g.arc(hx, 0, 2.6, 0, Math.PI * 2);
          g.stroke();
        }
      } else {
        g.beginPath();
        g.moveTo(-size * 0.2, -size * 0.35);
        g.lineTo(size * 0.5, 0);
        g.lineTo(-size * 0.2, size * 0.35);
        g.closePath();
        g.stroke();
      }

      return c;
    };

    // build sprites once
    spriteRef.current.camera = makeSprite("camera");
    spriteRef.current.clapper = makeSprite("clapper");
    spriteRef.current.reel = makeSprite("reel");
    spriteRef.current.tape = makeSprite("tape");
    spriteRef.current.play = makeSprite("play");

    /* ───────────────────────── Particles ───────────────────────── */

    const particles: Particle[] = [];

    const spawnParticle = (t: number): Particle => ({
      x: Math.random(),
      y: Math.random() * 1.15,
      s: rand(12, 26),
      a: rand(0.05, 0.12),

      // slower than your laggy version
      vx: rand(-0.00045, 0.00045),
      vy: rand(-0.00095, -0.00035),

      r: rand(0, Math.PI * 2),
      vr: rand(-0.010, 0.010),
      tw: rand(0, Math.PI * 2),
      sp: rand(1.1, 2.0),
      kind: pick(kinds),

      bobAmp: rand(10, 22),
      bobSp: rand(1.1, 2.2),
      bobPh: rand(0, Math.PI * 2),

      born: t,
      life: rand(3.0, 5.2),
    });

    for (let i = 0; i < BASE_COUNT; i++) particles.push(spawnParticle(i * 0.03));

    let lastBurst = 0;
    let t = 0;

    /* ───────────────────────── FPS Throttle ───────────────────────── */
    let lastFrameTime = 0;

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);

      if (prefersReducedMotion) return;

      if (now - lastFrameTime < FRAME_MS) return;
      lastFrameTime = now;

      t += 0.010 * TIME_SPEED;

      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      // backlights
      drawSpotlights(w, h, t);
      drawProjectorBeam(w, h, t);

      // particles
      ctx.globalCompositeOperation = "screen";

      // (optional glow, expensive)
      if (ENABLE_SHADOWS) {
        ctx.shadowColor = "rgba(212,168,83,0.55)";
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowBlur = 0;
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const age = t - p.born;

        const fade = clamp01(age / 0.22) * clamp01((p.life - age) / 0.38);

        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;

        // recycle
        if (age > p.life || p.y < -0.2) {
          particles.splice(i, 1);
          continue;
        }

        const bob = Math.sin(t * p.bobSp + p.bobPh) * p.bobAmp;
        const pop = Math.sin(Math.min(1, age / 0.30) * Math.PI) ** 2 * 18;

        const px = p.x * w;
        const py = p.y * h + bob - pop;

        const tw = 0.55 + 0.45 * Math.sin(p.tw + t * (1.4 + p.sp));
        const alpha = p.a * fade * tw;

        const sprite = spriteRef.current[p.kind];
        if (!sprite) continue;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.r);

        // no path drawing; just blit sprite
        ctx.globalAlpha = alpha;

        const scale = (p.s / 22) * (0.92 + 0.10 * Math.sin(t * 1.2 + p.tw));
        ctx.scale(scale, scale);

        ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);

        ctx.restore();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      while (particles.length < MIN_COUNT) particles.push(spawnParticle(t));

      if (t - lastBurst > BURST_EVERY) {
        lastBurst = t;
        for (let i = 0; i < BURST_SIZE; i++) particles.push(spawnParticle(t));
      }

      drawVignette(w, h);
    };

    rafRef.current = requestAnimationFrame(draw);

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
