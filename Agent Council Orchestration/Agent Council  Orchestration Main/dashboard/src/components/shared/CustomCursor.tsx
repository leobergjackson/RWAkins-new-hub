import { useEffect, useRef, useState, useCallback } from "react";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [visible, setVisible] = useState(false);
  const pos = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });
  const raf = useRef<number>(0);

  const isPointerDevice = typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

  const animate = useCallback(() => {
    ringPos.current.x += (pos.current.x - ringPos.current.x) * 0.15;
    ringPos.current.y += (pos.current.y - ringPos.current.y) * 0.15;

    if (dotRef.current) {
      dotRef.current.style.transform = `translate(${pos.current.x - 3}px, ${pos.current.y - 3}px)`;
    }
    if (ringRef.current) {
      const size = hovering ? 50 : 30;
      const offset = size / 2;
      ringRef.current.style.transform = `translate(${ringPos.current.x - offset}px, ${ringPos.current.y - offset}px) scale(${clicking ? 0.8 : 1})`;
      ringRef.current.style.width = `${size}px`;
      ringRef.current.style.height = `${size}px`;
      ringRef.current.style.background = hovering ? "rgba(255,78,0,0.1)" : "transparent";
    }
    raf.current = requestAnimationFrame(animate);
  }, [hovering, clicking]);

  useEffect(() => {
    if (!isPointerDevice) return;

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);
    };

    const onDown = () => setClicking(true);
    const onUp = () => setClicking(false);

    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("button, a, [role='button'], input, textarea, select, label, [data-cursor-hover]")) {
        setHovering(true);
      }
    };
    const onOut = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("button, a, [role='button'], input, textarea, select, label, [data-cursor-hover]")) {
        setHovering(false);
      }
    };

    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);

    raf.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
      cancelAnimationFrame(raf.current);
    };
  }, [isPointerDevice, animate, visible]);

  if (!isPointerDevice) return null;

  return (
    <>
      <div
        ref={dotRef}
        className="fixed top-0 left-0 z-[9999] pointer-events-none rounded-full"
        style={{
          width: 6,
          height: 6,
          background: "#FF4E00",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.2s",
        }}
      />
      <div
        ref={ringRef}
        className="fixed top-0 left-0 z-[9998] pointer-events-none rounded-full"
        style={{
          width: 30,
          height: 30,
          border: "1px solid #FF4E00",
          opacity: visible ? 0.7 : 0,
          transition: "width 0.2s, height 0.2s, background 0.2s, opacity 0.2s",
        }}
      />
    </>
  );
}
