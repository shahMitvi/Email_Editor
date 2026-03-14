import { useState } from 'react';
import { Type, Heading, Image as ImageIcon, SquareMousePointer, Table, Minus, ArrowUpDown, PlaySquare, Layers, EyeOff, GripVertical, Code, QrCode, Trash2, Plus, X, ChevronDown, ChevronUp, Database } from 'lucide-react';
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

const SortableLayerItem = ({ id, element, isSelected, selectElement, Icon }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
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

// ─── Variable Card ────────────────────────────────────────────────────────────
const VariableCard = ({ variable, index, updateVariable, removeVariable }: any) => {
  const [expanded, setExpanded] = useState(true);
  const [jsonError, setJsonError] = useState('');
  const isTable = variable.type === 'table';

  const handleJsonChange = (raw: string) => {
    setJsonError('');
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) { setJsonError('Must be a JSON array of objects'); return; }
      updateVariable(variable.id, { fallback: parsed });
    } catch {
      setJsonError('Invalid JSON');
    }
  };

  const fallbackJson = isTable
    ? JSON.stringify(Array.isArray(variable.fallback) ? variable.fallback : [], null, 2)
    : undefined;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-100">
        {isTable
          ? <Database size={13} className="text-purple-500 shrink-0" />
          : <span className="text-pink-500 font-bold text-[11px] shrink-0">$</span>
        }
        <span className="text-xs font-semibold text-gray-700 truncate flex-1">
          {variable.name || `variable_${index + 1}`}
        </span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${isTable ? 'bg-purple-100 text-purple-600' : 'bg-pink-100 text-pink-600'}`}>
          {isTable ? 'Table' : 'Text'}
        </span>
        <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600 p-0.5 rounded">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button onClick={() => removeVariable(variable.id)} className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors" title="Delete">
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="p-3 space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</label>
            <input
              type="text"
              value={variable.name}
              onChange={(e) => updateVariable(variable.id, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              placeholder="variable_name"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Use as: <code className="bg-pink-50 text-pink-600 px-1 rounded">${'{' + (variable.name || 'name') + '}'}</code>
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Type</label>
            <div className="flex rounded border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => updateVariable(variable.id, { type: 'normal', fallback: '' })}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${!isTable ? 'bg-pink-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >Text</button>
              <button
                type="button"
                onClick={() => updateVariable(variable.id, { type: 'table', fallback: [] })}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${isTable ? 'bg-purple-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >Table</button>
            </div>
          </div>

          {!isTable ? (
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Fallback</label>
              <input
                type="text"
                value={typeof variable.fallback === 'string' ? variable.fallback : ''}
                onChange={(e) => updateVariable(variable.id, { fallback: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                placeholder="Default value"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Fallback Data <span className="normal-case font-normal text-gray-400">(array of objects)</span>
              </label>
              <textarea
                key={variable.id + '_json'}
                defaultValue={fallbackJson}
                onChange={(e) => handleJsonChange(e.target.value)}
                rows={6}
                className={`w-full border rounded px-2 py-1.5 text-xs font-mono resize-y ${jsonError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                placeholder={'[\n  {"col1": "value1", "col2": "value2"}\n]'}
              />
              {jsonError && <p className="text-[10px] text-red-500 mt-1">{jsonError}</p>}
              {!jsonError && Array.isArray(variable.fallback) && (
                <p className="text-[10px] text-purple-600 mt-1">
                  ✓ {variable.fallback.length} row{variable.fallback.length !== 1 ? 's' : ''} · keys: {variable.fallback[0] ? Object.keys(variable.fallback[0]).join(', ') : '—'}
                </p>
              )}
            </div>
          )}
        </div>
      )}
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
                </h3>
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
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 mb-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Variables ({variables.length})</h3>
                <div className="flex gap-1">
                  <button
                    onClick={addVariable}
                    className="text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 px-2 py-1 rounded text-[10px] font-semibold transition-colors flex items-center gap-1"
                    title="Add Text Variable"
                  >
                    <Plus size={12} /> Text
                  </button>
                  <button
                    onClick={() => {
                      const store = useBuilderStore.getState();
                      const tableCount = store.variables.filter(v => v.type === 'table').length;
                      store.addVariable();
                      setTimeout(() => {
                        const newVars = useBuilderStore.getState().variables;
                        const newVar = newVars[newVars.length - 1];
                        if (newVar) store.updateVariable(newVar.id, { type: 'table', fallback: [], name: `table_variable_${tableCount + 1}` });
                      }, 0);
                    }}
                    className="text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded text-[10px] font-semibold transition-colors flex items-center gap-1"
                    title="Add Table Variable"
                  >
                    <Plus size={12} /> Table
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {variables.map((variable, index) => (
                  <VariableCard
                    key={variable.id}
                    variable={variable}
                    index={index}
                    updateVariable={updateVariable}
                    removeVariable={removeVariable}
                  />
                ))}
                {variables.length === 0 && (
                  <div className="text-center p-6 bg-gray-50 border border-gray-200 border-dashed rounded text-gray-500 text-sm">
                    No variables yet. Add a <strong>Text</strong> or <strong>Table</strong> variable above.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setShowMobileMenu(false)}
        />
      )}
    </>
  );
};
