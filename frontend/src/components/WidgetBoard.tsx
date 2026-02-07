// WidgetBoard.tsx
import React, { useMemo, useRef, useState } from "react";
import { RotateCcw, PanelLeftClose } from "lucide-react";

import type { Equipment, SimulationControls, AlertEvent } from "../types";
import PurchaseEngine from "./PurchaseEngine";
import AlertLog from "./AlertLog";
import ControlPanel from "./ControlPanel";
import EquipmentGraph from "./EquipmentGraph";

type WidgetId = "graph" | "buying" | "alerts" | "whatif";
type Rect = { x: number; y: number; w: number; h: number };

const ALL_WIDGETS: WidgetId[] = ["graph", "buying", "alerts", "whatif"];

const MIN_W = 240;
const MIN_H = 160;

const SHELF_MIN = 260;
const SHELF_MAX = 520;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function defaultRectFor(id: WidgetId): Rect {
  if (id === "graph") return { x: 16, y: 16, w: 980, h: 380 };
  if (id === "whatif") return { x: 16, y: 412, w: 980, h: 280 };
  if (id === "buying") return { x: 1016, y: 16, w: 380, h: 320 };
  return { x: 1016, y: 352, w: 380, h: 340 };
}

function titleFor(id: WidgetId) {
  if (id === "graph") return "Equipment Graph";
  if (id === "buying") return "Buying Decision";
  if (id === "alerts") return "Breaking Alerts";
  return "What-if Scenarios";
}

