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
  radius = 170,
  pullStrength = 1.6,
  springConstant = 0.08,
  damping = 0.88,
  nodeSize = 1.6,
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

      ctx.scale(dpr, dpr);

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

    // Mouse tracking on the parent section/container
    const parent = container.parentElement || container;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.targetX = -9999;
      mouse.targetY = -9999;
      mouse.active = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = container.getBoundingClientRect();
        mouse.targetX = e.touches[0].clientX - rect.left;
        mouse.targetY = e.touches[0].clientY - rect.top;
        mouse.active = true;
      }
    };

    const handleTouchEnd = () => {
      mouse.active = false;
    };

    parent.addEventListener('mousemove', handleMouseMove, { passive: true });
    parent.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    parent.addEventListener('touchmove', handleTouchMove, { passive: true });
    parent.addEventListener('touchend', handleTouchEnd, { passive: true });

    let time = 0;

    const render = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      time += 0.02;

      // Smooth mouse position interpolation
      if (mouse.active) {
        mouse.x += (mouse.targetX - mouse.x) * 0.2;
        mouse.y += (mouse.targetY - mouse.y) * 0.2;
      } else {
        mouse.x = -9999;
        mouse.y = -9999;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Update Physics for each Node
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const node = nodes[r][c];

          // Mouse warp (attraction towards cursor with elastic pull)
          if (mouse.active) {
            const dx = mouse.x - node.x;
            const dy = mouse.y - node.y;
            const dist = Math.hypot(dx, dy);

            if (dist < radius && dist > 1) {
              const force = Math.pow(1 - dist / radius, 1.8) * pullStrength;
              const angle = Math.atan2(dy, dx);
              node.vx += Math.cos(angle) * force * 3.5;
              node.vy += Math.sin(angle) * force * 3.5;
            }
          }

          // Subtle harmonic ambient motion when idle
          const ambientWave = Math.sin(time + node.baseX * 0.008 + node.baseY * 0.008) * 0.4;

          // Hooke's Law Spring Force returning to base position
          const targetX = node.baseX;
          const targetY = node.baseY + ambientWave;
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
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.12)';
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
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.12)';
        ctx.stroke();
      }

      // 4. Draw Intersecting Nodes / Dots with Dynamic Glow
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const node = nodes[r][c];
          const distToMouse = mouse.active ? Math.hypot(mouse.x - node.x, mouse.y - node.y) : 9999;
          const isNearMouse = distToMouse < radius;

          ctx.beginPath();
          if (isNearMouse) {
            // Enhanced glow for nodes near the cursor
            const intensity = Math.max(0, 1 - distToMouse / radius);
            const currentRadius = nodeSize + intensity * 1.6;
            ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(79, 70, 229, ${0.4 + intensity * 0.55})`;
          } else {
            // Standard ambient dot
            ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(99, 102, 241, 0.35)';
          }
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      parent.removeEventListener('mousemove', handleMouseMove);
      parent.removeEventListener('mouseleave', handleMouseLeave);
      parent.removeEventListener('touchmove', handleTouchMove);
      parent.removeEventListener('touchend', handleTouchEnd);
    };
  }, [spacing, radius, pullStrength, springConstant, damping, nodeSize]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-hidden [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_80%)] ${className}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
