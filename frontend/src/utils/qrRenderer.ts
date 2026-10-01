import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { QrCustomDesign } from './qrTemplates';

export interface RenderQrOptions {
  width?: number;
  height?: number;
  canvas?: HTMLCanvasElement;
}

/**
 * Helper to draw a rounded rectangle on a CanvasRenderingContext2D
 */
const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

/**
 * Helper to draw a leaf shape (top-left & bottom-right rounded, others sharp)
 */
const drawLeafRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

/**
 * Helper to draw a diamond
 */
const drawDiamond = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  const mx = x + w / 2;
  const my = y + h / 2;
  ctx.beginPath();
  ctx.moveTo(mx, y);
  ctx.lineTo(x + w, my);
  ctx.lineTo(mx, y + h);
  ctx.lineTo(x, my);
  ctx.closePath();
};

/**
 * Checks if a coordinate falls inside any of the 3 7x7 corner finder patterns
 */
const isFinderPattern = (row: number, col: number, count: number): boolean => {
  // Top-Left
  if (row < 7 && col < 7) return true;
  // Top-Right
  if (row < 7 && col >= count - 7) return true;
  // Bottom-Left
  if (row >= count - 7 && col < 7) return true;
  return false;
};

/**
 * Main Render Engine: Renders an advanced customized QR Code onto a Canvas
 */