export default function WidgetBoard({
  selectedEquipment,
  alerts,
  controls,
  applyControls,
}: {
  selectedEquipment: Equipment;
  alerts: AlertEvent[];
  controls: SimulationControls;
  applyControls: (c: SimulationControls) => void;
}) {
  const boardRef = useRef<HTMLDivElement | null>(null);

  // Shelf width adjustable
  const [shelfWidth, setShelfWidth] = useState<number>(340);

  // Start with everything in shelf
  const [shelf, setShelf] = useState<WidgetId[]>(() => [...ALL_WIDGETS]);
  const [placed, setPlaced] = useState<Partial<Record<WidgetId, Rect>>>(() => ({}));

  // ✅ Shelf visibility: user can hide ONLY when shelf is empty.
  const [showShelf, setShowShelf] = useState<boolean>(true);


  const resetLayout = () => {
    setPlaced({});
    setShelf([...ALL_WIDGETS]);
    setShowShelf(true);
  };

  const renderWidget = (id: WidgetId) => {
    if (id === "graph") return <EquipmentGraph equipment={selectedEquipment} />;
    if (id === "buying") return <PurchaseEngine equipment={selectedEquipment} />;
    if (id === "alerts") return <AlertLog alerts={alerts} />;
    return <ControlPanel controls={controls} onChange={applyControls} />;
  };

  const placeFromShelf = (id: WidgetId) => {
    setShelf((prev) => prev.filter((w) => w !== id));
    setPlaced((prev) => {
      if (prev[id]) return prev;
      return { ...prev, [id]: defaultRectFor(id) };
    });
  };

  // ✅ Works reliably even with dragging (no pointer-capture conflicts)
  const sendToShelf = (id: WidgetId) => {
    setPlaced((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setShelf((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const placedEntries = useMemo(() => {
    return Object.entries(placed)
      .filter(([, r]) => !!r)
      .map(([id, r]) => ({ id: id as WidgetId, rect: r as Rect }));
  }, [placed]);

  // Pixel-resize for widgets
  const startResizeWidget = (id: WidgetId, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const boardEl = boardRef.current;
    const r0 = placed[id];
    if (!boardEl || !r0) return;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const boardRect = boardEl.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = r0.w;
    const startH = r0.h;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      const maxW = boardRect.width - r0.x - 8;
      const maxH = boardRect.height - r0.y - 8;

      const nextW = clamp(startW + dx, MIN_W, Math.max(MIN_W, maxW));
      const nextH = clamp(startH + dy, MIN_H, Math.max(MIN_H, maxH));

      setPlaced((prev) => ({ ...prev, [id]: { ...prev[id]!, w: nextW, h: nextH } }));
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Pixel-move for widgets (drag handle only)
  const startMoveWidget = (id: WidgetId, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const boardEl = boardRef.current;
    const r0 = placed[id];
    if (!boardEl || !r0) return;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const boardRect = boardEl.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = r0.x;
    const startTop = r0.y;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      const nextX = clamp(startLeft + dx, 8, boardRect.width - r0.w - 8);
      const nextY = clamp(startTop + dy, 8, boardRect.height - r0.h - 8);

      setPlaced((prev) => ({ ...prev, [id]: { ...prev[id]!, x: nextX, y: nextY } }));
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Shelf resize (drag the vertical handle)
  const startResizeShelf = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startW = shelfWidth;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      setShelfWidth(clamp(startW + dx, SHELF_MIN, SHELF_MAX));
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="text-[12px] opacity-70">Widgets</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShelf((s) => !s)}
            className="cinema-panel rounded-xl px-3 py-2 text-[11px] font-semibold flex items-center gap-2 hover:opacity-90"
            title={showShelf ? "Hide shelf" : "Show shelf"}
          >
            <PanelLeftClose size={14} />
            {showShelf ? "Hide Shelf" : "Open Shelf"}
          </button>

          <button
            onClick={resetLayout}
            className="cinema-panel rounded-xl px-3 py-2 text-[11px] font-semibold flex items-center gap-2 hover:opacity-90"
          >
            <RotateCcw size={14} />
            Reset Layout
          </button>
        </div>
      </div>

      <div className="flex gap-4 min-h-0 flex-1">
        {/* SHELF (resizable, user-toggled) */}
        {showShelf ? (
          <div
            className="cinema-panel rounded-2xl shrink-0 overflow-hidden relative"
            style={{ width: shelfWidth }}
          >
            <div className="px-3 py-2 text-[11px] font-semibold opacity-80 uppercase tracking-wide border-b border-white/10">
              Shelf
            </div>

            <div className="p-3 flex flex-col gap-2">
              {shelf.length === 0 ? (
                <div className="text-[11px] opacity-50">
                  All widgets placed on board.
                </div>
              ) : (
                shelf.map((id) => (
                  <button
                    key={id}
                    onClick={() => placeFromShelf(id)}
                    className="cinema-panel rounded-xl px-3 py-3 text-left hover:opacity-95"
                  >
                    <div className="text-[12px] font-semibold">{titleFor(id)}</div>
                    <div className="text-[10px] opacity-60">Click to place on board</div>
                  </button>
                ))
              )}
            </div>

            {/* Shelf resize handle */}
            <div
              onPointerDown={startResizeShelf}
              className="absolute top-0 right-0 h-full w-[10px] cursor-col-resize"
              title="Drag to resize shelf"
              style={{
                background: "linear-gradient(90deg, rgba(0,0,0,0), rgba(255,255,255,0.06))",
              }}
            />
            <div
              className="absolute top-1/2 right-[2px] -translate-y-1/2 w-[6px] h-10 rounded-full opacity-70"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            />
          </div>
        ) : null}

        {/* BOARD (bigger canvas height) */}
        <div
          ref={boardRef}
          className="cinema-panel rounded-2xl relative overflow-hidden flex-1"
          // ✅ Increased height (more vertical canvas)
          style={{
            height: "calc(100vh - 140px)",
            minHeight: 820,
          }}
        >
          {placedEntries.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-[12px] opacity-50">
              Place widgets from the shelf.
            </div>
          ) : null}

          {placedEntries.map(({ id, rect }) => (
            <div
              key={id}
              style={{
                position: "absolute",
                left: rect.x,
                top: rect.y,
                width: rect.w,
                height: rect.h,
              }}
            >
              {/* Clipped content area */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                {/* widget header */}
                <div
                  className="h-8 px-3 flex items-center justify-between select-none"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    onPointerDown={(e) => startMoveWidget(id, e)}
                    className="flex-1 h-full flex items-center"
                    style={{ cursor: "grab" }}
                    title="Drag to move"
                  >
                    <div className="text-[11px] font-semibold opacity-80 uppercase tracking-wide">
                      {titleFor(id)}
                    </div>
                  </div>

                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      sendToShelf(id);
                    }}
                    className="text-[10px] opacity-70 hover:opacity-100 px-2 py-1 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                    title="Return to shelf"
                  >
                    to shelf
                  </button>
                </div>

                <div className="h-[calc(100%-32px)]">{renderWidget(id)}</div>
              </div>

              {/* Resize grip — child of widget, outside the overflow-hidden clip wrapper */}
              <div
                onPointerDown={(e) => startResizeWidget(id, e)}
                style={{
                  position: "absolute",
                  left: rect.w - 24,
                  top: rect.h - 24,
                  width: 20,
                  height: 20,
                  zIndex: 30,
                  cursor: "nwse-resize",
                  borderRadius: 3,
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.28))",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "0 0 6px rgba(0,0,0,0.5)",
                }}
                title="Drag to resize"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
