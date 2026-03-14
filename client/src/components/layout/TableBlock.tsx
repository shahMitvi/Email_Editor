import React, { useEffect, useState, useRef } from 'react';
import { useBuilderStore, type EmailElement } from '../../store/useBuilderStore';
import { registerTableEditor } from './RightSidebar';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { VariableExtension } from './VariableExtension';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import FontFamily from '@tiptap/extension-font-family';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import {
  Bold, Italic, Underline as UnderlineIcon,
  AlignLeft, AlignCenter, AlignRight,
  Palette, Type, Link2, Image as ImageIcon,
  ChevronDown,
} from 'lucide-react';

// ─── Small helpers ────────────────────────────────────────────────────────────
const Divider = () => <div className="w-px h-4 bg-white/25 mx-0.5 shrink-0" />;

const ToolBtn = ({
  onClick, active = false, title, children,
}: {
  onClick: () => void; active?: boolean; title?: string; children: React.ReactNode;
}) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    className={`flex items-center justify-center w-6 h-6 rounded text-[11px] transition-colors shrink-0 ${
      active ? 'bg-indigo-500 text-white' : 'text-gray-200 hover:bg-white/20'
    }`}
  >
    {children}
  </button>
);

// ─── Font size dropdown ───────────────────────────────────────────────────────
const FontSizeDropdown = ({ editor }: { editor: any }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const SIZES = ['10','11','12','13','14','16','18','20','22','24','28','32','36','48'];

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o); }}
        className="flex items-center gap-0.5 px-1.5 h-6 rounded text-[11px] text-gray-200 hover:bg-white/20 font-mono"
      >
        <Type size={10} />
        <ChevronDown size={8} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-[9999] py-1 w-16 max-h-48 overflow-y-auto">
          {SIZES.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().setMark('textStyle', { fontSize: `${s}px` }).run();
                setOpen(false);
              }}
              className="w-full px-2 py-0.5 text-left text-[11px] text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              {s}px
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Color picker button ──────────────────────────────────────────────────────
const SWATCHES = [
  '#000000','#374151','#6b7280','#9ca3af',
  '#ef4444','#f97316','#eab308','#22c55e',
  '#3b82f6','#8b5cf6','#ec4899','#ffffff',
];

const ColorBtn = ({
  icon, label, value, onChange,
}: {
  icon: React.ReactNode; label: string; value: string; onChange: (c: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={label}
        onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o); }}
        className="flex items-center gap-0.5 w-8 h-6 justify-center rounded text-gray-200 hover:bg-white/20"
      >
        {icon}
        <div className="w-2 h-2 rounded-sm border border-white/30" style={{ backgroundColor: value }} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-[9999] w-36">
          <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-7 cursor-pointer rounded border-0 mb-1.5"
          />
          <div className="grid grid-cols-6 gap-1">
            {SWATCHES.map(c => (
              <button
                key={c}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange(c); setOpen(false); }}
                className="w-4 h-4 rounded-sm border border-white/10 hover:scale-125 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Cell background button ───────────────────────────────────────────────────
const CELL_SWATCHES = [
  '#ffffff','#f9fafb','#fef3c7','#dbeafe',
  '#d1fae5','#fce7f3','#ede9fe','#fee2e2',
  '#ffedd5','#f0fdf4','#eff6ff','#fdf4ff',
];

const CellBgBtn = ({ editor }: { editor: any }) => {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const apply = (c: string) => {
    setColor(c);
    editor.chain().focus().setCellAttribute('backgroundColor', c).run();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title="Cell Background"
        onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o); }}
        className="flex items-center gap-0.5 w-8 h-6 justify-center rounded text-gray-200 hover:bg-white/20"
      >
        <Palette size={11} />
        <div className="w-2 h-2 rounded-sm border border-white/30" style={{ backgroundColor: color }} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-[9999] w-36">
          <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1.5">Cell Background</p>
          <input
            type="color"
            value={color}
            onChange={(e) => apply(e.target.value)}
            className="w-full h-7 cursor-pointer rounded border-0 mb-1.5"
          />
          <div className="grid grid-cols-6 gap-1 mb-1.5">
            {CELL_SWATCHES.map(c => (
              <button
                key={c}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); apply(c); setOpen(false); }}
                className="w-4 h-4 rounded-sm border border-gray-600 hover:scale-125 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().setCellAttribute('backgroundColor', null).run();
              setColor('#ffffff');
              setOpen(false);
            }}
            className="w-full py-0.5 bg-gray-700 hover:bg-gray-600 text-white text-[10px] rounded"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Image insert ─────────────────────────────────────────────────────────────
