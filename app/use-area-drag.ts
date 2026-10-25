import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/** Where a dragged work area can be dropped. */
export type AreaDropTarget =
  | { kind: "area"; name: string; pos: "before" | "after" }
  | { kind: "project"; id: string }
  | { kind: "child"; id: string; name: string; pos: "before" | "after" }
  | { kind: "list" };
export type AreaDragSource = { area: string };

/**
 * Click-and-drag for work areas in the sidebar (desktop, mouse only).
 * Drop zones are marked in the markup with data-drop="area|project|child|list" plus data-name / data-id;
 * elements with data-no-drag (the small action buttons) never start a drag.
 */
export function useAreaDrag(onDrop: (source: AreaDragSource, target: AreaDropTarget) => void) {
  const [drag, setDrag] = useState<{ source: AreaDragSource; x: number; y: number } | null>(null);
  const [target, setTarget] = useState<AreaDropTarget | null>(null);
  const pending = useRef<{ source: AreaDragSource; x: number; y: number; active: boolean } | null>(null);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;

  useEffect(() => {
    const find = (x: number, y: number, source: AreaDragSource): AreaDropTarget | null => {
      const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop]");
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const pos = y < rect.top + rect.height / 2 ? "before" : "after";
      const { drop, name = "", id = "" } = el.dataset;
      if (drop === "area") return name === source.area ? null : { kind: "area", name, pos };
      if (drop === "child") return name === source.area ? null : { kind: "child", id, name, pos };
      if (drop === "project") return { kind: "project", id };
      if (drop === "list") return { kind: "list" };
      return null;
    };
    const stop = () => {
      pending.current = null;
      document.body.classList.remove("area-dragging");
      setDrag(null);
      setTarget(null);
    };
    const move = (e: PointerEvent) => {
      const p = pending.current;
      if (!p) return;
      if (!p.active) {
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
        p.active = true;
        document.body.classList.add("area-dragging");
        window.getSelection()?.removeAllRanges();
      }
      setDrag({ source: p.source, x: e.clientX, y: e.clientY });
      setTarget(find(e.clientX, e.clientY, p.source));
    };
    const up = (e: PointerEvent) => {
      const p = pending.current;
      if (!p) return;
      if (p.active) {
        const t = find(e.clientX, e.clientY, p.source);
        // The release must not also count as a click on the row underneath.
        const swallow = (ev: MouseEvent) => { ev.preventDefault(); ev.stopPropagation(); };
        window.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
        if (t) dropRef.current(p.source, t);
      }
      stop();
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && pending.current?.active) stop(); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("keydown", key);
    };
  }, []);

  const start = (source: AreaDragSource) => (e: ReactPointerEvent) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if ((e.target as Element).closest("[data-no-drag]")) return;
    pending.current = { source, x: e.clientX, y: e.clientY, active: false };
  };
  return { drag, target, start };
}
