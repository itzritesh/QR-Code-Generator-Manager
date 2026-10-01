import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineUpload,
  HiOutlineDownload,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineTrash,
  HiOutlineInformationCircle,
  HiOutlineRefresh,
  HiOutlineQrcode,
  HiChevronDown,
  HiChevronUp,
} from 'react-icons/hi';
import { Card, CardHeader, CardTitle, CardBody, CardDescription, CardFooter } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import {
  bulkApi,
  BulkValidationResponse,
} from '../../services/bulk.api';
import { useToast } from '../../components/ui/ToastContext';
import { cn } from '../../utils/cn';

type PreviewTab = 'all' | 'valid' | 'errors';

export const BulkQRPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File & Raw CSV State
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const [showPasteMode, setShowPasteMode] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showFormatGuide, setShowFormatGuide] = useState<boolean>(false);

  // Validation state
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<BulkValidationResponse | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('all');

  // Generation state
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationSuccess, setGenerationSuccess] = useState<{
    count: number;
    zipFilename: string;
    zipBase64: string;
  } | null>(null);

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
      toast.error('Please upload a valid CSV (.csv) file.');
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      toast.error('File size exceeds 2MB limit.');
      return;
    }

    setFile(selectedFile);
    setValidationResult(null);
    setGenerationSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      setCsvText(text);
    };
    reader.readAsText(selectedFile);
  };

  const handleValidate = async () => {
    if (!csvText || !csvText.trim()) {
      toast.error('Please select a CSV file or enter CSV data first.');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);
    setGenerationSuccess(null);

    try {
      const result = await bulkApi.validateCsv(csvText);
      setValidationResult(result);
      if (result.invalidCount === 0) {
        toast.success(`All ${result.validCount} rows are valid and ready to generate!`, 'Validated');
      } else {
        toast.info(
          `${result.validCount} valid rows, ${result.invalidCount} rows have errors.`,
          'Validation Summary'
        );
      }
    } catch (err: any) {
      console.error('Validation error:', err);
      toast.error(err?.response?.data?.message || err.message || 'Failed to parse CSV');
    } finally {
      setIsValidating(false);
    }
  };

  const handleGenerate = async () => {
    if (!validationResult || validationResult.validRows.length === 0) {
      toast.error('No valid rows available to generate.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await bulkApi.generateBulk(validationResult.validRows, format);
      setGenerationSuccess({
        count: response.createdCount,
        zipFilename: response.zipFilename,
        zipBase64: response.zipBase64,
      });

      downloadZipFromBase64(response.zipBase64, response.zipFilename);
      toast.success(
        `Successfully generated ${response.createdCount} QR codes into ${response.zipFilename}!`,
        'Bulk Generation Complete'
      );
    } catch (err: any) {
      console.error('Bulk generation error:', err);
      toast.error(err?.response?.data?.message || err.message || 'Failed to generate bulk QR codes');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadZipFromBase64 = (base64: string, filename: string) => {
    const linkSource = `data:application/zip;base64,${base64}`;
    const downloadLink = document.createElement('a');
    downloadLink.href = linkSource;
    downloadLink.download = filename;
    downloadLink.click();
  };

  const handleReset = () => {
    setFile(null);
    setCsvText('');
    setValidationResult(null);
    setGenerationSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadSample = () => {
    const sampleUrl = bulkApi.getTemplateUrl();
    const link = document.createElement('a');
    link.href = sampleUrl;
    link.setAttribute('download', 'bulk_qr_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Sample CSV template downloaded');
  };

  // Determine current step
  const activeStep = generationSuccess
    ? 5
    : isGenerating
    ? 4
    : validationResult
    ? 3
    : isValidating
    ? 2
    : 1;

  const steps = [
    { num: 1, label: 'Upload CSV' },
    { num: 2, label: 'Validate' },
    { num: 3, label: 'Review' },
    { num: 4, label: 'Generate' },
    { num: 5, label: 'Download ZIP' },
  ];

  return (
    <div className="space-y-6 text-left max-w-5xl">
      {/* Page Header */}
      <PageHeader
        title="Bulk QR Generator"
        description="Batch generate and download multiple QR codes at once from a CSV spreadsheet (up to 100 rows)."
        actions={
          <Button
            variant="outline"
            size="md"
            onClick={handleDownloadSample}
            leftIcon={<HiOutlineDownload className="w-4 h-4" />}
          >
            Download Sample CSV
          </Button>
        }
      />

      {/* 5-Step Workflow Stepper Bar */}
      <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between relative">
          {steps.map((s) => {
            const isCompleted = activeStep > s.num;
            const isCurrent = activeStep === s.num;
            return (
              <div key={s.num} className="flex-1 flex flex-col items-center text-center relative z-10">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-200'
                      : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {isCompleted ? '✓' : s.num}
                </div>
                <span
                  className={cn(
                    'text-[11px] mt-1 hidden sm:block',
                    isCurrent ? 'font-semibold text-slate-900' : 'text-slate-500'
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SUCCESS SCREEN */}
      {generationSuccess && (
        <Card className="bg-emerald-50/40 border-emerald-200">
          <CardBody className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <HiOutlineCheckCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Batch Generation Complete!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
                Created <strong>{generationSuccess.count}</strong> QR records in your dashboard and generated your ZIP package.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => downloadZipFromBase64(generationSuccess.zipBase64, generationSuccess.zipFilename)}
                leftIcon={<HiOutlineDownload className="w-4 h-4" />}
              >
                Download ZIP Again
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => navigate('/app/qr-codes')}
                leftIcon={<HiOutlineQrcode className="w-4 h-4" />}
              >
                View in My QR Codes
              </Button>
              <Button variant="ghost" size="md" onClick={handleReset}>
                Upload Another CSV
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* UPLOAD & INPUT CARD */}
      {!generationSuccess && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>1. Upload or Paste CSV Dataset</CardTitle>
              <CardDescription>
                Provide a CSV file with your QR records (maximum 100 rows per batch).
              </CardDescription>
            </div>
            <button
              type="button"
              onClick={() => setShowPasteMode(!showPasteMode)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              {showPasteMode ? 'Switch to File Upload' : 'Paste CSV Text'}
            </button>
          </CardHeader>

          <CardBody className="space-y-4">
            {showPasteMode ? (
              <div className="space-y-1">
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  rows={6}
                  placeholder={`name,type,content,isDynamic\nCompany Website,URL,https://example.com,true\nGuest Wi-Fi,WIFI,,false,OfficeWiFi,secret123,WPA\nCounter Payment,PAYMENT,,false,,,,merchant@upi,Coffee Bar,50,Snacks`}
                  className="w-full p-3 font-mono text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl py-6 px-4 text-center cursor-pointer transition-colors',
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : file
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <HiOutlineUpload className="w-5 h-5" />
                  </div>
                  {file ? (
                    <div>
                      <p className="text-xs font-bold text-slate-900">{file.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB &bull; Click to replace
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        Select CSV file or drag and drop here
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Up to 100 rows per batch. Maximum 2MB.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Controls Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Export Format:</span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setFormat('png')}
                    className={cn(
                      'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                      format === 'png'
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('svg')}
                    className={cn(
                      'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                      format === 'svg'
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    SVG
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {file && (
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={handleReset}
                    leftIcon={<HiOutlineTrash className="w-4 h-4 text-rose-500" />}
                  >
                    Clear
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleValidate}
                  isLoading={isValidating}
                  loadingText="Validating..."
                  disabled={!csvText || !csvText.trim()}
                  leftIcon={<HiOutlineRefresh className="w-4 h-4" />}
                >
                  Validate CSV
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* REVIEW & GENERATE CARD */}
      {validationResult && !generationSuccess && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle>2. Review &amp; Generate</CardTitle>
              <CardDescription>
                Check validated rows and fix any errors before batch creation.
              </CardDescription>
            </div>

            <div className="flex items-center gap-1.5">
              <Badge variant="neutral" size="sm">{validationResult.totalRows} Total</Badge>
              <Badge variant="success" size="sm">{validationResult.validCount} Valid</Badge>
              {validationResult.invalidCount > 0 && (
                <Badge variant="danger" size="sm">{validationResult.invalidCount} Errors</Badge>
              )}
            </div>
          </CardHeader>

          {/* Tab Filter Row */}
          <div className="px-4 sm:px-5 py-2.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setPreviewTab('all')}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                  previewTab === 'all'
                    ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                All ({validationResult.totalRows})
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('valid')}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                  previewTab === 'valid'
                    ? 'bg-white text-emerald-600 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Valid ({validationResult.validCount})
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('errors')}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                  previewTab === 'errors'
                    ? 'bg-white text-rose-600 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Errors ({validationResult.invalidCount})
              </button>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleGenerate}
              isLoading={isGenerating}
              loadingText="Generating ZIP..."
              disabled={validationResult.validCount === 0}
              leftIcon={<HiOutlineDownload className="w-4 h-4" />}
            >
              Generate ZIP ({validationResult.validCount} Codes)
            </Button>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>QR Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Content / Target</TableHead>
                  <TableHead>Dynamic</TableHead>
                  <TableHead className="text-right">Validation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Valid rows */}
                {(previewTab === 'all' || previewTab === 'valid') &&
                  validationResult.validRows.map((row) => (
                    <TableRow key={`valid-${row.rowNumber}`}>
                      <TableCell className="font-mono text-xs text-slate-400">
                        {row.rowNumber}
                      </TableCell>
                      <TableCell className="font-medium text-xs text-slate-900">
                        {row.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral" size="sm">
                          {row.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-600 truncate max-w-xs" title={row.content || ''}>
                        {row.content || '<WiFi/UPI Payload>'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.isDynamic ? 'brand' : 'neutral'} size="sm">
                          {row.isDynamic ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs font-semibold text-emerald-600 inline-flex items-center gap-1">
                          <HiOutlineCheckCircle className="w-4 h-4" />
                          <span>Valid</span>
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}

                {/* Error rows */}
                {(previewTab === 'all' || previewTab === 'errors') &&
                  validationResult.invalidRows.map((row) => (
                    <TableRow key={`error-${row.rowNumber}`} className="bg-rose-50/30">
                      <TableCell className="font-mono text-xs text-slate-400">
                        {row.rowNumber}
                      </TableCell>
                      <TableCell className="font-medium text-xs text-slate-900">
                        {row.raw.name || '<Untitled>'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="danger" size="sm">
                          {row.raw.type || 'UNKNOWN'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-rose-800 truncate max-w-xs" title={row.raw.content || ''}>
                        {row.raw.content || '<No Content>'}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-400">-</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-0.5 inline-block text-left">
                          {row.errors.map((err, eIdx) => (
                            <div key={eIdx} className="text-[11px] font-medium text-rose-600 flex items-center justify-end gap-1">
                              <HiOutlineExclamationCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{err}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Stacked Card View */}
          <div className="md:hidden divide-y divide-slate-100">
            {(previewTab === 'all' || previewTab === 'valid') &&
              validationResult.validRows.map((row) => (
                <div key={`mob-valid-${row.rowNumber}`} className="p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{row.name}</span>
                    <span className="text-emerald-600 font-medium inline-flex items-center gap-1">
                      <HiOutlineCheckCircle className="w-3.5 h-3.5" /> Valid
                    </span>
                  </div>
                  <div className="text-slate-500 font-mono text-[11px] truncate">
                    {row.content || '<Payload>'}
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <Badge variant="neutral" size="sm">{row.type}</Badge>
                    {row.isDynamic && <Badge variant="brand" size="sm">Dynamic</Badge>}
                  </div>
                </div>
              ))}

            {(previewTab === 'all' || previewTab === 'errors') &&
              validationResult.invalidRows.map((row) => (
                <div key={`mob-error-${row.rowNumber}`} className="p-3 text-xs space-y-1 bg-rose-50/30">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{row.raw.name || '<Untitled>'}</span>
                    <Badge variant="danger" size="sm">Row {row.rowNumber}</Badge>
                  </div>
                  <div className="space-y-0.5 pt-1">
                    {row.errors.map((err, eIdx) => (
                      <p key={eIdx} className="text-rose-600 text-[11px] flex items-center gap-1">
                        <HiOutlineExclamationCircle className="w-3.5 h-3.5 shrink-0" />
                        {err}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
          </div>

          <CardFooter className="justify-between bg-slate-50/50 flex-col sm:flex-row gap-3">
            <span className="text-xs text-slate-500">
              Only valid rows ({validationResult.validCount}) will be created and added to the ZIP package.
            </span>
            <Button
              variant="primary"
              size="md"
              onClick={handleGenerate}
              isLoading={isGenerating}
              loadingText="Generating ZIP..."
              disabled={validationResult.validCount === 0}
              leftIcon={<HiOutlineDownload className="w-4 h-4" />}
            >
              Generate ZIP Package
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* COLLAPSIBLE SCHEMA REFERENCE (Clean, Not Oversized) */}
      <Card className="border-slate-200">
        <button
          type="button"
          onClick={() => setShowFormatGuide(!showFormatGuide)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <HiOutlineInformationCircle className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold text-slate-800">
              Supported CSV Format &amp; Column Reference
            </span>
          </div>
          {showFormatGuide ? (
            <HiChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <HiChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showFormatGuide && (
          <CardBody className="p-4 pt-1 border-t border-slate-100 text-xs text-slate-600 space-y-3">
            <p className="leading-relaxed">
              Generate URL, Plain Text, Wi-Fi network, and UPI Payment QR codes in bulk using these standard headers:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 space-y-1">
                <span className="font-semibold text-slate-900 block">General Columns</span>
                <p><code className="text-indigo-600 font-bold">name</code>: QR display name (Required)</p>
                <p><code className="text-indigo-600 font-bold">type</code>: <code className="text-slate-800">URL</code>, <code className="text-slate-800">TEXT</code>, <code className="text-slate-800">WIFI</code>, or <code className="text-slate-800">PAYMENT</code></p>
                <p><code className="text-indigo-600 font-bold">content</code>: Target URL or text body</p>
                <p><code className="text-indigo-600 font-bold">isDynamic</code>: <code className="text-slate-800">true</code> or <code className="text-slate-800">false</code></p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 space-y-1">
                <span className="font-semibold text-slate-900 block">Wi-Fi &amp; Payment Columns</span>
                <p><code className="text-indigo-600 font-bold">ssid, password, security</code>: Wi-Fi credentials (<code className="text-slate-800">WPA</code>, <code className="text-slate-800">WEP</code>, <code className="text-slate-800">nopass</code>)</p>
                <p><code className="text-indigo-600 font-bold">upiId, payeeName</code>: UPI payment identifier (e.g. <code className="text-slate-800">merchant@bank</code>)</p>
                <p><code className="text-indigo-600 font-bold">amount, note</code>: Optional transaction amount and memo</p>
              </div>
            </div>
          </CardBody>
        )}
      </Card>
    </div>
  );
};
