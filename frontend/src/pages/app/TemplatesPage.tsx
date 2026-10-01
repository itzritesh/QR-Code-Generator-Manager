import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineSparkles,
  HiOutlineEye,
  HiOutlineArrowRight,
  HiOutlineCheck,
} from 'react-icons/hi';
import { Card, CardBody, CardFooter } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/ToastContext';
import { QR_TEMPLATES, QrTemplate } from '../../utils/qrTemplates';
import { renderQrToCanvas } from '../../utils/qrRenderer';
import { cn } from '../../utils/cn';

interface TemplateCanvasProps {
  template: QrTemplate;
  size?: number;
}

const TemplateCanvas: React.FC<TemplateCanvasProps> = ({ template, size = 140 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let active = true;
    if (canvasRef.current) {
      let samplePayload = 'https://example.com/preview';
      if (template.id === 'payment') samplePayload = 'upi://pay?pa=merchant@okhdfcbank&pn=Acme+Store&am=150.00&cu=INR';
      if (template.id === 'event') samplePayload = 'https://example.com/event/vip-pass';
      if (template.id === 'social') samplePayload = 'https://instagram.com/brand';

      renderQrToCanvas(samplePayload, template.design, canvasRef.current, size)
        .catch((err) => {
          if (active) console.error('Canvas render error in template:', err);
        });
    }
    return () => {
      active = false;
    };
  }, [template, size]);

  return (
    <canvas
      ref={canvasRef}
      className="mx-auto rounded-md shadow-2xs max-w-full"
      style={{ width: size, height: size }}
    />
  );
};

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [inspectingTemplate, setInspectingTemplate] = useState<QrTemplate | null>(null);

  const categories = [
    { id: 'all', label: 'All', count: QR_TEMPLATES.length },
    { id: 'General', label: 'General', count: QR_TEMPLATES.filter((t) => t.category === 'General').length },
    { id: 'Business', label: 'Business', count: QR_TEMPLATES.filter((t) => t.category === 'Business').length },
    { id: 'Marketing', label: 'Marketing', count: QR_TEMPLATES.filter((t) => t.category === 'Marketing').length },
    { id: 'Payment', label: 'Payments', count: QR_TEMPLATES.filter((t) => t.category === 'Payment').length },
    { id: 'Events', label: 'Events', count: QR_TEMPLATES.filter((t) => t.category === 'Events').length },
  ];

  const filteredTemplates = QR_TEMPLATES.filter((tmpl) => {
    const matchesCat = activeCategory === 'all' || tmpl.category === activeCategory;
    const matchesQuery =
      searchTerm.trim() === '' ||
      tmpl.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tmpl.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tmpl.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleUseTemplate = (template: QrTemplate) => {
    toast.info(`Applying "${template.name}" configuration...`);
    navigate(`/app/create?template=${template.id}`);
  };

  return (
    <div className="space-y-5 text-left">
      {/* Page Header */}
      <PageHeader
        title="QR Templates"
        description="Choose from pre-designed styles with verified scannability. Click any template to apply its styling directly into the studio."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/app/create')}
            leftIcon={<HiOutlineSparkles className="w-4 h-4" />}
          >
            Create Custom QR
          </Button>
        }
      />

      {/* Filter Tabs & Search Toolbar */}
      <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer select-none whitespace-nowrap',
                  activeCategory === cat.id
                    ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <span>{cat.label}</span>
                <span className="ml-1 opacity-70">({cat.count})</span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="w-full sm:w-60">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search templates..."
              className="w-full text-xs"
            />
          </div>
        </div>
      </div>

      {/* Templates Grid (Compact 3-col on desktop, 2-col on tablet, 1-col on mobile) */}
      {filteredTemplates.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="No matching templates found"
            description="Try adjusting your search query or switching to a different category tab."
            actionText="Clear Filters"
            onAction={() => {
              setSearchTerm('');
              setActiveCategory('all');
            }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              hoverEffect
              className="flex flex-col h-full border-slate-200/80"
            >
              <CardBody className="p-4 flex flex-col flex-1 space-y-3">
                {/* Title & Category Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-slate-200"
                      style={{ backgroundColor: template.accentColor }}
                    />
                    <h3 className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                      {template.name}
                    </h3>
                  </div>
                  <Badge variant="neutral" size="sm">
                    {template.category}
                  </Badge>
                </div>

                {/* Real Canvas Preview Container */}
                <div
                  onClick={() => setInspectingTemplate(template)}
                  className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex items-center justify-center cursor-pointer transition-colors hover:bg-slate-100/70"
                >
                  <TemplateCanvas template={template} size={140} />
                </div>

                {/* Description - flex-1 keeps footer aligned */}
                <p className="text-xs text-slate-500 leading-snug line-clamp-2 flex-1">
                  {template.description}
                </p>

                {/* Attributes */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[11px] text-slate-600">
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium capitalize">
                    {template.design.dotStyle}
                  </span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium capitalize">
                    {template.design.eyeFrameStyle || 'square'} eyes
                  </span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium">
                    ECC {template.design.errorCorrection}
                  </span>
                </div>
              </CardBody>

              {/* Action Footer - Aligned at same vertical baseline */}
              <CardFooter className="px-4 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInspectingTemplate(template)}
                  leftIcon={<HiOutlineEye className="w-4 h-4" />}
                >
                  Preview
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleUseTemplate(template)}
                  rightIcon={<HiOutlineArrowRight className="w-4 h-4" />}
                >
                  Use Template
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Inspect Template Modal */}
      {inspectingTemplate && (
        <Modal
          isOpen={Boolean(inspectingTemplate)}
          onClose={() => setInspectingTemplate(null)}
          title={inspectingTemplate.name}
          description={`${inspectingTemplate.category} Template Specification`}
          footer={
            <>
              <Button variant="outline" size="md" onClick={() => setInspectingTemplate(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                leftIcon={<HiOutlineCheck className="w-4 h-4" />}
                onClick={() => {
                  const t = inspectingTemplate;
                  setInspectingTemplate(null);
                  handleUseTemplate(t);
                }}
              >
                Apply Template
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center">
              <TemplateCanvas template={inspectingTemplate} size={180} />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-700">Description</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {inspectingTemplate.description}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Module Style</span>
                <span className="font-semibold text-slate-800 capitalize">{inspectingTemplate.design.dotStyle}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Corner Eyes</span>
                <span className="font-semibold text-slate-800 capitalize">{inspectingTemplate.design.eyeFrameStyle || 'square'}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Foreground Color</span>
                <span className="font-mono text-slate-800 font-semibold">{inspectingTemplate.design.fgColor}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Error Recovery</span>
                <span className="font-semibold text-slate-800">Level {inspectingTemplate.design.errorCorrection}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
