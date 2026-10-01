export interface QrCustomDesign {
  fgColor: string;
  bgColor: string;
  gradient?: {
    enabled: boolean;
    type: 'linear' | 'radial' | 'diagonal';
    startColor: string;
    endColor: string;
  };
  dotStyle: 'square' | 'dots' | 'rounded' | 'classy' | 'extra-rounded';
  eyeFrameStyle: 'square' | 'rounded' | 'circle' | 'leaf';
  eyeBallStyle: 'square' | 'circle' | 'rounded' | 'diamond';
  eyeFrameColor?: string;
  eyeBallColor?: string;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  margin: number;
  size: number;
  logo?: {
    dataUrl?: string;
    size: number; // fraction 0.15 to 0.3
    bgColor?: string;
    border?: boolean;
  };
  frame?: {
    enabled: boolean;
    text: string;
    position: 'top' | 'bottom';
    bgColor: string;
    textColor: string;
  };
  templateId?: string;
}

export interface QrTemplate {
  id: string;
  name: string;
  category: 'General' | 'Business' | 'Marketing' | 'Payment' | 'Events';
  description: string;
  accentColor: string;
  design: QrCustomDesign;
}

export const QR_TEMPLATES: QrTemplate[] = [
  {
    id: 'minimal',
    name: 'Clean Minimalist',
    category: 'General',
    description: 'Pure monochrome contrast, sharp square modules, ideal for high-contrast print.',
    accentColor: '#0f172a',
    design: {
      fgColor: '#0f172a',
      bgColor: '#ffffff',
      gradient: {
        enabled: false,
        type: 'linear',
        startColor: '#0f172a',
        endColor: '#334155',
      },
      dotStyle: 'square',
      eyeFrameStyle: 'square',
      eyeBallStyle: 'square',
      eyeFrameColor: '#0f172a',
      eyeBallColor: '#0f172a',
      errorCorrection: 'M',
      margin: 2,
      size: 512,
      frame: {
        enabled: false,
        text: 'SCAN ME',
        position: 'bottom',
        bgColor: '#0f172a',
        textColor: '#ffffff',
      },
      templateId: 'minimal',
    },
  },
  {
    id: 'business',
    name: 'Corporate Executive',
    category: 'Business',
    description: 'Executive navy & royal palette with rounded modules and professional scan frame.',
    accentColor: '#1e3a8a',
    design: {
      fgColor: '#1e3a8a',
      bgColor: '#f8fafc',
      gradient: {
        enabled: true,
        type: 'linear',
        startColor: '#1e3a8a',
        endColor: '#2563eb',
      },
      dotStyle: 'rounded',
      eyeFrameStyle: 'rounded',
      eyeBallStyle: 'rounded',
      eyeFrameColor: '#1e3a8a',
      eyeBallColor: '#2563eb',
      errorCorrection: 'Q',
      margin: 2,
      size: 512,
      frame: {
        enabled: true,
        text: 'SCAN FOR DETAILS',
        position: 'bottom',
        bgColor: '#1e3a8a',
        textColor: '#ffffff',
      },
      templateId: 'business',
    },
  },
  {
    id: 'modern',
    name: 'Modern Gradient',
    category: 'Marketing',
    description: 'Vibrant indigo to purple diagonal flow with circular fluid modules and circle eyes.',
    accentColor: '#6366f1',
    design: {
      fgColor: '#4f46e5',
      bgColor: '#ffffff',
      gradient: {
        enabled: true,
        type: 'diagonal',
        startColor: '#4f46e5',
        endColor: '#9333ea',
      },
      dotStyle: 'dots',
      eyeFrameStyle: 'circle',
      eyeBallStyle: 'circle',
      eyeFrameColor: '#4f46e5',
      eyeBallColor: '#9333ea',
      errorCorrection: 'Q',
      margin: 2,
      size: 512,
      frame: {
        enabled: true,
        text: 'DISCOVER MORE',
        position: 'bottom',
        bgColor: '#4f46e5',
        textColor: '#ffffff',
      },
      templateId: 'modern',
    },
  },
  {
    id: 'rounded',
    name: 'Organic Rounded',
    category: 'Marketing',
    description: 'Natural emerald tones with soft extra-rounded modules and leaf corner eye frames.',
    accentColor: '#059669',
    design: {
      fgColor: '#065f46',
      bgColor: '#f0fdf4',
      gradient: {
        enabled: true,
        type: 'linear',
        startColor: '#059669',
        endColor: '#0d9488',
      },
      dotStyle: 'extra-rounded',
      eyeFrameStyle: 'leaf',
      eyeBallStyle: 'circle',
      eyeFrameColor: '#047857',
      eyeBallColor: '#059669',
      errorCorrection: 'M',
      margin: 2,
      size: 512,
      frame: {
        enabled: false,
        text: 'SCAN HERE',
        position: 'bottom',
        bgColor: '#059669',
        textColor: '#ffffff',
      },
      templateId: 'rounded',
    },
  },
  {
    id: 'payment',
    name: 'Instant Pay & UPI',
    category: 'Payment',
    description: 'High-contrast merchant styling with emerald security accents and bold PAY HERE banner.',
    accentColor: '#059669',
    design: {
      fgColor: '#0f172a',
      bgColor: '#ffffff',
      gradient: {
        enabled: false,
        type: 'linear',
        startColor: '#0f172a',
        endColor: '#059669',
      },
      dotStyle: 'rounded',
      eyeFrameStyle: 'rounded',
      eyeBallStyle: 'square',
      eyeFrameColor: '#059669',
      eyeBallColor: '#047857',
      errorCorrection: 'H',
      margin: 2,
      size: 512,
      frame: {
        enabled: true,
        text: '⚡ PAY SECURELY HERE',
        position: 'bottom',
        bgColor: '#059669',
        textColor: '#ffffff',
      },
      templateId: 'payment',
    },
  },
  {
    id: 'social',
    name: 'Social Pulse',
    category: 'Marketing',
    description: 'Eye-catching fuchsia & rose tones with playful circular dots, built for digital engagement.',
    accentColor: '#db2777',
    design: {
      fgColor: '#be185d',
      bgColor: '#ffffff',
      gradient: {
        enabled: true,
        type: 'diagonal',
        startColor: '#db2777',
        endColor: '#7c3aed',
      },
      dotStyle: 'dots',
      eyeFrameStyle: 'rounded',
      eyeBallStyle: 'diamond',
      eyeFrameColor: '#db2777',
      eyeBallColor: '#7c3aed',
      errorCorrection: 'Q',
      margin: 2,
      size: 512,
      frame: {
        enabled: true,
        text: 'CONNECT & FOLLOW',
        position: 'bottom',
        bgColor: '#db2777',
        textColor: '#ffffff',
      },
      templateId: 'social',
    },
  },
  {
    id: 'event',
    name: 'Event Pass & VIP',
    category: 'Events',
    description: 'Bold amber to crimson theme with classy diamond modules and top admission header.',
    accentColor: '#d97706',
    design: {
      fgColor: '#78350f',
      bgColor: '#fffbeb',
      gradient: {
        enabled: true,
        type: 'linear',
        startColor: '#d97706',
        endColor: '#dc2626',
      },
      dotStyle: 'classy',
      eyeFrameStyle: 'square',
      eyeBallStyle: 'diamond',
      eyeFrameColor: '#b45309',
      eyeBallColor: '#dc2626',
      errorCorrection: 'H',
      margin: 2,
      size: 512,
      frame: {
        enabled: true,
        text: 'EVENT ACCESS PASS',
        position: 'top',
        bgColor: '#b45309',
        textColor: '#ffffff',
      },
      templateId: 'event',
    },
  },
];

export const DEFAULT_DESIGN: QrCustomDesign = {
  ...QR_TEMPLATES[0].design,
};
