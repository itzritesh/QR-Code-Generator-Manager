import React, { useEffect, useRef } from 'react';
import { renderQrToCanvas } from '../../utils/qrRenderer';
import { DEFAULT_DESIGN, QrCustomDesign } from '../../utils/qrTemplates';

interface QrThumbnailProps {
  content: string;
  design?: any;
  size?: number;
  className?: string;
}

export const QrThumbnail: React.FC<QrThumbnailProps> = ({
  content,
  design,
  size = 48,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isMounted = true;
    if (canvasRef.current && content) {
      const activeDesign: QrCustomDesign = {
        ...DEFAULT_DESIGN,
        ...(design || {}),
      };

      renderQrToCanvas(content, activeDesign, canvasRef.current, size)
        .catch((err) => {
          if (isMounted) console.error('Failed to render QR thumbnail:', err);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [content, design, size]);

  return (
    <div
      className={`rounded-lg overflow-hidden border border-slate-200/80 bg-white flex items-center justify-center shrink-0 shadow-2xs ${className}`}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
};
