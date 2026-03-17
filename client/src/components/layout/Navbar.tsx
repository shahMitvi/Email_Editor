import { useState, useEffect } from 'react';
import { Send, LayoutGrid, Layers, Undo, Redo, Eye, Save, Check, X, Menu, FileText, Database, ChevronDown, Plus } from 'lucide-react';
import { useBuilderStore, useTemporalStore } from '../../store/useBuilderStore';
import { downloadHtmlFile } from '../../utils/exportHtml';
import { PreviewModal } from '../builder/PreviewModal';
import { mapStateToDBPayload } from '../../utils/mapper';
import { buildEmailHtml } from '../../utils/exportHtml';

export const Navbar = () => {
  const { 
    activeTab, setActiveTab, pages, setShowMobileMenu, 
    templateId, setTemplateId, 
    filename, setFilename,
    _hasHydrated, resetBuilder
  } = useBuilderStore();
  const totalElements = pages.reduce((sum, p) => sum + p.elements.length, 0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Sync templateId with URL
  useEffect(() => {
    const url = new URL(window.location.href);
    if (templateId) {
      url.searchParams.set('id', templateId);
    } else {
      url.searchParams.delete('id');
    }
    window.history.replaceState({}, '', url);
  }, [templateId]);

  // Load template if ID in URL
  useEffect(() => {
    const fetchTemplate = async (id: string) => {
      try {
        const res = await fetch(`http://localhost:8000/api/get-template/${id}`);
        if (res.ok) {
          const data = await res.json();
          // Map data to store state
          // Note: Since we use persisted store, we must be careful not to overwrite
          // But if ID is in URL, we want to load that specific one.
          const store = useBuilderStore.getState();
          store.setTemplateId(id);
          store.setFilename(data.name || 'email');
          
          if (data.contentJSON && data.contentJSON.pages) {
             useBuilderStore.setState({ 
               pages: data.contentJSON.pages,
               variables: data.variable || [],
               canvasSettings: data.globalSettings || store.canvasSettings
             });
          }
        }
      } catch (err) {
        console.error("Failed to load template from URL:", err);
      }
    };

    if (_hasHydrated) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlId = urlParams.get('id');
      if (urlId && urlId !== templateId) {
        fetchTemplate(urlId);
      }
    }
  }, [_hasHydrated]); // Only run after store has hydrated

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
          setTimeout(() => setSavedFeedback(false), 3000);
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

  const handleNewFile = () => {
    if (confirm("Are you sure you want to start a new file? Unsaved changes will be lost.")) {
      resetBuilder();
    }
  };


  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      let currentId = templateId;
      if (!currentId) {
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
      setShowExportMenu(false);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Error exporting PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportHTML = () => {
    const { pages, variables, canvasSettings } = useBuilderStore.getState();
    const name = filename.trim() || 'email';
    downloadHtmlFile(pages, variables, name, name, canvasSettings);
    setShowExportMenu(false);
  };

  return (
    <>
      {/* ── Full-screen Preview ── */}
      {showPreview && (
        <PreviewModal pages={pages} onClose={() => setShowPreview(false)} />
      )}
      <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-2 sm:px-4 z-[100] shrink-0 shadow-sm relative">
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
            onClick={handleNewFile}
            className="flex items-center justify-center p-2 md:px-3 md:py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            title="New File"
          >
            <Plus size={16} />
            <span className="hidden md:inline ml-2">New</span>
          </button>
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
          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={totalElements === 0 || isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-40"
              title="Export options"
            >
              <FileText size={16} />
              <span className="hidden md:inline">Export</span>
              <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowExportMenu(false)} 
                />
                <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-200 rounded-lg shadow-xl z-[110] overflow-visible animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={handleExportHTML}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100 whitespace-nowrap"
                  >
                    <div className="w-8 h-8 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                      <Send size={14} />
                    </div>
                    <span>Download HTML</span>
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    <div className="w-8 h-8 rounded-md bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                      <FileText size={14} />
                    </div>
                    <span>{isExporting ? 'Exporting PDF...' : 'Download PDF'}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={templateId ? () => handleSave() : () => setShowSaveModal(true)}
            disabled={totalElements === 0}
            className={`flex items-center justify-center p-2 md:px-3 md:py-1.5 text-sm font-medium rounded-md transition-all ${
              savedFeedback
                ? 'bg-green-600 text-white'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={templateId ? "Update Template" : "Save Template"}
          >
            {savedFeedback ? <Check size={16} /> : <Save size={16} />}
            <span className="hidden md:inline ml-2">
              {savedFeedback ? 'Saved!' : (templateId ? 'Update' : 'Save')}
            </span>
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
