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
  pushStrength?: number;
  springConstant?: number;
  damping?: number;
  nodeSize?: number;
}

export const KineticGrid: React.FC<KineticGridProps> = ({
  className = '',
  spacing = 38,
  radius = 150,
  pushStrength = 1.2,
  springConstant = 0.05,
  damping = 0.88,
  nodeSize = 1.3,
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
        e.clientX >= rect.left - 60 &&
        e.clientX <= rect.right + 60 &&
        e.clientY >= rect.top - 60 &&
        e.clientY <= rect.bottom + 60
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
        touch.clientX >= rect.left - 60 &&
        touch.clientX <= rect.right + 60 &&
        touch.clientY >= rect.top - 60 &&
        touch.clientY <= rect.bottom + 60
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

      time += 0.016;

      // Smooth mouse position interpolation
      if (mouse.active) {
        mouse.x += (mouse.targetX - mouse.x) * 0.2;
        mouse.y += (mouse.targetY - mouse.y) * 0.2;
      } else {
        mouse.x = -9999;
        mouse.y = -9999;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Update Physics for each Node (Harmonic Waves + Soft Deflection)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const node = nodes[r][c];

          // Gentle ambient wave motion across the mesh
          const waveY = Math.sin(time + node.baseX * 0.009 + node.baseY * 0.009) * 2.8;
          const waveX = Math.cos(time * 0.8 + node.baseX * 0.009 - node.baseY * 0.009) * 1.8;

          // Interactive soft repulsive deflection (curves mesh smoothly without bunching dots)
          if (mouse.active) {
            const dx = node.x - mouse.x;
            const dy = node.y - mouse.y;
            const dist = Math.hypot(dx, dy);

            if (dist < radius && dist > 0.5) {
              const norm = dist / radius; // 0 to 1
              // Smooth cosine falloff: strongest right at cursor, smoothly 0 at boundary
              const factor = Math.cos(norm * Math.PI * 0.5);
              const force = factor * pushStrength;
              const angle = Math.atan2(dy, dx);

              node.vx += Math.cos(angle) * force;
              node.vy += Math.sin(angle) * force;
            }
          }

          // Hooke's Law Spring Force returning to wave base position
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
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.16)';
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
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.16)';
        ctx.stroke();
      }

      // 4. Draw Intersecting Nodes / Dots (Subtle, refined, non-clustering)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const node = nodes[r][c];
          const distToMouse = mouse.active ? Math.hypot(mouse.x - node.x, mouse.y - node.y) : 9999;
          const isNearMouse = distToMouse < radius;

          if (isNearMouse) {
            const intensity = Math.max(0, 1 - distToMouse / radius);
            // Gentle subtle radius increase (at most +0.4px so dots never become huge)
            const currentRadius = nodeSize + intensity * 0.4;

            // Optional delicate micro-glow
            if (intensity > 0.35) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, currentRadius + 1.2, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(99, 102, 241, ${intensity * 0.12})`;
              ctx.fill();
            }

            // Crisp node dot
            ctx.beginPath();
            ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(79, 70, 229, ${0.45 + intensity * 0.4})`;
            ctx.fill();
          } else {
            // Standard ambient dot
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(99, 102, 241, 0.38)';
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
  }, [spacing, radius, pushStrength, springConstant, damping, nodeSize]);

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
