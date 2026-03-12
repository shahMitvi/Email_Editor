import { useState, useMemo, useEffect } from 'react';
import { X, Monitor, Smartphone, Tablet } from 'lucide-react';
import { buildEmailHtml } from '../../utils/exportHtml';
import { useBuilderStore, type Page } from '../../store/useBuilderStore';
import Frame from 'react-frame-component';

type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface PreviewModalProps {
  pages: Page[];
  onClose: () => void;
}

export const PreviewModal = ({ pages, onClose }: PreviewModalProps) => {
  const { variables, canvasSettings } = useBuilderStore();
  const [device, setDevice] = useState<DeviceType>('desktop');

  // Parse width for scaling
  const canvasWidth = parseInt(canvasSettings.width) || 794;

  // Build fresh HTML for the preview — includes all pages
  const previewHtml = useMemo(
    () => buildEmailHtml(pages, variables, 'Preview', false, canvasSettings),
    [pages, variables, canvasSettings]
  );

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const iframeWidth = device === 'desktop' ? '100%' : device === 'tablet' ? '768px' : '375px';
  // Use dynamic canvas width for scaling calculations
  const scale = device === 'mobile' ? 375 / (canvasWidth + 40) : 1;
  const containerStyle = device === 'desktop' 
    ? { width: '100%', height: '100%' }
    : { width: canvasSettings.width, height: '800px', transform: `scale(${scale})`, transformOrigin: 'top center' };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#1a1a2e]">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="h-14 bg-[#16213e] border-b border-white/10 flex items-center justify-center px-4 shrink-0 relative">
        <div className="absolute left-4 text-white font-semibold text-sm">Preview</div>

        <div className="flex bg-white/5 p-1 rounded-lg">
          <button
            onClick={() => setDevice('desktop')}
            className={`p-2 rounded-md flex items-center gap-2 transition-colors ${device === 'desktop' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
          >
            <Monitor size={16} /> <span className="hidden sm:inline text-xs font-medium px-1">Desktop</span>
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={`p-2 rounded-md flex items-center gap-2 transition-colors ${device === 'tablet' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
          >
            <Tablet size={16} /> <span className="hidden sm:inline text-xs font-medium px-1">Tablet</span>
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={`p-2 rounded-md flex items-center gap-2 transition-colors ${device === 'mobile' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
          >
            <Smartphone size={16} /> <span className="hidden sm:inline text-xs font-medium px-1">Mobile</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors"
          title="Close preview (Esc)"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Preview area ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-6 sm:p-10 custom-scrollbar relative">
        <div
          style={{
            width: iframeWidth,
            height: '100%',
            minHeight: device === 'mobile' ? `${800 * scale}px` : '800px',
            background: '#fff',
            boxShadow: '0 8px 60px rgba(0,0,0,0.6)',
            borderRadius: device === 'desktop' ? 4 : 24,
            overflow: device === 'desktop' ? 'auto' : 'hidden',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: device !== 'desktop' ? '12px solid #2a2a4a' : 'none',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start'
          }}
        >
          <div style={containerStyle}>
            <Frame
              initialContent={previewHtml}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            >
              <></>
            </Frame>
          </div>
        </div>
      </div>
    </div>
  );
};
