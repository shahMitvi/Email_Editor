import { Type, Heading, Image as ImageIcon, SquareMousePointer, Table, Minus, ArrowUpDown, PlaySquare, Layers, EyeOff, GripVertical, Code, QrCode, FileText, Trash2, Plus, X } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBuilderStore } from '../../store/useBuilderStore';

const DraggableBlock = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  
  return (
    <div 
      ref={setNodeRef} 
      {...listeners} 
      {...attributes}
      className={`border border-gray-200 bg-white rounded flex flex-col items-center justify-center p-4 cursor-grab hover:shadow-md transition-all ${isDragging ? 'opacity-50 ring-2 ring-indigo-500' : ''}`}
      style={{ minHeight: '100px' }}
    >
      <Icon size={32} className="mb-3 text-gray-700 font-light" strokeWidth={1.5} />
      <span className="text-[11px] font-semibold text-gray-500 tracking-wider uppercase">{label}</span>
    </div>
  );
};

// Sortable item wrapper for layers
const SortableLayerItem = ({ id, element, isSelected, selectElement, Icon }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      onClick={() => selectElement(element.id)}
      className={`px-2 py-1.5 rounded flex items-center justify-between group cursor-pointer text-sm ${isSelected ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-gray-50 text-gray-600'} ${isDragging ? 'opacity-50 z-50 shadow-md ring-1 ring-indigo-500' : ''}`}
    >
      <div className="flex items-center gap-2 truncate">
        <div {...attributes} {...listeners} className="cursor-grab hover:text-gray-900 text-gray-400 p-1 -ml-1">
          <GripVertical size={14} />
        </div>
        <Icon size={14} className={isSelected ? 'text-indigo-500' : 'text-gray-400'} />
        <span className="truncate capitalize">{element.type}</span>
      </div>
      <EyeOff size={14} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600" />
    </div>
  );
};

export const LeftSidebar = () => {
  const { 
    activeTab, 
    pages, 
    currentPageId, 
    selectedId, 
    selectElement,
    variables,
    addVariable,
    updateVariable,
    removeVariable,
    showMobileMenu,
    setShowMobileMenu
  } = useBuilderStore();
  
  const currentPageParams = pages.find((p) => p.id === currentPageId);
  const elements = currentPageParams?.elements || [];
  const pageIndex = pages.findIndex((p) => p.id === currentPageId);

  const blocks = [
    { id: 'text',    label: 'Text',    icon: Type },
    { id: 'heading', label: 'Heading', icon: Heading },
    { id: 'image',   label: 'Image',   icon: ImageIcon },
    { id: 'video',   label: 'Video',   icon: PlaySquare },
    { id: 'button',  label: 'Button',  icon: SquareMousePointer },
    { id: 'table',   label: 'Table',   icon: Table },
    { id: 'html',    label: 'HTML',    icon: Code },
    { id: 'qr',      label: 'QR Code', icon: QrCode },
    { id: 'divider', label: 'Divider', icon: Minus },
    { id: 'spacer',  label: 'Spacer',  icon: ArrowUpDown },
  ];

  return (
    <>
      <div className={`w-64 min-w-[200px] border-r border-gray-200 bg-gray-50 flex flex-col shrink-0 overflow-hidden transition-transform duration-300 z-50 ${
        showMobileMenu ? 'fixed inset-y-0 left-0 translate-x-0 h-full shadow-2xl' : 'fixed inset-y-0 left-0 -translate-x-full h-full md:relative md:translate-x-0'
      }`}>
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <span className="font-semibold text-gray-800">Menu Options</span>
          <button onClick={() => setShowMobileMenu(false)} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'content' && (
          <div className="grid grid-cols-2 gap-3">
            {blocks.map((block) => (
              <DraggableBlock key={block.id} id={block.id} label={block.label} icon={block.icon} />
            ))}
          </div>
        )}

        {activeTab === 'layers' && (
          <div className="flex-1 flex flex-col min-h-0">
             <div className="px-1 mb-3">
               <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex justify-between items-center">
                 <span>Layers</span>
                 <span className="text-[10px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 normal-case font-medium">
                   <FileText size={10} /> Page {pageIndex + 1}
                 </span>
               </h3>
               <p className="text-[10px] text-gray-400 leading-tight">
                 Editing layers for: <span className="font-semibold text-gray-600">{currentPageParams?.name || 'Current Page'}</span>
               </p>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar border border-gray-200 rounded p-1 bg-white">
               <div className="px-2 py-1.5 hover:bg-gray-50 rounded text-sm text-gray-700 cursor-pointer flex items-center gap-2 mb-2 font-medium" onClick={() => selectElement(null)}>
                  <Layers size={14} className="text-gray-400" />
                  Canvas Background
               </div>
               <div className="pl-4 space-y-1 border-l border-gray-100 ml-3">
                 {elements.length === 0 ? (
                   <div className="text-xs text-gray-400 italic px-2">Canvas is empty</div>
                 ) : (
                   <SortableContext 
                     items={[...elements].reverse().map(el => `layer-${el.id}`)}
                     strategy={verticalListSortingStrategy}
                   >
                     {[...elements].reverse().map((el) => {
                       const Icon = blocks.find(b => b.id === el.type)?.icon || Type;
                       const isSelected = selectedId === el.id;
                       
                       return (
                         <SortableLayerItem 
                           key={`layer-${el.id}`}
                           id={`layer-${el.id}`}
                           element={el}
                           isSelected={isSelected}
                           selectElement={selectElement}
                           Icon={Icon}
                         />
                       );
                     })}
                   </SortableContext>
                 )}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'personalize' && (
           <div className="space-y-6">
              <div className="flex items-center justify-between px-1 mb-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Variables ({variables.length})</h3>
                <button 
                  onClick={addVariable}
                  className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 p-1 rounded transition-colors"
                  title="Add Variable"
                >
                  <Plus size={16} />
                </button>
              </div>
              
              <div className="space-y-4">
                {variables.map((variable, index) => (
                  <div key={variable.id} className="bg-white border border-gray-200 rounded p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Variable #{index + 1} Name</label>
                        <input 
                          type="text" 
                          value={variable.name}
                          onChange={(e) => updateVariable(variable.id, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm" 
                          placeholder="name" 
                        />
                    </div>
                    <div className="text-xs text-gray-500">
                      Use as: <code className="bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded">${'{' + (variable.name || 'name') + '}'}</code>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Variable #{index + 1} Fallback</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            value={variable.fallback}
                            onChange={(e) => updateVariable(variable.id, { fallback: e.target.value })}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm" 
                            placeholder="Fallback value" 
                          />
                          <button 
                            onClick={() => removeVariable(variable.id)}
                            className="p-2 text-yellow-500 hover:bg-yellow-50 rounded transition-colors shrink-0"
                            title="Delete Variable"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                    </div>
                  </div>
                ))}

                {variables.length === 0 && (
                  <div className="text-center p-6 bg-gray-50 border border-gray-200 border-dashed rounded text-gray-500 text-sm">
                    No variables defined yet. Click the + icon to add one.
                  </div>
                )}
              </div>
           </div>
        )}
      </div>
      </div>
      
      {/* Mobile Backdrop */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setShowMobileMenu(false)}
        />
      )}
    </>
  );
};