const ImageBtn = ({ editor }: { editor: any }) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const insert = () => {
    if (url.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run();
      setUrl('');
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <ToolBtn onClick={() => setOpen(o => !o)} title="Insert Image">
        <ImageIcon size={11} />
      </ToolBtn>
      {open && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-[9999] w-52">
          <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1.5">Image URL</p>
          <input
            autoFocus
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && insert()}
            placeholder="https://..."
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500 mb-1.5"
          />
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); insert(); }}
            className="w-full py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded"
          >
            Insert
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Link insert ──────────────────────────────────────────────────────────────
const LinkBtn = ({ editor }: { editor: any }) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const insert = () => {
    if (url.trim()) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
      setUrl('');
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <ToolBtn onClick={() => setOpen(o => !o)} active={editor?.isActive('link')} title="Insert Link">
        <Link2 size={11} />
      </ToolBtn>
      {open && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-[9999] w-52">
          <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1.5">Link URL</p>
          <input
            autoFocus
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && insert()}
            placeholder="https://..."
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500 mb-1.5"
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insert(); }}
              className="flex-1 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded"
            >
              Set Link
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().unsetLink().run();
                setOpen(false);
              }}
              className="flex-1 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Variable Insert Dropdown ─────────────────────────────────────────────────
const VariableBtn = ({ editor }: { editor: any }) => {
  const { variables } = useBuilderStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const insertVar = (v: any) => {
    editor.chain().focus().insertContent({
      type: 'variable',
      attrs: { id: v.id, name: v.name }
    }).run();
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <ToolBtn onClick={() => setOpen(o => !o)} title="Insert Variable">
        <span className="flex items-center gap-0.5 px-1 bg-pink-500/20 text-pink-300 rounded text-[10px] font-bold">var</span>
      </ToolBtn>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-[9999] py-1 min-w-[120px] max-h-48 overflow-y-auto">
          <p className="px-2 py-1 text-[9px] text-gray-500 uppercase tracking-wider border-b border-gray-800">Variables</p>
          {variables.length > 0 ? (
            variables.map(v => (
              <button
                key={v.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertVar(v); }}
                className="w-full px-3 py-1.5 text-left text-[11px] text-gray-300 hover:bg-pink-900/40 hover:text-pink-200 transition-colors flex items-center justify-between"
              >
                <span>{v.name}</span>
                <span className="text-[9px] opacity-40 font-mono">${'{...}'}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-[10px] text-gray-500 italic">No variables set in sidebar</div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── BubbleMenu toolbar content ───────────────────────────────────────────────
const BubbleToolbar = ({ editor }: { editor: any }) => {
  const [textColor, setTextColor] = useState('#000000');

  const applyColor = (c: string) => {
    setTextColor(c);
    editor.chain().focus().setColor(c).run();
  };

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl"
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Bold / Italic / Underline */}
      <ToolBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Bold"
      >
        <Bold size={11} />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italic"
      >
        <Italic size={11} />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="Underline"
      >
        <UnderlineIcon size={11} />
      </ToolBtn>

      <Divider />

      {/* Font size */}
      <FontSizeDropdown editor={editor} />

      <Divider />

      {/* Text color */}
      <ColorBtn
        icon={<Type size={10} />}
        label="Text Color"
        value={textColor}
        onChange={applyColor}
      />

      {/* Cell background */}
      <CellBgBtn editor={editor} />

      <Divider />

      {/* Alignment */}
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        active={editor.isActive({ textAlign: 'left' })}
        title="Align Left"
      >
        <AlignLeft size={11} />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        active={editor.isActive({ textAlign: 'center' })}
        title="Align Center"
      >
        <AlignCenter size={11} />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        active={editor.isActive({ textAlign: 'right' })}
        title="Align Right"
      >
        <AlignRight size={11} />
      </ToolBtn>

      <Divider />

      {/* Image + Link */}
      <ImageBtn editor={editor} />
      <LinkBtn editor={editor} />

      <Divider />

      {/* Variables */}
      <VariableBtn editor={editor} />
    </div>
  );
};

// ─── Migrate old cellData → Tiptap HTML ──────────────────────────────────────
const DEFAULT_TABLE_HTML = `<table><tbody><tr><th><p></p></th><th><p></p></th><th><p></p></th></tr><tr><td><p></p></td><td><p></p></td><td><p></p></td></tr><tr><td><p></p></td><td><p></p></td><td><p></p></td></tr></tbody></table>`;

function migrateToHtml(element: EmailElement): string {
  if (element.content?.html) return element.content.html;

  const cellData = element.content?.cellData;
  if (cellData && cellData.length > 0) {
    const serNode = (node: any): string => {
      if (!node) return '';
      if (node.type === 'text') return node.text || '';
      if (node.type === 'paragraph') return `<p>${(node.content || []).map(serNode).join('')}</p>`;
      if (node.type === 'resizableImage') return `<img src="${node.attrs?.src || ''}" style="max-width:100%;display:block" />`;
      if (node.type === 'variable') return `\${${node.attrs?.id || 'var'}}`;
      return '';
    };

    let html = '<table><tbody>';
    cellData.forEach((row: any[]) => {
      html += '<tr>';
      row.forEach((cell: any) => {
        const tag = cell.isHeader ? 'th' : 'td';
        const styles: string[] = [];
        if (cell.backgroundColor) styles.push(`background-color:${cell.backgroundColor}`);
        if (cell.textAlign) styles.push(`text-align:${cell.textAlign}`);
        if (cell.fontWeight) styles.push(`font-weight:${cell.fontWeight}`);
        if (cell.color) styles.push(`color:${cell.color}`);
        const sa = styles.length ? ` style="${styles.join(';')}"` : '';
        const content = Array.isArray(cell.content) ? cell.content.map(serNode).join('') : (cell.text || '');
        html += `<${tag}${sa}>${content}</${tag}>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  return DEFAULT_TABLE_HTML;
}

// ─── Formula evaluator for dynamic table columns ──────────────────────────────
function evalFormula(formula: string, row: Record<string, string>): string {
  try {
    // Replace {key} with numeric value from row
    const expr = formula.replace(/\{(\w+)\}/g, (_, key) => {
      const val = parseFloat(row[key] ?? '0');
      return isNaN(val) ? '0' : String(val);
    });
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${expr})`)();
    const num = parseFloat(result);
    return isNaN(num) ? String(result) : (Number.isInteger(num) ? String(num) : num.toFixed(2));
  } catch {
    return '#ERR';
  }
}

// ─── Dynamic Table Preview ────────────────────────────────────────────────────
const DynamicTablePreview = ({ element }: { element: EmailElement }) => {
  const { variables } = useBuilderStore();
  const columnMappings: any[] = element.content.columnMappings || [];
  const dataSourceVar = element.content.dataSourceVariable || '';
  const borderColor = element.content.borderColor || '#000000';
  const headerBg = element.content.headerBg || element.content.headerBackgroundColor || '#f0f0f0';
  const cellPadding = element.content.cellPadding || '8px 12px';

  // Resolve data rows from variable fallback
  const matchedVar = variables.find(v => v.name === dataSourceVar);
  const dataRows: Record<string, string>[] = (Array.isArray(matchedVar?.fallback) ? matchedVar!.fallback : []) as Record<string, string>[];

  const cellStyle: React.CSSProperties = {
    border: `1px solid ${borderColor}`,
    padding: cellPadding,
    fontSize: '13px',
    fontFamily: 'Arial, sans-serif',
    verticalAlign: 'top',
    boxSizing: 'border-box',
  };

  const hasFooter = columnMappings.some(c => c.footerAggregation && c.footerAggregation !== 'none');

  // Compute column values for aggregation
  const getColValues = (col: any): number[] =>
    dataRows.map(row => {
      const raw = col.type === 'formula' ? evalFormula(col.formula, row) : (row[col.dataKey] ?? '');
      return parseFloat(raw);
    }).filter(n => !isNaN(n));

  const aggregate = (col: any): string => {
    const vals = getColValues(col);
    if (!vals.length) return '—';
    switch (col.footerAggregation) {
      case 'sum': return vals.reduce((a, b) => a + b, 0).toFixed(2).replace(/\.00$/, '');
      case 'avg': return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
      case 'count': return String(vals.length);
      default: return '';
    }
  };

  if (columnMappings.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', border: `2px dashed ${borderColor}`, borderRadius: '4px', color: '#6b7280', fontSize: '13px' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
        <strong>Dynamic Table</strong>
        <p style={{ margin: '4px 0 0', fontSize: '11px', opacity: 0.7 }}>
          {dataSourceVar ? `Source: ${dataSourceVar} · Add column mappings in the right panel` : 'Select a data source variable and add column mappings in the Properties panel'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: '-18px', right: 0, fontSize: '10px', color: '#7c3aed', background: '#f5f3ff', padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>
        ⚡ Dynamic · {dataRows.length} rows
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
        <thead>
          <tr>
            {columnMappings.map((col, i) => (
              <th key={i} style={{ ...cellStyle, backgroundColor: headerBg, fontWeight: 'bold', fontSize: '13px' }}>
                {col.header}
                {col.type === 'formula' && <span style={{ fontSize: '9px', marginLeft: '4px', color: '#ea580c', opacity: 0.7 }}>ƒ</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.length === 0 ? (
            <tr>
              <td colSpan={columnMappings.length} style={{ ...cellStyle, textAlign: 'center', color: '#9ca3af', fontStyle: 'italic', fontSize: '12px' }}>
                No data — add rows to the variable fallback
              </td>
            </tr>
          ) : (
            dataRows.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 1 ? '#fafafa' : '#ffffff' }}>
                {columnMappings.map((col, ci) => {
                  const val = col.type === 'formula'
                    ? evalFormula(col.formula, row)
                    : (row[col.dataKey] ?? '');
                  return <td key={ci} style={cellStyle}>{val}</td>;
                })}
              </tr>
            ))
          )}
        </tbody>
        {hasFooter && (
          <tfoot>
            <tr style={{ background: '#f3f4f6' }}>
              {columnMappings.map((col, i) => {
                const agg = col.footerAggregation && col.footerAggregation !== 'none' ? aggregate(col) : '';
                return (
                  <td key={i} style={{ ...cellStyle, fontWeight: 'bold', fontSize: '12px' }}>
                    {agg && <span style={{ fontSize: '9px', color: '#6b7280', marginRight: '2px' }}>{col.footerAggregation}: </span>}
                    {agg}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

// ─── Dynamic Table Wrapper (no Tiptap) ───────────────────────────────────────
const DynamicTableBlock = ({ element }: { element: EmailElement }) => {
  const { selectedId } = useBuilderStore();
  const isSelected = selectedId === element.id;
  return (
    <div
      className="table-block-wrapper relative w-full"
      style={{
        outline: isSelected ? '2px solid #7c3aed' : 'none',
        outlineOffset: '2px',
        borderRadius: '2px',
      }}
    >
      <DynamicTablePreview element={element} />
    </div>
  );
};

// ─── Main TableBlock component ────────────────────────────────────────────────
export const TableBlock = ({ element }: { element: EmailElement }) => {
  // Branch: if dynamic, render the dynamic preview instead of Tiptap
  if (element.content?.isDynamic) {
    return <DynamicTableBlock element={element} />;
  }
  return <StaticTableBlock element={element} />;
};

const StaticTableBlock = ({ element }: { element: EmailElement }) => {
  const { updateElement, selectedId } = useBuilderStore();
  const isSelected = selectedId === element.id;

  const initialContent = React.useMemo(() => migrateToHtml(element), [element.id]);


  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontFamily,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: true, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      VariableExtension,
    ],
    content: initialContent,
    editable: isSelected,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      updateElement(element.id, { content: { ...element.content, html } });
    },
  });





  // Register editor commands with the sidebar so +Row/-Row/+Col/-Col buttons work
  useEffect(() => {
    if (!editor) return;
    registerTableEditor(element.id, {
      addRowAfter:    () => editor.chain().focus().addRowAfter().run(),
      deleteRow:      () => editor.chain().focus().deleteRow().run(),
      addColumnAfter: () => editor.chain().focus().addColumnAfter().run(),
      deleteColumn:   () => editor.chain().focus().deleteColumn().run(),
    });
    return () => registerTableEditor(element.id, null);
  }, [editor, element.id]);

  // Sync editable state with selection
  useEffect(() => {
    if (editor) editor.setEditable(isSelected);
  }, [isSelected, editor]);

  // Sync external HTML changes (undo/redo, sidebar property changes)
  useEffect(() => {
    if (!editor) return;
    const incoming = element.content.html;
    if (incoming && incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [element.content.html]);

  if (!editor) return null;

  const borderColor = element.content.borderColor || '#e5e7eb';
  const cellPadding = element.content.cellPadding || '10px 12px';
  // Build a safe CSS class name from element id (no hyphens in class selectors)
  const uid = `tt${element.id.replace(/-/g, '')}`;

  return (
    <div className="table-block-wrapper relative w-full">
      <style>{`
        .${uid} .ProseMirror { outline: none !important; min-height: 40px; }
        .${uid} .ProseMirror table {
          border-collapse: collapse;
          table-layout: auto;
          width: 100%;
          margin: 0;
        }
        .${uid} .ProseMirror td,
        .${uid} .ProseMirror th {
          min-width: 40px;
          border: 1px solid ${borderColor};
          padding: ${cellPadding};
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
          word-break: break-word;
        }
        .${uid} .ProseMirror th {
          font-weight: bold;
          background-color: #f9fafb;
        }
        .${uid} .ProseMirror p { margin: 0; min-height: 1em; }
        .${uid} .ProseMirror img { max-width: 100%; height: auto; display: inline-block; }
        .${uid} .ProseMirror a { color: #4f46e5; text-decoration: underline; }
        .${uid} .ProseMirror .selectedCell::after {
          z-index: 2; position: absolute; content: "";
          left: 0; right: 0; top: 0; bottom: 0;
          background: rgba(99,102,241,0.15);
          pointer-events: none;
        }
        .${uid} .ProseMirror .column-resize-handle {
          position: absolute; right: -2px; top: 0; bottom: -2px;
          width: 4px; background-color: #6366f1;
          pointer-events: none; cursor: col-resize;
        }
        .${uid} .tableWrapper { overflow-x: auto; }
      `}</style>

      {/*
        BubbleMenu — pops up above any selected text inside a table cell.
        shouldShow fires whenever the cursor is inside a td/th node.
      */}
      {isSelected && (
        <BubbleMenu
          editor={editor}
          options={{
            placement: 'top-start',
          }}
          appendTo={() => document.body}
          shouldShow={({ state }: { state: any }) => {
            const { $from } = state.selection;
            for (let d = $from.depth; d > 0; d--) {
              const name = $from.node(d).type.name;
              if (name === 'tableCell' || name === 'tableHeader') return true;
            }
            return false;
          }}
        >
          <BubbleToolbar editor={editor} />
        </BubbleMenu>
      )}

      <div
        className={uid}
        onClick={(e) => e.stopPropagation()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};