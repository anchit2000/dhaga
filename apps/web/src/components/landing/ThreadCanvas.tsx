"use client";

import { useEffect, useRef } from "react";

interface Thread {
  yBase: number;
  amp: number;
  wavelength: number;
  phase: number;
  speed: number;
  width: number;
  grad: CanvasGradient;
}

export function ThreadCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    let threads: Thread[] = [];
    let raf = 0;
    let t = 0;

    function resize() {
      if (!canvas || !ctx) return;
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      threads = Array.from({ length: 7 }, (_, i) => {
        const hue = 32 + Math.random() * 12;
        const alpha = 0.25 + Math.random() * 0.4;
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, "hsla(" + hue + ", 70%, 60%, 0)");
        grad.addColorStop(0.5, "hsla(" + hue + ", 78%, 62%, " + alpha + ")");
        grad.addColorStop(1, "hsla(" + hue + ", 70%, 60%, 0)");
        return {
          yBase: H * (0.25 + (i / 7) * 0.65),
          amp: 30 + Math.random() * 80,
          wavelength: 500 + Math.random() * 500,
          phase: Math.random() * Math.PI * 2,
          speed: 0.0018 + Math.random() * 0.002,
          width: 0.7 + Math.random() * 1.4,
          grad,
        };
      });
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (const th of threads) {
        ctx.strokeStyle = th.grad;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 8) {
          const y =
            th.yBase +
            Math.sin(x / th.wavelength + th.phase + t * th.speed * 1000) * th.amp +
            Math.sin(x / (th.wavelength * 0.37) + th.phase * 2) * (th.amp * 0.25);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        // Canvas shadowBlur re-rasterizes a blur around every stroke on every
        // frame — by far the most expensive operation in this loop; a wide
        // translucent under-stroke of the same gradient reads as the same glow.
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = th.width * 4;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = th.width;
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function loop() {
      t += 0.016;
      draw();
      raf = requestAnimationFrame(loop);
    }

    resize();
    if (reduced) {
      draw();
    } else {
      loop();
    }

    const onResize = () => {
      resize();
      if (reduced) draw();
    };
    addEventListener("resize", onResize);

    const observer = new IntersectionObserver(([entry]) => {
      if (reduced) return;
      if (entry.isIntersecting) {
        if (!raf) loop();
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full opacity-70"
    />
  );
}
