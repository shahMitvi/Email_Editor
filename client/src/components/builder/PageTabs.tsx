import { useState, useRef, useEffect } from 'react';
import { useBuilderStore } from '../../store/useBuilderStore';
import { Plus, X, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

export const PageTabs = () => {
  const { pages, currentPageId, addPage, deletePage, renamePage, setCurrentPage } = useBuilderStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const tabBarRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    const activeTab = tabBarRef.current?.querySelector('[data-active="true"]') as HTMLElement | null;
    activeTab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [currentPageId]);

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setDraft(name);
  };

  const commitRename = () => {
    if (editingId && draft.trim()) {
      renamePage(editingId, draft.trim());
    }
    setEditingId(null);
  };

  const scrollLeft = () => tabBarRef.current?.scrollBy({ left: -160, behavior: 'smooth' });
  const scrollRight = () => tabBarRef.current?.scrollBy({ left: 160, behavior: 'smooth' });

  return (
    <div className="flex items-center border-b border-gray-200 bg-gray-50 shrink-0 select-none">
      {/* Scroll left button */}
      {pages.length > 4 && (
        <button
          onClick={scrollLeft}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0"
        >
          <ChevronLeft size={15} />
        </button>
      )}

      {/* Page tabs */}
      <div
        ref={tabBarRef}
        className="flex items-end gap-0.5 overflow-x-auto flex-1 px-2 pt-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {pages.map((page, i) => {
          const isActive = page.id === currentPageId;
          return (
            <div
              key={page.id}
              data-active={isActive}
              onClick={() => setCurrentPage(page.id)}
              onDoubleClick={() => startRename(page.id, page.name)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t cursor-pointer transition-all whitespace-nowrap border border-b-0 ${
                isActive
                  ? 'bg-white border-gray-200 text-indigo-600 shadow-sm -mb-px z-10'
                  : 'bg-gray-100 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText size={11} className={isActive ? 'text-indigo-400' : 'text-gray-400'} />

              {editingId === page.id ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setEditingId(null);
                    e.stopPropagation();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-20 text-xs outline-none border-b border-indigo-400 bg-transparent"
                />
              ) : (
                <span>{page.name}</span>
              )}

              {/* Page number badge */}
              <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${isActive ? 'bg-indigo-100 text-indigo-500' : 'bg-gray-200 text-gray-400'}`}>
                {i + 1}
              </span>

              {/* Delete button (show only when more than 1 page) */}
              {pages.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); deletePage(page.id); }}
                  className="ml-0.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll right button */}
      {pages.length > 4 && (
        <button
          onClick={scrollRight}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0"
        >
          <ChevronRight size={15} />
        </button>
      )}

      {/* Add page button */}
      <button
        onClick={addPage}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0 border-l border-gray-200"
        title="Add new page"
      >
        <Plus size={13} />
        <span className="hidden sm:inline">Add Page</span>
      </button>
    </div>
  );
};
