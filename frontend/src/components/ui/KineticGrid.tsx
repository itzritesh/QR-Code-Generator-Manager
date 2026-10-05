import React, { useEffect, useRef } from 'react';

interface NodePoint {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface KineticGridProps {
  className?: string;
  spacing?: number;
  radius?: number;
  pullStrength?: number;
  springConstant?: number;
  damping?: number;
  nodeSize?: number;
}

export const KineticGrid: React.FC<KineticGridProps> = ({
  className = '',
  spacing = 34,
  radius = 220,
  pullStrength = 5.5,
  springConstant = 0.06,
  damping = 0.86,
  nodeSize = 2.2,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isVisible = true;
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let nodes: NodePoint[][] = [];

    // Mouse coordinates relative to canvas
    const mouse = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
      active: false,
    };

    const initGrid = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = rect.width;
      height = rect.height;

      if (width === 0 || height === 0) return;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(width / spacing) + 2;
      rows = Math.ceil(height / spacing) + 2;

      const offsetX = (width - (cols - 1) * spacing) / 2;
      const offsetY = (height - (rows - 1) * spacing) / 2;

      nodes = [];
      for (let r = 0; r < rows; r++) {
        const rowNodes: NodePoint[] = [];
        for (let c = 0; c < cols; c++) {
          const x = offsetX + c * spacing;
          const y = offsetY + r * spacing;
          rowNodes.push({
            baseX: x,
            baseY: y,
            x,
            y,
            vx: 0,
            vy: 0,
          });
        }
        nodes.push(rowNodes);
      }
    };

    initGrid();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      initGrid();
    });
    resizeObserver.observe(container);

    // Intersection observer to pause render loop off-screen
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting;
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    // Track mouse movement globally on window so pointer-events-none elements never block cursor
    const handleMouseMove = (e: MouseEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();

      // Active when hovering over or near the container
      if (
        e.clientX >= rect.left - 100 &&
        e.clientX <= rect.right + 100 &&
        e.clientY >= rect.top - 100 &&
        e.clientY <= rect.bottom + 100
      ) {
        mouse.targetX = e.clientX - rect.left;
        mouse.targetY = e.clientY - rect.top;
        mouse.active = true;
      } else {
        mouse.active = false;
      }
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!container || e.touches.length === 0) return;
      const rect = container.getBoundingClientRect();
      const touch = e.touches[0];

      if (
        touch.clientX >= rect.left - 80 &&
        touch.clientX <= rect.right + 80 &&
        touch.clientY >= rect.top - 80 &&
        touch.clientY <= rect.bottom + 80
      ) {
        mouse.targetX = touch.clientX - rect.left;
        mouse.targetY = touch.clientY - rect.top;
        mouse.active = true;
      } else {
        mouse.active = false;
      }
    };

    const handleTouchEnd = () => {
      mouse.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    let time = 0;

    const render = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      time += 0.025;

      // Smooth mouse position interpolation
      if (mouse.active) {
        mouse.x += (mouse.targetX - mouse.x) * 0.25;
        mouse.y += (mouse.targetY - mouse.y) * 0.25;
      } else {
        mouse.x = -9999;
        mouse.y = -9999;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Update Physics for each Node (Dynamic Waves + Interactive Pull)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const node = nodes[r][c];

          // Continuous harmonic wave motion across the mesh
          const waveY = Math.sin(time * 1.8 + node.baseX * 0.015 + node.baseY * 0.015) * 5.5;
          const waveX = Math.cos(time * 1.4 + node.baseX * 0.015 - node.baseY * 0.015) * 4.0;

          // Interactive magnetic cursor pull / gravity warp
          if (mouse.active) {
            const dx = mouse.x - node.x;
            const dy = mouse.y - node.y;
            const dist = Math.hypot(dx, dy);

            if (dist < radius && dist > 1) {
              const force = Math.sin((1 - dist / radius) * (Math.PI / 2)) * pullStrength;
              const angle = Math.atan2(dy, dx);
              node.vx += Math.cos(angle) * force * 1.8;
              node.vy += Math.sin(angle) * force * 1.8;
            }
          }

          // Hooke's Law Spring Force returning to animated wave base position
          const targetX = node.baseX + waveX;
          const targetY = node.baseY + waveY;
          const ax = (targetX - node.x) * springConstant;
          const ay = (targetY - node.y) * springConstant;

          node.vx = (node.vx + ax) * damping;
          node.vy = (node.vy + ay) * damping;

          node.x += node.vx;
          node.y += node.vy;
        }
      }

      // 2. Draw Horizontal Grid Lines
      ctx.lineWidth = 1;
      for (let r = 0; r < rows; r++) {
        ctx.beginPath();
        for (let c = 0; c < cols; c++) {
          const node = nodes[r][c];
          if (c === 0) {
            ctx.moveTo(node.x, node.y);
          } else {
            ctx.lineTo(node.x, node.y);
          }
        }
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.24)';
        ctx.stroke();
      }

      // 3. Draw Vertical Grid Lines
      for (let c = 0; c < cols; c++) {
        ctx.beginPath();
        for (let r = 0; r < rows; r++) {
          const node = nodes[r][c];
          if (r === 0) {
            ctx.moveTo(node.x, node.y);
          } else {
            ctx.lineTo(node.x, node.y);
          }
        }
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.24)';
        ctx.stroke();
      }

      // 4. Draw Intersecting Nodes / Dots with Dynamic Glow
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const node = nodes[r][c];
          const distToMouse = mouse.active ? Math.hypot(mouse.x - node.x, mouse.y - node.y) : 9999;
          const isNearMouse = distToMouse < radius;

          if (isNearMouse) {
            const intensity = Math.max(0, 1 - distToMouse / radius);
            const currentRadius = nodeSize + intensity * 2.5;

            // Outer soft glow halo
            ctx.beginPath();
            ctx.arc(node.x, node.y, currentRadius + 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(99, 102, 241, ${0.18 + intensity * 0.40})`;
            ctx.fill();

            // Core glowing node
            ctx.beginPath();
            ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(67, 56, 202, ${0.80 + intensity * 0.20})`;
            ctx.fill();
          } else {
            // Standard ambient node
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(99, 102, 241, 0.55)';
            ctx.fill();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [spacing, radius, pullStrength, springConstant, damping, nodeSize]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 88%)',
        maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 88%)',
      }}
      className={`pointer-events-none select-none overflow-hidden ${className}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