export const renderQrToCanvas = async (
  payload: string,
  design: QrCustomDesign,
  canvas: HTMLCanvasElement,
  targetSize = 512
): Promise<void> => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const ecc = design.logo?.dataUrl ? 'H' : (design.errorCorrection || 'M');
  const qr = QRCode.create(payload || 'https://qrmanager.pro', {
    errorCorrectionLevel: ecc,
  });

  const moduleCount = qr.modules.size;
  const marginModules = design.margin !== undefined ? design.margin : 2;
  const totalGrid = moduleCount + marginModules * 2;

  // Frame banner height calculation
  const hasFrame = Boolean(design.frame?.enabled && design.frame.text);
  const frameHeight = hasFrame ? Math.round(targetSize * 0.16) : 0;
  const totalWidth = targetSize;
  const totalHeight = targetSize + frameHeight;

  canvas.width = totalWidth;
  canvas.height = totalHeight;

  // 1. Draw Canvas Background
  ctx.fillStyle = design.bgColor || '#ffffff';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // Position QR Code
  const qrYOffset = hasFrame && design.frame?.position === 'top' ? frameHeight : 0;
  const cellSize = targetSize / totalGrid;
  const startX = marginModules * cellSize;
  const startY = qrYOffset + marginModules * cellSize;

  // 2. Prepare Foreground Fill (Solid or Gradient)
  let fgFill: string | CanvasGradient = design.fgColor || '#000000';
  if (design.gradient?.enabled) {
    if (design.gradient.type === 'diagonal') {
      const grad = ctx.createLinearGradient(0, qrYOffset, targetSize, qrYOffset + targetSize);
      grad.addColorStop(0, design.gradient.startColor);
      grad.addColorStop(1, design.gradient.endColor);
      fgFill = grad;
    } else if (design.gradient.type === 'radial') {
      const cx = targetSize / 2;
      const cy = qrYOffset + targetSize / 2;
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, targetSize / 1.5);
      grad.addColorStop(0, design.gradient.startColor);
      grad.addColorStop(1, design.gradient.endColor);
      fgFill = grad;
    } else {
      // Linear horizontal
      const grad = ctx.createLinearGradient(0, qrYOffset, targetSize, qrYOffset);
      grad.addColorStop(0, design.gradient.startColor);
      grad.addColorStop(1, design.gradient.endColor);
      fgFill = grad;
    }
  }

  // 3. Draw Normal Data Modules
  ctx.fillStyle = fgFill;
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (isFinderPattern(r, c, moduleCount)) continue;

      if (qr.modules.get(r, c)) {
        const x = startX + c * cellSize;
        const y = startY + r * cellSize;
        const pad = cellSize * 0.04;
        const s = cellSize - pad * 2;

        switch (design.dotStyle) {
          case 'dots':
            ctx.beginPath();
            ctx.arc(x + cellSize / 2, y + cellSize / 2, (cellSize / 2) * 0.9, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'rounded':
            drawRoundedRect(ctx, x + pad, y + pad, s, s, cellSize * 0.35);
            ctx.fill();
            break;
          case 'extra-rounded':
            drawRoundedRect(ctx, x + pad, y + pad, s, s, cellSize * 0.5);
            ctx.fill();
            break;
          case 'classy':
            drawDiamond(ctx, x + pad, y + pad, s, s);
            ctx.fill();
            break;
          case 'square':
          default:
            ctx.fillRect(x, y, cellSize, cellSize);
            break;
        }
      }
    }
  }

  // 4. Draw the 3 Corner Eyes (Finder Patterns)
  const eyeCoords = [
    { r: 0, c: 0 },
    { r: 0, c: moduleCount - 7 },
    { r: moduleCount - 7, c: 0 },
  ];

  const eyeFrameColor = design.eyeFrameColor || fgFill;
  const eyeBallColor = design.eyeBallColor || fgFill;

  eyeCoords.forEach(({ r, c }) => {
    const eyeX = startX + c * cellSize;
    const eyeY = startY + r * cellSize;
    const eyeOuterSize = 7 * cellSize;

    // Clear eye area with background color
    ctx.fillStyle = design.bgColor || '#ffffff';
    ctx.fillRect(eyeX, eyeY, eyeOuterSize, eyeOuterSize);

    // A. Draw Outer Eye Frame (7x7 modules)
    ctx.fillStyle = eyeFrameColor;
    const frameStyle = design.eyeFrameStyle || 'square';
    if (frameStyle === 'circle') {
      ctx.beginPath();
      ctx.arc(eyeX + eyeOuterSize / 2, eyeY + eyeOuterSize / 2, eyeOuterSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (frameStyle === 'rounded') {
      drawRoundedRect(ctx, eyeX, eyeY, eyeOuterSize, eyeOuterSize, cellSize * 1.8);
      ctx.fill();
    } else if (frameStyle === 'leaf') {
      drawLeafRect(ctx, eyeX, eyeY, eyeOuterSize, eyeOuterSize, cellSize * 2);
      ctx.fill();
    } else {
      ctx.fillRect(eyeX, eyeY, eyeOuterSize, eyeOuterSize);
    }

    // Hollow out the 5x5 center of the frame
    ctx.fillStyle = design.bgColor || '#ffffff';
    const innerHollowX = eyeX + cellSize;
    const innerHollowY = eyeY + cellSize;
    const innerHollowSize = 5 * cellSize;

    if (frameStyle === 'circle') {
      ctx.beginPath();
      ctx.arc(
        innerHollowX + innerHollowSize / 2,
        innerHollowY + innerHollowSize / 2,
        innerHollowSize / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    } else if (frameStyle === 'rounded') {
      drawRoundedRect(ctx, innerHollowX, innerHollowY, innerHollowSize, innerHollowSize, cellSize * 1.2);
      ctx.fill();
    } else if (frameStyle === 'leaf') {
      drawLeafRect(ctx, innerHollowX, innerHollowY, innerHollowSize, innerHollowSize, cellSize * 1.3);
      ctx.fill();
    } else {
      ctx.fillRect(innerHollowX, innerHollowY, innerHollowSize, innerHollowSize);
    }

    // B. Draw Inner Eye Ball (3x3 modules)
    ctx.fillStyle = eyeBallColor;
    const ballX = eyeX + 2 * cellSize;
    const ballY = eyeY + 2 * cellSize;
    const ballSize = 3 * cellSize;
    const ballStyle = design.eyeBallStyle || 'square';

    if (ballStyle === 'circle') {
      ctx.beginPath();
      ctx.arc(ballX + ballSize / 2, ballY + ballSize / 2, ballSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (ballStyle === 'rounded') {
      drawRoundedRect(ctx, ballX, ballY, ballSize, ballSize, cellSize * 0.9);
      ctx.fill();
    } else if (ballStyle === 'diamond') {
      drawDiamond(ctx, ballX, ballY, ballSize, ballSize);
      ctx.fill();
    } else {
      ctx.fillRect(ballX, ballY, ballSize, ballSize);
    }
  });

  // 5. Draw Central Logo (if present)
  if (design.logo?.dataUrl) {
    try {
      const logoImg = await loadImage(design.logo.dataUrl);
      const logoFraction = Math.min(0.28, Math.max(0.16, design.logo.size || 0.22));
      const logoSizePx = targetSize * logoFraction;
      const logoX = targetSize / 2 - logoSizePx / 2;
      const logoY = qrYOffset + targetSize / 2 - logoSizePx / 2;
      const badgePadding = cellSize * 0.8;

      // Draw clear background badge to guarantee scannability
      ctx.fillStyle = design.logo.bgColor || '#ffffff';
      const badgeX = logoX - badgePadding;
      const badgeY = logoY - badgePadding;
      const badgeW = logoSizePx + badgePadding * 2;
      const badgeH = logoSizePx + badgePadding * 2;

      drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, cellSize * 1.2);
      ctx.fill();

      if (design.logo.border) {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw Logo Image
      ctx.drawImage(logoImg, logoX, logoY, logoSizePx, logoSizePx);
    } catch (logoErr) {
      console.warn('Failed to render logo on canvas:', logoErr);
    }
  }

  // 6. Draw Frame & CTA Banner (if enabled)
  if (hasFrame && design.frame) {
    const isTop = design.frame.position === 'top';
    const bannerY = isTop ? 0 : targetSize;
    const bannerBg = design.frame.bgColor || '#1e1b4b';
    const bannerTextColor = design.frame.textColor || '#ffffff';

    // Banner Background
    ctx.fillStyle = bannerBg;
    ctx.fillRect(0, bannerY, totalWidth, frameHeight);

    // Banner Text
    ctx.fillStyle = bannerTextColor;
    ctx.font = `bold ${Math.round(frameHeight * 0.4)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(design.frame.text.toUpperCase(), totalWidth / 2, bannerY + frameHeight / 2);
  }
};

/**
 * Promise-based image loader
 */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

/**
 * Generates Pure SVG Vector string for the customized QR Code
 */
export const generateCustomQrSvg = (
  payload: string,
  design: QrCustomDesign,
  targetSize = 512
): string => {
  const ecc = design.logo?.dataUrl ? 'H' : (design.errorCorrection || 'M');
  const qr = QRCode.create(payload || 'https://qrmanager.pro', { errorCorrectionLevel: ecc });
  const moduleCount = qr.modules.size;
  const marginModules = design.margin !== undefined ? design.margin : 2;
  const totalGrid = moduleCount + marginModules * 2;

  const hasFrame = Boolean(design.frame?.enabled && design.frame.text);
  const frameHeight = hasFrame ? Math.round(targetSize * 0.16) : 0;
  const totalHeight = targetSize + frameHeight;
  const cellSize = targetSize / totalGrid;
  const startX = marginModules * cellSize;
  const qrYOffset = hasFrame && design.frame?.position === 'top' ? frameHeight : 0;
  const startY = qrYOffset + marginModules * cellSize;

  let defs = '';
  let fillAttr = `fill="${design.fgColor || '#000000'}"`;

  if (design.gradient?.enabled) {
    const gradId = 'qrGrad_' + Math.random().toString(36).substr(2, 6);
    if (design.gradient.type === 'diagonal') {
      defs = `<defs><linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${design.gradient.startColor}"/><stop offset="100%" stop-color="${design.gradient.endColor}"/></linearGradient></defs>`;
    } else {
      defs = `<defs><linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${design.gradient.startColor}"/><stop offset="100%" stop-color="${design.gradient.endColor}"/></linearGradient></defs>`;
    }
    fillAttr = `fill="url(#${gradId})"`;
  }

  let modulesSvg = '';
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (isFinderPattern(r, c, moduleCount)) continue;
      if (qr.modules.get(r, c)) {
        const x = (startX + c * cellSize).toFixed(2);
        const y = (startY + r * cellSize).toFixed(2);
        const cs = cellSize.toFixed(2);
        if (design.dotStyle === 'dots') {
          const cx = (parseFloat(x) + cellSize / 2).toFixed(2);
          const cy = (parseFloat(y) + cellSize / 2).toFixed(2);
          const rad = ((cellSize / 2) * 0.9).toFixed(2);
          modulesSvg += `<circle cx="${cx}" cy="${cy}" r="${rad}" ${fillAttr} />`;
        } else if (design.dotStyle === 'rounded' || design.dotStyle === 'extra-rounded') {
          const rx = (cellSize * 0.35).toFixed(2);
          modulesSvg += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" rx="${rx}" ${fillAttr} />`;
        } else {
          modulesSvg += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" ${fillAttr} />`;
        }
      }
    }
  }

  // Corner eyes
  const eyeCoords = [
    { r: 0, c: 0 },
    { r: 0, c: moduleCount - 7 },
    { r: moduleCount - 7, c: 0 },
  ];
  let eyesSvg = '';
  const eyeFrameCol = design.eyeFrameColor || design.fgColor || '#000000';
  const eyeBallCol = design.eyeBallColor || design.fgColor || '#000000';

  eyeCoords.forEach(({ r, c }) => {
    const x = startX + c * cellSize;
    const y = startY + r * cellSize;
    const outer = 7 * cellSize;
    const inner = 5 * cellSize;
    const ball = 3 * cellSize;

    eyesSvg += `<rect x="${x}" y="${y}" width="${outer}" height="${outer}" rx="${cellSize * 1.5}" fill="${eyeFrameCol}" />`;
    eyesSvg += `<rect x="${x + cellSize}" y="${y + cellSize}" width="${inner}" height="${inner}" rx="${cellSize}" fill="${design.bgColor || '#ffffff'}" />`;
    eyesSvg += `<rect x="${x + 2 * cellSize}" y="${y + 2 * cellSize}" width="${ball}" height="${ball}" rx="${cellSize * 0.8}" fill="${eyeBallCol}" />`;
  });

  // Optional Frame banner
  let frameSvg = '';
  if (hasFrame && design.frame) {
    const isTop = design.frame.position === 'top';
    const fy = isTop ? 0 : targetSize;
    const ftext = design.frame.text.toUpperCase();
    frameSvg = `
      <rect x="0" y="${fy}" width="${targetSize}" height="${frameHeight}" fill="${design.frame.bgColor || '#1e3a8a'}" />
      <text x="${targetSize / 2}" y="${fy + frameHeight / 2 + 5}" font-family="sans-serif" font-weight="bold" font-size="${Math.round(frameHeight * 0.4)}" fill="${design.frame.textColor || '#ffffff'}" text-anchor="middle">${ftext}</text>
    `;
  }

  // Optional Logo
  let logoSvg = '';
  if (design.logo?.dataUrl) {
    const logoFraction = Math.min(0.28, Math.max(0.16, design.logo.size || 0.22));
    const lSize = targetSize * logoFraction;
    const lx = targetSize / 2 - lSize / 2;
    const ly = qrYOffset + targetSize / 2 - lSize / 2;
    const pad = cellSize * 0.8;
    logoSvg = `
      <rect x="${lx - pad}" y="${ly - pad}" width="${lSize + pad * 2}" height="${lSize + pad * 2}" rx="${cellSize}" fill="${design.logo.bgColor || '#ffffff'}" />
      <image href="${design.logo.dataUrl}" x="${lx}" y="${ly}" width="${lSize}" height="${lSize}" />
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${targetSize} ${totalHeight}" width="${targetSize}" height="${totalHeight}">
      ${defs}
      <rect width="100%" height="100%" fill="${design.bgColor || '#ffffff'}" />
      ${modulesSvg}
      ${eyesSvg}
      ${logoSvg}
      ${frameSvg}
    </svg>
  `.trim();
};

/**
 * Export helpers: PNG, SVG, PDF
 */
export const exportQrCode = async (
  payload: string,
  design: QrCustomDesign,
  filename: string,
  format: 'png' | 'jpg' | 'svg' | 'pdf',
  exportSize = 1024
): Promise<void> => {
  const safeBaseName = filename.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'qr-code';

  if (format === 'svg') {
    const svgStr = generateCustomQrSvg(payload, design, exportSize);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeBaseName}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  // Create offscreen canvas for raster render
  const offscreen = document.createElement('canvas');
  await renderQrToCanvas(payload, design, offscreen, exportSize);

  if (format === 'png' || format === 'jpg') {
    const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const dataUrl = offscreen.toDataURL(mime, 0.95);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${safeBaseName}.${format}`;
    a.click();
    return;
  }

  if (format === 'pdf') {
    // Generate authentic Vector/High-res PDF document
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // A4 width: 210mm, height: 297mm
    const pageWidth = 210;
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    // Header banner
    pdf.setFillColor(30, 41, 59); // Slate-800
    pdf.rect(0, 0, pageWidth, 28, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('QR CODE GENERATOR & MANAGEMENT PLATFORM', margin, 18);

    // Title & Payload metadata
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(18);
    pdf.text(filename, margin, 45);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()} | Error Correction: ${design.errorCorrection || 'M'}`, margin, 52);

    // Embed QR image centered on page
    const qrImgData = offscreen.toDataURL('image/png', 1.0);
    const qrSizeMm = 120; // 120mm x 120mm centered
    const qrX = (pageWidth - qrSizeMm) / 2;
    const qrY = 62;

    // Draw card border in PDF
    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(qrX - 6, qrY - 6, qrSizeMm + 12, qrSizeMm + 12, 4, 4, 'FD');

    pdf.addImage(qrImgData, 'PNG', qrX, qrY, qrSizeMm, qrSizeMm);

    // Encoded Target Text Box
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    pdf.text('ENCODED DESTINATION PAYLOAD:', margin, 204);

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(30, 41, 59);
    pdf.text(payload || '(empty)', margin, 211, { maxWidth: contentWidth });

    // Footer
    pdf.setDrawColor(241, 245, 249);
    pdf.line(margin, 275, pageWidth - margin, 275);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text('High-resolution printable asset. Ready for physical camera scanning and signage print.', margin, 282);

    pdf.save(`${safeBaseName}.pdf`);
  }
};
