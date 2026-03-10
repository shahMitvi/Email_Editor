import { useRef, useEffect } from 'react';
import { useBuilderStore } from '../../store/useBuilderStore';
import {
  Settings2, Type, PaintBucket, Layout,
  Upload, Link, X, Trash2,
} from 'lucide-react';
import Editor from '@monaco-editor/react';

export const RightSidebar = () => {
  const { selectedId, pages, updateElement, selectElement, removeElement } = useBuilderStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedElement = pages.flatMap(p => p.elements).find((el) => el.id === selectedId);

  // Delete key shortcut — Delete or Backspace removes selected element
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Only trigger when not typing in an input/textarea/select
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
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

  // Convert file to base64 data URL and set as image src
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedElement) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      handleContentChange('url', ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    // reset so same file can be picked again
    e.target.value = '';
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
          <button
            onClick={() => selectElement(null)}
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            title="Close panel"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {selectedElement ? (
          <div className="p-4 space-y-6">
            {/* ── Type badge + Delete button ── */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase tracking-wider">
                {selectedElement.type}
              </span>
              <span className="text-xs text-gray-400">ID: {selectedElement.id.substring(0, 6)}</span>
              <button
                onClick={() => removeElement(selectedElement.id)}
                className="ml-auto flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                title="Delete element (Del)"
              >
                <Trash2 size={12} />
                Delete
              </button>
            </div>

            {/* ──────────────────────── CONTENT ──────────────────────── */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-800 flex items-center gap-2">
                <Type size={14} /> Content
              </h3>

              {/* HEADING – heading level editor (H1-H6) */}
              {selectedElement.type === 'heading' && (
                <div className="space-y-3">
                  {/* Heading Level */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Heading Level</label>
                    <select
                      value={selectedElement.content.headingLevel || 'h1'}
                      onChange={(e) => {
                        const level = e.target.value;
                        const sizeMap: Record<string, string> = {
                          h1: '32px', h2: '28px', h3: '24px',
                          h4: '20px', h5: '18px', h6: '16px',
                        };
                        const weightMap: Record<string, string> = {
                          h1: '700', h2: '700', h3: '700',
                          h4: '700', h5: '600', h6: '600',
                        };
                        // Single atomic update — prevents stale closure overwrite
                        updateElement(selectedElement.id, {
                          content: { ...selectedElement.content, headingLevel: level },
                          styles:  { ...selectedElement.styles,
                            fontSize:   sizeMap[level]   || '16px',
                            fontWeight: weightMap[level] || '400',
                          },
                        });
                      }}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="h1">H1 — Heading 1 (32px)</option>
                      <option value="h2">H2 — Heading 2 (28px)</option>
                      <option value="h3">H3 — Heading 3 (24px)</option>
                      <option value="h4">H4 — Heading 4 (20px)</option>
                      <option value="h5">H5 — Heading 5 (18px)</option>
                      <option value="h6">H6 — Heading 6 (16px)</option>
                    </select>
                  </div>

                  {/* Heading text */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Heading Text</label>
                    <input
                      type="text"
                      value={selectedElement.content.text || ''}
                      onChange={(e) => handleContentChange('text', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Heading"
                    />
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Font Family</label>
                    <select
                      value={selectedElement.styles.fontFamily || 'Arial, sans-serif'}
                      onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
                      <option value="Georgia, serif">Georgia</option>
                      <option value="'Times New Roman', Times, serif">Times New Roman</option>
                      <option value="'Courier New', Courier, monospace">Courier New</option>
                      <option value="Verdana, Geneva, sans-serif">Verdana</option>
                      <option value="Trebuchet MS, sans-serif">Trebuchet MS</option>
                    </select>
                  </div>

                  {/* Text Alignment */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Text Alignment</label>
                    <div className="flex gap-1">
                      {(['left', 'center', 'right'] as const).map((align) => (
                        <button
                          key={align}
                          onClick={() => handleStyleChange('textAlign', align)}
                          className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors capitalize ${
                            (selectedElement.styles.textAlign || 'left') === align
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {align.charAt(0).toUpperCase() + align.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Color */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Text Color</label>
                    <div className="flex gap-1">
                      <input
                        type="color"
                        value={selectedElement.styles.color || '#000000'}
                        onChange={(e) => handleStyleChange('color', e.target.value)}
                        className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0"
                      />
                      <input
                        type="text"
                        value={selectedElement.styles.color || '#000000'}
                        onChange={(e) => handleStyleChange('color', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TEXT – simple paragraph editor with bold/italic/underline */}
              {selectedElement.type === 'text' && (
                <div className="space-y-3">
                  {/* Text content */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Text Content</label>
                    <textarea
                      value={selectedElement.content.text || ''}
                      onChange={(e) => handleContentChange('text', e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                      placeholder="Your text here"
                    />
                  </div>

                  {/* Bold / Italic / Underline toggles */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Formatting</label>
                    <div className="flex gap-1">
                      {/* Bold */}
                      <button
                        onClick={() => handleStyleChange(
                          'fontWeight',
                          selectedElement.styles.fontWeight === '700' ? '400' : '700'
                        )}
                        className={`flex-1 py-1.5 text-sm font-bold rounded transition-colors ${
                          selectedElement.styles.fontWeight === '700'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        B
                      </button>
                      {/* Italic */}
                      <button
                        onClick={() => handleStyleChange(
                          'fontStyle',
                          selectedElement.styles.fontStyle === 'italic' ? 'normal' : 'italic'
                        )}
                        className={`flex-1 py-1.5 text-sm italic rounded transition-colors ${
                          selectedElement.styles.fontStyle === 'italic'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        I
                      </button>
                      {/* Underline */}
                      <button
                        onClick={() => handleStyleChange(
                          'textDecoration',
                          selectedElement.styles.textDecoration === 'underline' ? 'none' : 'underline'
                        )}
                        className={`flex-1 py-1.5 text-sm underline rounded transition-colors ${
                          selectedElement.styles.textDecoration === 'underline'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        U
                      </button>
                    </div>
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Font Family</label>
                    <select
                      value={selectedElement.styles.fontFamily || 'Arial, sans-serif'}
                      onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
                      <option value="Georgia, serif">Georgia</option>
                      <option value="'Times New Roman', Times, serif">Times New Roman</option>
                      <option value="'Courier New', Courier, monospace">Courier New</option>
                      <option value="Verdana, Geneva, sans-serif">Verdana</option>
                      <option value="Trebuchet MS, sans-serif">Trebuchet MS</option>
                    </select>
                  </div>

                  {/* Font Size */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Font Size</label>
                    <input
                      type="text"
                      value={selectedElement.styles.fontSize || '16px'}
                      onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                      placeholder="16px"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {/* Text Alignment */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Text Alignment</label>
                    <div className="flex gap-1">
                      {(['left', 'center', 'right'] as const).map((align) => (
                        <button
                          key={align}
                          onClick={() => handleStyleChange('textAlign', align)}
                          className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors capitalize ${
                            (selectedElement.styles.textAlign || 'left') === align
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {align.charAt(0).toUpperCase() + align.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Color */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Text Color</label>
                    <div className="flex gap-1">
                      <input
                        type="color"
                        value={selectedElement.styles.color || '#333333'}
                        onChange={(e) => handleStyleChange('color', e.target.value)}
                        className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0"
                      />
                      <input
                        type="text"
                        value={selectedElement.styles.color || '#333333'}
                        onChange={(e) => handleStyleChange('color', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* QR CODE */}
              {selectedElement.type === 'qr' && (
                <div className="space-y-3">
                  {/* QR Data */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">QR Data</label>
                    </div>
                    <textarea
                      value={selectedElement.content.data || ''}
                      onChange={(e) => handleContentChange('data', e.target.value)}
                      rows={3}
                      placeholder="https://example.com"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-y font-mono"
                    />
                    {/* Dynamic variable hint */}
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <span>💡</span>
                      Use <code className="bg-amber-50 px-1 rounded text-amber-700 font-mono">{'${variable}'}</code> for dynamic QR codes
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      e.g. <span className="font-mono text-gray-500">https://app.com/ticket?id={'${ticket_id}'}</span>
                    </p>
                  </div>

                  {/* Transparent Background */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="qr-transparent"
                      checked={selectedElement.content.transparent ?? false}
                      onChange={(e) => handleContentChange('transparent', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 cursor-pointer"
                    />
                    <label htmlFor="qr-transparent" className="text-sm text-gray-700 cursor-pointer select-none">
                      Transparent Background
                    </label>
                  </div>
                </div>
              )}

              {/* BUTTON */}
              {selectedElement.type === 'button' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Button Text</label>
                    <input
                      type="text"
                      value={selectedElement.content.text || ''}
                      onChange={(e) => handleContentChange('text', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Link URL</label>
                    <div className="flex items-center gap-1">
                      <Link size={12} className="text-gray-400 shrink-0" />
                      <input
                        type="text"
                        value={selectedElement.content.url || ''}
                        onChange={(e) => handleContentChange('url', e.target.value)}
                        placeholder="https://example.com"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* IMAGE – file upload + URL */}
              {selectedElement.type === 'image' && (
                <div className="space-y-3">
                  {/* Upload from computer */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Upload from Computer</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-300 rounded-md hover:border-indigo-400 hover:bg-indigo-50/30 text-sm text-gray-600 hover:text-indigo-600 transition-colors"
                    >
                      <Upload size={16} />
                      Choose Image File
                    </button>
                    {selectedElement.content.url?.startsWith('data:') && (
                      <p className="text-[10px] text-green-600 mt-1">✓ Local image loaded</p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">or URL</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* Image URL */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Image URL</label>
                    <input
                      type="text"
                      value={selectedElement.content.url?.startsWith('data:') ? '' : (selectedElement.content.url || '')}
                      onChange={(e) => handleContentChange('url', e.target.value)}
                      placeholder="https://example.com/image.png"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {/* Alt Text */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Alt Text</label>
                    <input
                      type="text"
                      value={selectedElement.content.alt || ''}
                      onChange={(e) => handleContentChange('alt', e.target.value)}
                      placeholder="Describe the image…"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {/* Preview */}
                  {selectedElement.content.url && (
                    <div className="border border-gray-200 rounded overflow-hidden">
                      <img
                        src={selectedElement.content.url}
                        alt={selectedElement.content.alt || 'Preview'}
                        className="w-full h-auto max-h-32 object-contain bg-gray-50"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* VIDEO */}
              {selectedElement.type === 'video' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Video URL</label>
                    <input
                      type="text"
                      value={selectedElement.content.url || ''}
                      onChange={(e) => handleContentChange('url', e.target.value)}
                      placeholder="https://youtube.com/watch?v=…"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Thumbnail URL</label>
                    <input
                      type="text"
                      value={selectedElement.content.thumbnailUrl || ''}
                      onChange={(e) => handleContentChange('thumbnailUrl', e.target.value)}
                      placeholder="https://example.com/thumb.jpg"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* SPACER */}
              {selectedElement.type === 'spacer' && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Height</label>
                  <input
                    type="text"
                    value={selectedElement.content.height || '24px'}
                    onChange={(e) => handleContentChange('height', e.target.value)}
                    placeholder="24px"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}

              {/* TABLE */}
              {selectedElement.type === 'table' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Rows</label>
                    <input
                      type="number"
                      min="1"
                      value={selectedElement.content.rows || 2}
                      onChange={(e) => handleContentChange('rows', parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Columns</label>
                    <input
                      type="number"
                      min="1"
                      value={selectedElement.content.cols || 2}
                      onChange={(e) => handleContentChange('cols', parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hasHeader"
                      checked={selectedElement.content.hasHeader || false}
                      onChange={(e) => handleContentChange('hasHeader', e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="hasHeader" className="text-xs text-gray-600 cursor-pointer">Has Header Row</label>
                  </div>
                </div>
              )}

              {/* HTML – Monaco Editor */}
              {selectedElement.type === 'html' && (
                <div className="space-y-2">
                  <label className="block text-xs text-gray-600 mb-1">HTML Source Code</label>
                  <div className="border border-gray-300 rounded overflow-hidden">
                    <Editor
                      height="220px"
                      defaultLanguage="html"
                      value={selectedElement.content.code || ''}
                      onChange={(value) => handleContentChange('code', value)}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 12,
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                        padding: { top: 8, bottom: 8 },
                        lineNumbers: 'on',
                        formatOnType: true,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ──────────────────────── SIZE ──────────────────────── */}
            {['button', 'image', 'video', 'table', 'text', 'html'].includes(selectedElement.type) && (
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-800 flex items-center gap-2">
                  <Layout size={14} /> Size
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Width — all elements */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Width</label>
                    <input
                      type="text"
                      value={selectedElement.styles.width || ''}
                      onChange={(e) => handleStyleChange('width', e.target.value)}
                      placeholder="200px"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {/* Height — only for elements that can have explicit height */}
                  {['button', 'image', 'video', 'table'].includes(selectedElement.type) ? (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Height</label>
                      <input
                        type="text"
                        value={selectedElement.styles.height || ''}
                        onChange={(e) => handleStyleChange('height', e.target.value)}
                        placeholder="auto"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Height</label>
                      <div className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-400 bg-gray-50 select-none">
                        Auto (by content)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ──────────────────────── STYLING ──────────────────────── */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-800 flex items-center gap-2">
                <PaintBucket size={14} /> Styling
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* Font size – for text / button */}
                {['text', 'button'].includes(selectedElement.type) && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Font Size</label>
                    <input
                      type="text"
                      value={selectedElement.styles.fontSize || ''}
                      onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                      placeholder="16px"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                )}

                {/* Text Color */}
                {['text', 'button'].includes(selectedElement.type) && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Color</label>
                    <div className="flex gap-1">
                      <input
                        type="color"
                        value={selectedElement.styles.color || '#000000'}
                        onChange={(e) => handleStyleChange('color', e.target.value)}
                        className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0"
                      />
                      <input
                        type="text"
                        value={selectedElement.styles.color || ''}
                        onChange={(e) => handleStyleChange('color', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Background color – button */}
                {selectedElement.type === 'button' && (
                  <>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Background Color</label>
                      <div className="flex gap-1">
                        <input
                          type="color"
                          value={selectedElement.styles.backgroundColor || '#4f46e5'}
                          onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                          className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0"
                        />
                        <input
                          type="text"
                          value={selectedElement.styles.backgroundColor || ''}
                          onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Border Radius</label>
                      <input
                        type="text"
                        value={selectedElement.styles.borderRadius || ''}
                        onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
                        placeholder="4px"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      />
                    </div>
                  </>
                )}

                {/* Divider color */}
                {selectedElement.type === 'divider' && (
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">Line Color</label>
                    <div className="flex gap-1">
                      <input
                        type="color"
                        value={selectedElement.styles.borderColor || '#e5e7eb'}
                        onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                        className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0"
                      />
                      <input
                        type="text"
                        value={selectedElement.styles.borderColor || ''}
                        onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Spacing */}
              <div className="mt-2">
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Layout size={10} /> Spacing
                </h4>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Padding</label>
                  <input
                    type="text"
                    value={selectedElement.styles.padding || ''}
                    onChange={(e) => handleStyleChange('padding', e.target.value)}
                    placeholder="10px"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>


          </div>
        ) : (
          /* ── Empty state ── */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <Settings2 size={32} className="mb-3 opacity-20" />
            <p className="text-sm font-medium text-gray-500">No element selected</p>
            <p className="text-xs mt-1 max-w-[180px] leading-relaxed">
              Click on any element on the canvas to edit its properties here.
            </p>
          </div>
        )}
      </div>
      </div>
      
      {/* Mobile Backdrop */}
      {selectedElement && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => selectElement(null)}
        />
      )}
    </>
  );
};
