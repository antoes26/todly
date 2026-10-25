"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Smartphone only: open the side menu by sliding a finger from left to right,
 * and close it by sliding right to left. The menu follows the finger while dragging.
 * Desktop and tablets wider than 760px are not affected.
 */
export function useSwipeMenu(menu: RefObject<HTMLElement | null>, isOpen: boolean, setOpen: (open: boolean) => void, disabled: boolean) {
  const state = useRef({ isOpen, disabled, setOpen });
  state.current = { isOpen, disabled, setOpen };

  useEffect(() => {
    const phone = window.matchMedia("(max-width: 760px)");
    let gesture: { x: number; y: number; t: number; opening: boolean; dragging: boolean; width: number; dx: number } | null = null;

    // Leave alone gestures that belong to something else: text fields, sliders, and rows that scroll sideways.
    const ownsHorizontalGesture = (target: EventTarget | null) => {
      for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
        if (el.matches("input, textarea, select, [contenteditable='true'], [role='slider'], [data-no-swipe]")) return true;
        const overflow = getComputedStyle(el).overflowX;
        if ((overflow === "auto" || overflow === "scroll") && el.scrollWidth > el.clientWidth + 1 && el !== menu.current) return true;
      }
      return false;
    };
    const place = (offset: number | null) => {
      const el = menu.current;
      if (!el) return;
      if (offset === null) { el.style.transition = ""; el.style.transform = ""; return; }
      el.style.transition = "none";
      el.style.transform = `translateX(${offset}px)`;
    };

    const onStart = (event: TouchEvent) => {
      gesture = null;
      const { isOpen, disabled } = state.current;
      if (!phone.matches || disabled || event.touches.length !== 1 || !menu.current) return;
      if (!isOpen && ownsHorizontalGesture(event.target)) return;
      const touch = event.touches[0];
      gesture = { x: touch.clientX, y: touch.clientY, t: event.timeStamp, opening: !isOpen, dragging: false, width: menu.current.offsetWidth || 275, dx: 0 };
    };
    const onMove = (event: TouchEvent) => {
      if (!gesture) return;
      const touch = event.touches[0];
      const dx = touch.clientX - gesture.x, dy = touch.clientY - gesture.y;
      if (!gesture.dragging) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        const horizontal = Math.abs(dx) > Math.abs(dy) * 1.3;
        const rightWay = gesture.opening ? dx > 0 : dx < 0;
        if (!horizontal || !rightWay) { gesture = null; return; }
        gesture.dragging = true;
      }
      event.preventDefault();
      gesture.dx = dx;
      const w = gesture.width;
      place(gesture.opening ? Math.min(0, -w + Math.max(0, dx)) : Math.max(-w, Math.min(0, dx)));
    };
    const onEnd = (event: TouchEvent) => {
      const g = gesture;
      gesture = null;
      if (!g?.dragging) return;
      const speed = g.dx / Math.max(1, event.timeStamp - g.t); // px per ms
      const decide = g.opening ? g.dx > g.width * 0.3 || speed > 0.45 : -g.dx > g.width * 0.3 || speed < -0.45;
      place(null); // hand back to the stylesheet, which animates from where the finger left it
      state.current.setOpen(g.opening ? decide : !decide);
    };
    const onCancel = () => { if (gesture?.dragging) place(null); gesture = null; };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
      place(null);
    };
  }, [menu]);
}
