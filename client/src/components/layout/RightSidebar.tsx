import { useRef, useEffect, useState } from 'react';
import { useBuilderStore, type ColumnMapping } from '../../store/useBuilderStore';
import { v4 as uuidv4 } from 'uuid';
import {
  Settings2, Type, PaintBucket, Layout,
  Upload, Link, X, Trash2, Plus, Minus, Database
} from 'lucide-react';
import Editor from '@monaco-editor/react';

// We need a reference to the active table editor — stored in a module-level WeakMap keyed by element id
// The TableBlock will register its editor so the sidebar can call commands on it.
type EditorRef = { addRowAfter: () => void; deleteRow: () => void; addColumnAfter: () => void; deleteColumn: () => void; };
const tableEditorRefs = new Map<string, EditorRef>();
export const registerTableEditor = (id: string, ref: EditorRef | null) => {
  if (ref) tableEditorRefs.set(id, ref);
  else tableEditorRefs.delete(id);
};

// ─── Column Mapping Row Component ─────────────────────────────────────────────
const ColumnMappingRow = ({
  col, idx, onUpdate, onRemove,
}: {
  col: ColumnMapping;
  idx: number;
  onUpdate: (updates: Partial<ColumnMapping>) => void;
  onRemove: () => void;
}) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 border-b border-gray-100">
        <span className="text-[10px] font-bold text-gray-400 w-4 shrink-0">{idx + 1}</span>
        <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{col.header || `Column ${idx + 1}`}</span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${col.type === 'formula' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
          {col.type}
        </span>
        <button onClick={() => setOpen(o => !o)} className="text-gray-400 hover:text-gray-600 p-0.5">
          {open ? '▲' : '▼'}
        </button>
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500 p-0.5">
          <Trash2 size={12} />
        </button>
      </div>
      {open && (
        <div className="p-2.5 space-y-2">
          <div>
            <label className="block text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Header Label</label>
            <input
              type="text"
              value={col.header}
              onChange={(e) => onUpdate({ header: e.target.value })}
              placeholder="Column header"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Type</label>
            <div className="flex rounded border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => onUpdate({ type: 'data', formula: '' })}
                className={`flex-1 py-1 text-xs font-medium transition-colors ${col.type === 'data' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >Data</button>
              <button
                type="button"
                onClick={() => onUpdate({ type: 'formula', dataKey: '' })}
                className={`flex-1 py-1 text-xs font-medium transition-colors ${col.type === 'formula' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >Formula</button>
            </div>
          </div>
          {col.type === 'data' ? (
            <div>
              <label className="block text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Data Key</label>
              <input
                type="text"
                value={col.dataKey}
                onChange={(e) => onUpdate({ dataKey: e.target.value })}
                placeholder="e.g. item_name"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-mono"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Formula</label>
              <input
                type="text"
                value={col.formula}
                onChange={(e) => onUpdate({ formula: e.target.value })}
                placeholder="e.g. {price}*{qnty}"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-mono"
              />
              <p className="text-[9px] text-gray-400 mt-0.5">Use {'{key}'} to reference other column data keys</p>
            </div>
          )}
          <div>
            <label className="block text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Footer Aggregation</label>
            <select
              value={col.footerAggregation}
              onChange={(e) => onUpdate({ footerAggregation: e.target.value as ColumnMapping['footerAggregation'] })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
            >
              <option value="none">None</option>
              <option value="sum">Sum</option>
              <option value="avg">Average</option>
              <option value="count">Count</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export const RightSidebar = () => {

  const { selectedId, pages, updateElement, selectElement, removeElement } = useBuilderStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const selectedElement = pages.flatMap(p => p.elements).find((el) => el.id === selectedId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (target.isContentEditable) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        removeElement(selectedId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, removeElement]);

  const handleStyleChange = (key: string, value: string) => {
    if (!selectedElement) return;
    updateElement(selectedElement.id, { styles: { ...selectedElement.styles, [key]: value } });
  };

  const handleContentChange = (key: string, value: any) => {
    if (!selectedElement) return;
    updateElement(selectedElement.id, { content: { ...selectedElement.content, [key]: value } });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedElement) return;

    try {
      // 1. Get presigned URL from backend
      const response = await fetch('http://localhost:8000/api/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'  },
        body: JSON.stringify({ filename: file.name, filetype: file.type }),
      });
      
      if (!response.ok) throw new Error('Failed to get presigned URL');
      const { upload_url, public_url } = await response.json();

      // 2. Upload directly to Wasabi
      const uploadRes = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type , "x-amz-acl": "public-read" },
        body: file,
      });

      if (!uploadRes.ok) throw new Error('Failed to upload to S3');

      // 3. Update element content with the final public URL
      handleContentChange('url', public_url);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload image. Please check your connection and credentials.");
    }
    
    e.target.value = '';
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedElement) return;
    
    try {
      // 1. Get presigned URL from backend
      const response = await fetch('http://localhost:8000/api/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, filetype: file.type }),
      });
      
      if (!response.ok) throw new Error('Failed to get presigned URL');
      const { upload_url, public_url } = await response.json();

      // 2. Upload directly to Wasabi
      const uploadRes = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type , "x-amz-acl": "public-read" },
        body: file,
      });

      if (!uploadRes.ok) throw new Error('Failed to upload to S3');

      // 3. Update element content with the final public URL
      handleContentChange('url', public_url);
    } catch (err) {
      console.error("Video upload failed:", err);
      alert("Failed to upload video. Please check your connection and credentials.");
    }

    e.target.value = '';
  };

  // Table row/col helpers — call commands on the live Tiptap editor via ref
  const tableOp = (op: keyof EditorRef) => {
    if (!selectedElement) return;
    const ref = tableEditorRefs.get(selectedElement.id);
    if (ref) ref[op]();
  };

  return (
    <>
      <div className={`w-64 min-w-[200px] border-l border-gray-200 bg-white flex flex-col shrink-0 overflow-hidden transition-transform duration-300 z-50 ${
        selectedElement
          ? 'fixed inset-y-0 right-0 translate-x-0 h-full shadow-2xl md:relative md:translate-x-0'
          : 'hidden md:flex md:static'
      }`}>
        {/* ── Header ── */}
        <div className="h-12 border-b border-gray-200 flex items-center justify-between px-4 bg-gray-50">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-gray-700">
            <Settings2 size={16} />
            Properties
          </h2>
          {selectedElement && (
            <button onClick={() => selectElement(null)} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors" title="Close panel">
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {selectedElement ? (
            <div className="p-4 space-y-6">
              {/* ── Type badge + Delete ── */}
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase tracking-wider">{selectedElement.type}</span>
                <span className="text-xs text-gray-400">ID: {selectedElement.id.substring(0, 6)}</span>
                <button onClick={() => removeElement(selectedElement.id)} className="ml-auto flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors" title="Delete element (Del)">
                  <Trash2 size={12} />Delete
                </button>
              </div>

              {/* ──────────────── CONTENT ──────────────── */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-800 flex items-center gap-2"><Type size={14} /> Content</h3>

                {/* HEADING */}
                {selectedElement.type === 'heading' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Heading Level</label>
                      <select value={selectedElement.content.headingLevel || 'h1'} onChange={(e) => {
                        const level = e.target.value;
                        const sizeMap: Record<string, string> = { h1:'32px',h2:'28px',h3:'24px',h4:'20px',h5:'18px',h6:'16px' };
                        const weightMap: Record<string, string> = { h1:'700',h2:'700',h3:'700',h4:'700',h5:'600',h6:'600' };
                        updateElement(selectedElement.id, { content: { ...selectedElement.content, headingLevel: level }, styles: { ...selectedElement.styles, fontSize: sizeMap[level]||'16px', fontWeight: weightMap[level]||'400' } });
                      }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500">
                        <option value="h1">H1 — Heading 1 (32px)</option>
                        <option value="h2">H2 — Heading 2 (28px)</option>
                        <option value="h3">H3 — Heading 3 (24px)</option>
                        <option value="h4">H4 — Heading 4 (20px)</option>
                        <option value="h5">H5 — Heading 5 (18px)</option>
                        <option value="h6">H6 — Heading 6 (16px)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Heading Text</label>
                      <textarea value={selectedElement.content.text || ''} onChange={(e) => handleContentChange('text', e.target.value)} rows={2} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 resize-y" placeholder="Heading" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Font Family</label>
                      <select value={selectedElement.styles.fontFamily || 'Arial, sans-serif'} onChange={(e) => handleStyleChange('fontFamily', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500">
                        <option value="Arial, sans-serif">Arial</option>
                        <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
                        <option value="Georgia, serif">Georgia</option>
                        <option value="'Times New Roman', Times, serif">Times New Roman</option>
                        <option value="'Courier New', Courier, monospace">Courier New</option>
                        <option value="Verdana, Geneva, sans-serif">Verdana</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Text Alignment</label>
                      <div className="flex gap-1">
                        {(['left','center','right'] as const).map(align => (
                          <button key={align} onClick={() => handleStyleChange('textAlign', align)} className={`flex-1 py-1.5 text-xs font-medium rounded capitalize ${(selectedElement.styles.textAlign||'left')===align?'bg-indigo-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{align}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Text Color</label>
                      <div className="flex gap-1">
                        <input type="color" value={selectedElement.styles.color||'#000000'} onChange={(e) => handleStyleChange('color', e.target.value)} className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                        <input type="text" value={selectedElement.styles.color||'#000000'} onChange={(e) => handleStyleChange('color', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500" />
                      </div>
                    </div>
                  </div>
                )}

                {/* TEXT */}
                {selectedElement.type === 'text' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Text Content</label>
                      <textarea value={selectedElement.content.text || ''} onChange={(e) => handleContentChange('text', e.target.value)} rows={3} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 resize-y" placeholder="Your text here" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Formatting</label>
                      <div className="flex gap-1">
                        <button onClick={() => handleStyleChange('fontWeight', selectedElement.styles.fontWeight==='700'?'400':'700')} className={`flex-1 py-1.5 text-sm font-bold rounded ${selectedElement.styles.fontWeight==='700'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>B</button>
                        <button onClick={() => handleStyleChange('fontStyle', selectedElement.styles.fontStyle==='italic'?'normal':'italic')} className={`flex-1 py-1.5 text-sm italic rounded ${selectedElement.styles.fontStyle==='italic'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>I</button>
                        <button onClick={() => handleStyleChange('textDecoration', selectedElement.styles.textDecoration==='underline'?'none':'underline')} className={`flex-1 py-1.5 text-sm underline rounded ${selectedElement.styles.textDecoration==='underline'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>U</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Font Family</label>
                      <select value={selectedElement.styles.fontFamily||'Arial, sans-serif'} onChange={(e) => handleStyleChange('fontFamily', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500">
                        <option value="Arial, sans-serif">Arial</option>
                        <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
                        <option value="Georgia, serif">Georgia</option>
                        <option value="'Times New Roman', Times, serif">Times New Roman</option>
                        <option value="'Courier New', Courier, monospace">Courier New</option>
                        <option value="Verdana, Geneva, sans-serif">Verdana</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Font Size</label>
                      <input type="text" value={selectedElement.styles.fontSize||'16px'} onChange={(e) => handleStyleChange('fontSize', e.target.value)} placeholder="16px" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Text Alignment</label>
                      <div className="flex gap-1">
                        {(['left','center','right'] as const).map(align => (
                          <button key={align} onClick={() => handleStyleChange('textAlign', align)} className={`flex-1 py-1.5 text-xs font-medium rounded capitalize ${(selectedElement.styles.textAlign||'left')===align?'bg-indigo-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{align}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Text Color</label>
                      <div className="flex gap-1">
                        <input type="color" value={selectedElement.styles.color||'#333333'} onChange={(e) => handleStyleChange('color', e.target.value)} className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                        <input type="text" value={selectedElement.styles.color||'#333333'} onChange={(e) => handleStyleChange('color', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500" />
                      </div>
                    </div>
                  </div>
                )}

                {/* QR */}
                {selectedElement.type === 'qr' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">QR Data</label>
                      <textarea value={selectedElement.content.data||''} onChange={(e) => handleContentChange('data', e.target.value)} rows={3} placeholder="https://example.com" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 resize-y font-mono" />
                      <p className="text-xs text-amber-600 mt-1">💡 Use <code className="bg-amber-50 px-1 rounded text-amber-700 font-mono">{'${variable}'}</code> for dynamic QR</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="qr-transparent" checked={selectedElement.content.transparent??false} onChange={(e) => handleContentChange('transparent', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-indigo-600 cursor-pointer" />
                      <label htmlFor="qr-transparent" className="text-sm text-gray-700 cursor-pointer select-none">Transparent Background</label>
                    </div>
                  </div>
                )}

                {/* BUTTON */}
                {selectedElement.type === 'button' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Button Text</label>
                      <input type="text" value={selectedElement.content.text||''} onChange={(e) => handleContentChange('text', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Link URL</label>
                      <div className="flex items-center gap-1">
                        <Link size={12} className="text-gray-400 shrink-0" />
                        <input type="text" value={selectedElement.content.url||''} onChange={(e) => handleContentChange('url', e.target.value)} placeholder="https://example.com" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500" />
                      </div>
                    </div>
                  </div>
                )}

                {/* IMAGE */}
                {selectedElement.type === 'image' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Upload from Computer</label>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                      <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-300 rounded-md hover:border-indigo-400 hover:bg-indigo-50/30 text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                        <Upload size={16} />Choose Image File
                      </button>
                      {selectedElement.content.url?.startsWith('data:') && <p className="text-[10px] text-green-600 mt-1">✓ Local image loaded</p>}
                    </div>
                    <div className="flex items-center gap-2"><div className="flex-1 h-px bg-gray-200" /><span className="text-[10px] text-gray-400 uppercase tracking-wider">or URL</span><div className="flex-1 h-px bg-gray-200" /></div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Image URL</label>
                      <input type="text" value={selectedElement.content.url?.startsWith('data:')?'':(selectedElement.content.url||'')} onChange={(e) => handleContentChange('url', e.target.value)} placeholder="https://example.com/image.png" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Alt Text</label>
                      <input type="text" value={selectedElement.content.alt||''} onChange={(e) => handleContentChange('alt', e.target.value)} placeholder="Describe the image…" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    {selectedElement.content.url && <div className="border border-gray-200 rounded overflow-hidden"><img src={selectedElement.content.url} alt="" className="w-full h-auto max-h-32 object-contain bg-gray-50" /></div>}
                  </div>
                )}

                {selectedElement.type === 'video' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Upload Video</label>
                      <input ref={videoFileInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                      <button onClick={() => videoFileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-300 rounded-md hover:border-indigo-400 hover:bg-indigo-50/30 text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                        <Upload size={16} />Choose Video File
                      </button>
                      <p className="text-[9px] text-gray-400 mt-1 italic">Large videos are supported via Cloud Storage.</p>
                      {selectedElement.content.url?.includes('wasabisys.com') && <p className="text-[10px] text-green-600 mt-1">✓ Video uploaded to Cloud</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">or Link</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Video or YouTube URL</label>
                      <div className="flex items-center gap-1">
                        <Link size={12} className="text-gray-400 shrink-0" />
                        <input 
                          type="text" 
                          value={selectedElement.content.url?.startsWith('data:') ? '' : (selectedElement.content.url || '')} 
                          onChange={(e) => handleContentChange('url', e.target.value)} 
                          placeholder="https://youtube.com/... or .mp4 link" 
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500" 
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Supports YouTube, Vimeo, and direct MP4/WebM links.</p>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Fallback Thumbnail URL</label>
                      <input type="text" value={selectedElement.content.thumbnailUrl||''} onChange={(e) => handleContentChange('thumbnailUrl', e.target.value)} placeholder="https://example.com/thumb.jpg" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500" />
                      <p className="text-[10px] text-gray-400 mt-1">Displayed when no video is loaded.</p>
                    </div>
                  </div>
                )}

                {/* SPACER */}
                {selectedElement.type === 'spacer' && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Height</label>
                    <input type="text" value={selectedElement.content.height||'24px'} onChange={(e) => handleContentChange('height', e.target.value)} placeholder="24px" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500" />
                  </div>
                )}

                {/* ─── TABLE ─── */}
                {selectedElement.type === 'table' && (() => {
                  const isDynamic = selectedElement.content.isDynamic ?? false;
                  const tableVariables = useBuilderStore.getState().variables.filter(v => v.type === 'table');
                  const dataSourceVariable = selectedElement.content.dataSourceVariable || '';
                  const columnMappings: ColumnMapping[] = selectedElement.content.columnMappings || [];

                  const updateMapping = (idx: number, updates: Partial<ColumnMapping>) => {
                    const newMappings = [...columnMappings];
                    newMappings[idx] = { ...newMappings[idx], ...updates };
                    handleContentChange('columnMappings', newMappings);
                  };
                  const addMapping = () => {
                    handleContentChange('columnMappings', [
                      ...columnMappings,
                      { id: uuidv4(), header: `Column ${columnMappings.length + 1}`, type: 'data', dataKey: '', formula: '', footerAggregation: 'none' }
                    ]);
                  };
                  const removeMapping = (idx: number) => {
                    handleContentChange('columnMappings', columnMappings.filter((_, i) => i !== idx));
                  };

                  return (
                    <div className="space-y-4">
                      {/* Dynamic toggle */}
                      <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="tbl-dynamic"
                            checked={isDynamic}
                            onChange={(e) => {
                              handleContentChange('isDynamic', e.target.checked);
                              if (!e.target.checked) {
                                handleContentChange('dataSourceVariable', '');
                                handleContentChange('columnMappings', []);
                              }
                            }}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded cursor-pointer"
                          />
                          <label htmlFor="tbl-dynamic" className="text-sm font-semibold text-purple-800 cursor-pointer flex items-center gap-1.5">
                            <Database size={14} /> Dynamic Table
                          </label>
                        </div>
                        <p className="text-[10px] text-purple-600 mt-1.5 pl-6">
                          Powered by an array variable — generates one row per data item.
                        </p>
                      </div>

                      {/* Dynamic config */}
                      {isDynamic && (
                        <div className="space-y-4">
                          {/* Data source variable */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                              Data Source Variable
                            </label>
                            {tableVariables.length === 0 ? (
                              <div className="p-2.5 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                                No Table variables found. Go to the <strong>Variables</strong> tab and add a Table variable.
                              </div>
                            ) : (
                              <select
                                value={dataSourceVariable}
                                onChange={(e) => handleContentChange('dataSourceVariable', e.target.value)}
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-purple-500"
                              >
                                <option value="">— Select a table variable —</option>
                                {tableVariables.map(v => (
                                  <option key={v.id} value={v.name}>{v.name}</option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Column mappings */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                Column Mappings
                              </label>
                              <button
                                onClick={addMapping}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-purple-100 text-purple-700 hover:bg-purple-200 rounded transition-colors"
                              >
                                <Plus size={10} /> Add Column
                              </button>
                            </div>

                            {columnMappings.length === 0 && (
                              <div className="text-xs text-gray-400 italic text-center py-3 border border-dashed border-gray-200 rounded">
                                No columns yet. Click + Add Column.
                              </div>
                            )}

                            <div className="space-y-2">
                              {columnMappings.map((col, idx) => (
                                <ColumnMappingRow
                                  key={col.id}
                                  col={col}
                                  idx={idx}
                                  onUpdate={(updates) => updateMapping(idx, updates)}
                                  onRemove={() => removeMapping(idx)}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Static table controls — hidden when dynamic */}
                      {!isDynamic && (
                        <>
                          <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-100 text-[11px] text-indigo-700 leading-relaxed">
                            <strong>Click a cell</strong> to edit. A formatting toolbar appears above the selection.
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Table Styling</label>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 w-20 shrink-0">Border</span>
                                <input type="color" value={selectedElement.content.borderColor||'#e5e7eb'} onChange={(e) => handleContentChange('borderColor', e.target.value)} className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                                <input type="text" value={selectedElement.content.borderColor||'#e5e7eb'} onChange={(e) => handleContentChange('borderColor', e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500" />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 w-20 shrink-0">Header BG</span>
                                <input type="color" value={selectedElement.content.headerBg||'#f9fafb'} onChange={(e) => handleContentChange('headerBg', e.target.value)} className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                                <input type="text" value={selectedElement.content.headerBg||'#f9fafb'} onChange={(e) => handleContentChange('headerBg', e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500" />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 w-20 shrink-0">Cell Padding</span>
                                <input type="text" value={selectedElement.content.cellPadding||'10px 12px'} onChange={(e) => handleContentChange('cellPadding', e.target.value)} placeholder="10px 12px" className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500" />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Row &amp; Column Operations</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => tableOp('addRowAfter')} className="flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 text-xs text-gray-600 hover:text-indigo-700 transition-all"><Plus size={12} /> Row</button>
                              <button onClick={() => tableOp('deleteRow')} className="flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 text-xs text-gray-600 hover:text-red-700 transition-all"><Minus size={12} /> Row</button>
                              <button onClick={() => tableOp('addColumnAfter')} className="flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 text-xs text-gray-600 hover:text-indigo-700 transition-all"><Plus size={12} /> Column</button>
                              <button onClick={() => tableOp('deleteColumn')} className="flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 text-xs text-gray-600 hover:text-red-700 transition-all"><Minus size={12} /> Column</button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" id="table-stripe" checked={selectedElement.content.striped??false} onChange={(e) => handleContentChange('striped', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
                              <label htmlFor="table-stripe" className="text-sm text-gray-700 select-none cursor-pointer">Alternate row colors</label>
                            </div>
                            {selectedElement.content.striped && (
                              <div className="flex items-center gap-2 pl-6">
                                <span className="text-xs text-gray-600 w-16 shrink-0">Stripe</span>
                                <input type="color" value={selectedElement.content.stripeColor||'#fafafa'} onChange={(e) => handleContentChange('stripeColor', e.target.value)} className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                                <input type="text" value={selectedElement.content.stripeColor||'#fafafa'} onChange={(e) => handleContentChange('stripeColor', e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500" />
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}


                {/* HTML */}
                {selectedElement.type === 'html' && (
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-600 mb-1">HTML Source Code</label>
                    <div className="border border-gray-300 rounded overflow-hidden">
                      <Editor
                        height="220px"
                        defaultLanguage="html"
                        value={selectedElement.content.code || ''}
                        onChange={(value) => handleContentChange('code', value)}
                        options={{ minimap:{enabled:false}, fontSize:12, wordWrap:'on', scrollBeyondLastLine:false, padding:{top:8,bottom:8}, lineNumbers:'on', formatOnType:true }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ──────────────── SIZE ──────────────── */}
              {['button','image','video','table','text','html'].includes(selectedElement.type) && (
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-800 flex items-center gap-2"><Layout size={14} /> Size</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Width</label>
                      <input type="text" value={selectedElement.styles.width||''} onChange={(e) => handleStyleChange('width', e.target.value)} placeholder="200px" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    {['button','image','video','table'].includes(selectedElement.type) ? (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Height</label>
                        <input type="text" value={selectedElement.styles.height||''} onChange={(e) => handleStyleChange('height', e.target.value)} placeholder="auto" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500" />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Height</label>
                        <div className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-400 bg-gray-50">Auto (by content)</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ──────────────── STYLING ──────────────── */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-800 flex items-center gap-2"><PaintBucket size={14} /> Styling</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['text','button'].includes(selectedElement.type) && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Font Size</label>
                      <input type="text" value={selectedElement.styles.fontSize||''} onChange={(e) => handleStyleChange('fontSize', e.target.value)} placeholder="16px" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                    </div>
                  )}
                  {['text','button'].includes(selectedElement.type) && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Color</label>
                      <div className="flex gap-1">
                        <input type="color" value={selectedElement.styles.color||'#000000'} onChange={(e) => handleStyleChange('color', e.target.value)} className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                        <input type="text" value={selectedElement.styles.color||''} onChange={(e) => handleStyleChange('color', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" />
                      </div>
                    </div>
                  )}
                  {!['divider','spacer','table'].includes(selectedElement.type) && (
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Background Color</label>
                      <div className="flex gap-1">
                        <input type="color" value={selectedElement.styles.backgroundColor||'#ffffff'} onChange={(e) => handleStyleChange('backgroundColor', e.target.value)} className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                        <input type="text" value={selectedElement.styles.backgroundColor||''} onChange={(e) => handleStyleChange('backgroundColor', e.target.value)} placeholder="Transparent" className="w-full border border-gray-300 rounded px-2 py-1 text-xs" />
                      </div>
                    </div>
                  )}
                  {selectedElement.type === 'button' && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Border Radius</label>
                      <input type="text" value={selectedElement.styles.borderRadius||''} onChange={(e) => handleStyleChange('borderRadius', e.target.value)} placeholder="4px" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                    </div>
                  )}
                  {selectedElement.type === 'divider' && (
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Line Color</label>
                      <div className="flex gap-1">
                        <input type="color" value={selectedElement.styles.borderColor||'#e5e7eb'} onChange={(e) => handleStyleChange('borderColor', e.target.value)} className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                        <input type="text" value={selectedElement.styles.borderColor||''} onChange={(e) => handleStyleChange('borderColor', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Layout size={10} /> Spacing</h4>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Padding</label>
                    <input type="text" value={selectedElement.styles.padding||''} onChange={(e) => handleStyleChange('padding', e.target.value)} placeholder="10px" className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── Canvas Settings ── */
            <div className="p-4 space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase tracking-wider">Document</span>
                <span className="text-xs text-gray-400">Canvas Settings</span>
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-800 flex items-center gap-2"><Layout size={14} /> Page Size</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Width</label>
                    <input type="text" value={useBuilderStore.getState().canvasSettings.width} onChange={(e) => useBuilderStore.getState().updateCanvasSettings({ width: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Height</label>
                    <input type="text" value={useBuilderStore.getState().canvasSettings.height} onChange={(e) => useBuilderStore.getState().updateCanvasSettings({ height: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {[{label:'A4',w:'794px',h:'1123px'},{label:'Letter',w:'816px',h:'1056px'},{label:'Square',w:'800px',h:'800px'},{label:'Mobile',w:'375px',h:'812px'}].map(p => (
                    <button key={p.label} onClick={() => useBuilderStore.getState().updateCanvasSettings({ width: p.w, height: p.h })} className="px-2 py-1 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded">{p.label}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-800 flex items-center gap-2"><PaintBucket size={14} /> Background</h3>
                <div className="flex gap-1">
                  <input type="color" value={useBuilderStore.getState().canvasSettings.backgroundColor} onChange={(e) => useBuilderStore.getState().updateCanvasSettings({ backgroundColor: e.target.value })} className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                  <input type="text" value={useBuilderStore.getState().canvasSettings.backgroundColor} onChange={(e) => useBuilderStore.getState().updateCanvasSettings({ backgroundColor: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>
              {/* <div className="pt-4">
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <p className="text-[11px] text-indigo-700 leading-relaxed"><strong>Pro Tip:</strong> These settings apply to the entire document. When you export to PDF, the page size will match these dimensions.</p>
                </div>
              </div> */}
            </div>
          )}
        </div>
      </div>

      {selectedElement && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200" onClick={() => selectElement(null)} />
      )}
    </>
  );
};