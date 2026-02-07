// src/components/LandingPage.tsx
import { motion } from "framer-motion";
import { ArrowRight, Play, Radar, Activity, ShieldAlert, PackageSearch, Timer } from "lucide-react";
import AnimatedBackground from "./AnimatedBackground";

interface Props {
  onEnter: () => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (d: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: d, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function LandingPage({ onEnter }: Props) {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-bg-primary">
      <AnimatedBackground />

      <div className="absolute inset-0 film-grain pointer-events-none" style={{ zIndex: 1 }} />
      <div className="absolute inset-0 scanlines pointer-events-none" style={{ zIndex: 2 }} />
      <div className="absolute inset-0 cinematic-vignette pointer-events-none" style={{ zIndex: 3 }} />

      <div className="absolute inset-y-0 left-0 w-28 curtain-left pointer-events-none" style={{ zIndex: 4 }} />
      <div className="absolute inset-y-0 right-0 w-28 curtain-right pointer-events-none" style={{ zIndex: 4 }} />

      <div className="relative z-10 h-full w-full">
        <div className="mx-auto h-full max-w-9xl px-6 lg:px-10">
          {/* top brand */}
          <div className="pt-8">
            <div className="flex items-center justify-between">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-3"
              >
                <div className="cinema-badge">
                  <Radar size={18} className="text-accent-gold" />
                </div>
                <div className="leading-tight">
                  <div className="text-[36px] font-bold tracking-[0.26em] uppercase">
                    <span className="text-accent-gold">Xopy</span>
                    <span className="text-text-primary ml-2">Ops</span>
                  </div>
                  <div className="text-[10px] text-text-muted uppercase tracking-[0.22em] mt-1">
                    Lights • Camera • Action
                  </div>
                </div>
              </motion.div>

              {/* <div className="hidden sm:block text-[10px] text-text-muted uppercase tracking-[0.22em]">
                Predictive Maintenance for Grainger
              </div> */}
            </div>
          </div>

          {/* main grid */}
          <div className="grid h-[calc(100%-120px)] items-center gap-12 lg:gap-16 lg:grid-cols-[1.15fr_0.85fr]">
            {/* LEFT */}
            <div className="max-w-2xl lg:justify-self-center lg:pr-6">
              <motion.h1
                variants={fadeUp}
                initial="hidden"
                animate="show"
                custom={0.10}
                className="hero-title text-left"
              >
                Mission Control <span className="hero-title-accent">for</span>
                <br />
                <span className="hero-title-accent">machine health</span>.
              </motion.h1>

              <motion.p
                variants={fadeUp}
                initial="hidden"
                animate="show"
                custom={0.22}
                className="mt-5 max-w-xl text-[15px] sm:text-[17px] leading-relaxed text-text-secondary"
              >
                Real-time predictive maintenance that explains risk in plain language.
                See what could fail, why it matters, and when to act.
              </motion.p>

              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                custom={0.34}
                className="mt-8 text-[12px] text-text-muted leading-relaxed max-w-xl"
              >
                Maintenance teams don’t browse parts. They act to prevent downtime. Xopy helps teams buy
                the right part before equipment fails.
              </motion.div>
            </div>

            {/* RIGHT */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0.18}
              className="w-full lg:justify-self-end"
            >
              <div className="ops-panel max-w-[560px] ml-auto">
                <div className="ops-panel-header">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-text-muted">
                      Operations Console
                    </div>
                    <div className="mt-1 text-[18px] font-semibold text-text-primary">
                      Choose your mode
                    </div>
                  </div>
                </div>

                <div className="ops-panel-body">
                  {/* Primary CTAs */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="tooltip-wrap">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onEnter}
                        className="cta-primary w-full"
                      >
                        <ArrowRight size={18} />
                        Enter
                      </motion.button>
                      <div
                        className="tooltip-cinema tooltip-box"
                        data-tip="Enter Mission Control. Live equipment list, risk scores, and alerts update in real time."
                      />
                    </div>

                    <div className="tooltip-wrap">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onEnter}
                        className="cta-secondary w-full"
                      >
                        <Play size={16} />
                        Start Sim
                      </motion.button>
                      <div
                        className="tooltip-cinema tooltip-box"
                        data-tip="Start a guided demo with simulated sensor streams, failure spikes, and buy-now decisions."
                      />
                    </div>
                  </div>

                  {/* Tiles */}
                  <div className="mt-6 grid gap-3">
                    <div className="tooltip-wrap">
                      <button className="ops-tile">
                        <Activity size={18} className="text-accent-gold" />
                        <div>
                          <div className="ops-tile-title">Real-time predictions</div>
                          <div className="ops-tile-sub">Failure probability next 24–72 hrs</div>
                        </div>
                      </button>
                      <div
                        className="tooltip-cinema tooltip-box"
                        data-tip="Risk score updates continuously from the sensor stream. Green, Yellow, Red changes mid-demo."
                      />
                    </div>

                    <div className="tooltip-wrap">
                      <button className="ops-tile">
                        <Timer size={18} className="text-accent-gold" />
                        <div>
                          <div className="ops-tile-title">Live monitoring</div>
                          <div className="ops-tile-sub">Streams + status indicators</div>
                        </div>
                      </button>
                      <div
                        className="tooltip-cinema tooltip-box"
                        data-tip="Live monitoring view per asset. Runtime hours, environment, and recent anomalies in one place."
                      />
                    </div>

                    <div className="tooltip-wrap">
                      <button className="ops-tile">
                        <ShieldAlert size={18} className="text-accent-gold" />
                        <div>
                          <div className="ops-tile-title">Guided decisions</div>
                          <div className="ops-tile-sub">Now vs wait marker</div>
                        </div>
                      </button>
                      <div
                        className="tooltip-cinema tooltip-box"
                        data-tip="Turns risk into action. Buy now, buy substitute, or monitor only with clear reasoning."
                      />
                    </div>

                    <div className="tooltip-wrap">
                      <button className="ops-tile">
                        <PackageSearch size={18} className="text-accent-gold" />
                        <div>
                          <div className="ops-tile-title">Grainger-ready output</div>
                          <div className="ops-tile-sub">Right part, right time</div>
                        </div>
                      </button>
                      <div
                        className="tooltip-cinema tooltip-box"
                        data-tip="Maps predicted failures to Grainger-style part categories and suggests substitutes by lead time."
                      />
                    </div>
                  </div>
                </div>

                <div className="ops-panel-footer">
                  <div className="theater-divider" />
                  <div className="pt-3 text-center text-[9px] text-text-muted uppercase tracking-[0.26em]">
                    SparkHacks 2026 — Downtime prevention intelligence
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
