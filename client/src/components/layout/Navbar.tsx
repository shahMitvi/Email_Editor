import { useState } from 'react';
import { Send, LayoutGrid, Layers, Undo, Redo, Eye, Save, Check, X, Menu, FileText, Database } from 'lucide-react';
import { useBuilderStore, useTemporalStore } from '../../store/useBuilderStore';
import { downloadHtmlFile } from '../../utils/exportHtml';
import { PreviewModal } from '../builder/PreviewModal';
import { mapStateToDBPayload } from '../../utils/mapper';
import { buildEmailHtml } from '../../utils/exportHtml';

export const Navbar = () => {
  const { activeTab, setActiveTab, pages, setShowMobileMenu } = useBuilderStore();
  const totalElements = pages.reduce((sum, p) => sum + p.elements.length, 0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [filename, setFilename] = useState('email');
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [isGeneratePdf, setIsGeneratedPdf] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  // Undo/Redo state from zundo directly via getState()
  const temporalState = useTemporalStore?.getState?.() || { pastStates: [], futureStates: [], undo: () => {}, redo: () => {} };
  const { undo, redo, pastStates, futureStates } = temporalState;

  const handleSave = async (silent = false) => {
    const { pages, variables, canvasSettings } = useBuilderStore.getState();
    const name = filename.trim() || 'email';
    const baseHtml = buildEmailHtml(pages, variables, name, true, canvasSettings);
    const dbPayload = mapStateToDBPayload(useBuilderStore.getState(), name);
    const payload = { ...dbPayload, base_html: baseHtml };
    
    try {
      const url = templateId 
        ? `http://localhost:8000/api/save-templates?template_id=${templateId}`
        : "http://localhost:8000/api/save-templates";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const newId = data._id;
        setTemplateId(newId);
        
        if (!silent) {
          setSavedFeedback(true);
          // Trigger local download
          downloadHtmlFile(pages, variables, name, name, canvasSettings);
          setTimeout(() => setSavedFeedback(false), 2000);
          setShowSaveModal(false);
        }
        return newId;
      } else {
        if (!silent) alert("Failed to save template.");
        return null;
      }
    } catch (error) {
      console.error("Save error:", error);
      return null;
    }
  };


  const handleExportPDF = async () => {
    setIsGeneratedPdf(true);
    try {
      let currentId = templateId;
      if (!currentId) {
        // Force save first
        currentId = await handleSave(true);
      }

      if (!currentId) {
        throw new Error("Cannot generate PDF without saving template first.");
      }

      const response = await fetch("http://localhost:8000/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: currentId })
      });

      if (!response.ok) throw new Error("Could not generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename.trim() || 'email'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Error exporting PDF");
    } finally {
      setIsGeneratedPdf(false);
    }
  };

  return (
    <>
      {/* ── Full-screen Preview ── */}
      {showPreview && (
        <PreviewModal pages={pages} onClose={() => setShowPreview(false)} />
      )}
      <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-2 sm:px-4 z-10 shrink-0 shadow-sm relative">
        {/* Left: Mobile Toggle & Logo */}
        <div className="flex items-center gap-2 w-1/4 min-w-max">
          <button
            onClick={() => setShowMobileMenu(true)}
            className="md:hidden p-1.5 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-600 hidden sm:block delay-75" />
            <span className="font-semibold text-gray-800 text-base md:text-lg tracking-tight">EmailBuilder</span>
          </div>
        </div>

        {/* Center Tabs */}
        <div className="flex h-full items-end justify-center w-2/4 md:flex-1 absolute md:static left-1/2 -translate-x-1/2 md:translate-x-0">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-3 md:px-6 py-4 text-xs md:text-sm font-semibold flex items-center gap-1.5 md:gap-2 border-b-2 transition-colors ${activeTab === 'content' ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
          >
            <LayoutGrid size={16} className="shrink-0" />
            <span className="hidden sm:inline">CONTENT</span>
          </button>
          <button
            onClick={() => setActiveTab('layers')}
            className={`px-3 md:px-6 py-4 text-xs md:text-sm font-semibold flex items-center gap-1.5 md:gap-2 border-b-2 transition-colors ${activeTab === 'layers' ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
          >
            <Layers size={16} className="shrink-0" />
            <span className="hidden sm:inline">LAYERS</span>
          </button>
          <button
            onClick={() => setActiveTab('personalize')}
            className={`px-3 md:px-6 py-4 text-xs md:text-sm font-semibold flex items-center gap-1.5 md:gap-2 border-b-2 transition-colors ${activeTab === 'personalize' ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
          >
            <Database size={16} className="shrink-0" />
            <span className="hidden md:inline">Variable</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center justify-end gap-1 md:gap-2 w-1/4 shrink-0 min-w-max">
          <button 
            onClick={() => undo()}
            disabled={pastStates.length === 0}
            className="hidden sm:block p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo size={16} className="md:w-[18px] md:h-[18px]" />
          </button>
          <button 
            onClick={() => redo()}
            disabled={futureStates.length === 0}
            className="hidden sm:block p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo size={16} className="md:w-[18px] md:h-[18px]" />
          </button>
          <button
            onClick={() => setShowPreview(true)}
            disabled={totalElements === 0}
            className="flex items-center justify-center p-2 md:px-3 md:py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Preview"
          >
            <Eye size={16} />
            <span className="hidden md:inline ml-2">Preview</span>
          </button>
          {/*Export PDF Button */}

          <button 
            onClick={handleExportPDF}
            disabled={totalElements === 0 || isGeneratePdf}
            className='flex items-center justify-center p-2 md:px-3 md:py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
            title='Export  as PDF'>
              <FileText size={16} />
              <span className='hidden md:inline ml-2'>{isGeneratePdf ? 'Generating...': 'Export PDF'}</span>
            </button>
          {/* Save button */}
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={totalElements === 0}
            className={`flex items-center justify-center p-2 md:px-3 md:py-1.5 text-sm font-medium rounded-md transition-all ${
              savedFeedback
                ? 'bg-green-600 text-white'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title="Save HTML"
          >
            {savedFeedback ? <Check size={16} /> : <Save size={16} />}
            <span className="hidden md:inline ml-2">{savedFeedback ? 'Saved!' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* ── Save Modal ── */}
      {showSaveModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSaveModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-[400px] p-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Save as HTML File</h2>
                <p className="text-xs text-gray-500 mt-0.5">Downloads as a production-ready email HTML file</p>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filename input */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">File name</label>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveModal(false); }}
                  autoFocus
                  className="flex-1 px-3 py-2.5 text-sm outline-none bg-white text-gray-900 placeholder:text-gray-400"
                  placeholder="my-email-template"
                />
                <span className="px-3 py-2.5 bg-gray-50 border-l border-gray-300 text-sm text-gray-500 shrink-0 font-mono">
                  .html
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="mb-5 flex items-start gap-2.5 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-xs text-blue-700 font-medium">Email-compatible HTML</p>
                <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
                  Generates a full inline-styled HTML document using table-based layout — compatible with Gmail, Outlook, Apple Mail and other major clients.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave()}
                disabled={!filename.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={15} />
                Save as {filename.trim() || 'email'}.html
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
