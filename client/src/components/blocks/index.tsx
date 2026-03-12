import React from 'react';
import type { EmailElement } from '../../store/useBuilderStore';
import { useBuilderStore } from '../../store/useBuilderStore';
import { QRCodeSVG } from 'qrcode.react';

// Strip only absolute-layout props that are managed externally by the Canvas wrapper.
// Keep width (capped to 100%), height, padding, colors, fonts etc for the block itself.
const getContentStyles = (styles: Record<string, any>): React.CSSProperties => {
  const {
    position, left, top, bottom, right, zIndex, transform,
    ...rest
  } = styles || {};
  return {
    ...rest,
    // Ensure width never overflows its container
    maxWidth: '100%',
    boxSizing: 'border-box',
  } as React.CSSProperties;
};

// Helper to replace ${variable_name} with its fallback value
export const applyVariables = (text: string, variables: any[]) => {
  if (!text) return text;
  let result = String(text);
  variables.forEach((v) => {
    if (v.name) {
      // Escape the variable name to be safe in regex
      const safeName = String(v.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Allow optional whitespace inside the brackets: ${ age }
      const regex = new RegExp(`\\$\\{\\s*${safeName}\\s*\\}`, 'g');
      // Use fallback if truthy, or if it's explicitly the string/number 0
      const fallbackValue = v.fallback !== undefined && v.fallback !== null ? String(v.fallback) : '';
      result = result.replace(regex, fallbackValue);
    }
  });
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// HeadingBlock – H1-H6 semantic heading (what used to be "TextBlock")
// ─────────────────────────────────────────────────────────────────────────────
const HEADING_TAGS: Record<string, string> = {
  h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h5', h6: 'h6',
};

export const HeadingBlock = ({ element }: { element: EmailElement }) => {
  const { variables, updateElement, selectedId } = useBuilderStore();
  const isSelected = selectedId === element.id;
  const tag = HEADING_TAGS[element.content?.headingLevel ?? 'h1'] ?? 'h1';
  const Tag = tag as any;

  const style: React.CSSProperties = {
    margin: 0,
    padding: element.styles.padding || '0',
    fontSize:   element.styles.fontSize   || '32px',
    fontWeight: element.styles.fontWeight || '700',
    color:      element.styles.color      || '#000000',
    textAlign:  (element.styles.textAlign as any) || 'left',
    fontFamily: element.styles.fontFamily || 'Arial, sans-serif',
    lineHeight: '1.2',
    userSelect: isSelected ? 'auto' : 'none',
    pointerEvents: isSelected ? 'auto' : 'none',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    outline: 'none',
  };

  const htmlContent = applyVariables(element.content?.text || 'Heading', variables);
  return (
    <Tag 
      contentEditable={isSelected}
      suppressContentEditableWarning
      onBlur={(e: any) => isSelected && updateElement(element.id, { content: { ...element.content, text: e.currentTarget.innerHTML } })}
      style={style}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TextBlock – plain paragraph with bold / italic / underline toggles
// ─────────────────────────────────────────────────────────────────────────────
export const TextBlock = ({ element }: { element: EmailElement }) => {
  const { variables, updateElement, selectedId } = useBuilderStore();
  const isSelected = selectedId === element.id;

  const style: React.CSSProperties = {
    margin: 0,
    padding: element.styles.padding || '0',
    fontSize:        element.styles.fontSize        || '16px',
    // Bold/Italic/Underline driven by styles (set via RightSidebar toggles)
    fontWeight:      element.styles.fontWeight      || '400',
    fontStyle:       element.styles.fontStyle       || 'normal',
    textDecoration:  element.styles.textDecoration  || 'none',
    color:           element.styles.color           || '#333333',
    textAlign:       (element.styles.textAlign as any) || 'left',
    fontFamily:      element.styles.fontFamily      || 'Arial, sans-serif',
    lineHeight:      '1.5',
    userSelect:      isSelected ? 'auto' : 'none',
    pointerEvents:   isSelected ? 'auto' : 'none',
    wordBreak:       'break-word',
    whiteSpace:      'pre-wrap',
    outline:         'none',
  };

  const htmlContent = applyVariables(element.content?.text || 'Your text here', variables);
  return (
    <p 
      contentEditable={isSelected}
      suppressContentEditableWarning
      onBlur={(e) => isSelected && updateElement(element.id, { content: { ...element.content, text: e.currentTarget.innerHTML } })}
      style={style}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ImageBlock – display-only, source managed via RightSidebar
// ─────────────────────────────────────────────────────────────────────────────
export const ImageBlock = ({ element }: { element: EmailElement }) => {
  const { variables } = useBuilderStore();
  const contentStyles = getContentStyles(element.styles);
  
  const rawUrl = element.content.url || '';
  const url = applyVariables(rawUrl, variables);

  return (
    <div style={contentStyles}>
      {url ? (
        <img
          src={url}
          alt={element.content.alt || ''}
          draggable={false}
          style={{ display: 'block', width: '100%', height: 'auto', pointerEvents: 'none' }}
        />
      ) : (
        <div
          style={{ pointerEvents: 'none' }}
          className="w-full h-32 bg-gray-100 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-300 rounded gap-2 select-none"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span className="text-xs">Click to set image in Properties</span>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ButtonBlock – display-only, text / URL set via RightSidebar
// ─────────────────────────────────────────────────────────────────────────────
export const ButtonBlock = ({ element }: { element: EmailElement }) => {
  const { variables } = useBuilderStore();
  const contentStyles = getContentStyles(element.styles);
  
  const rawText = element.content.text || 'Click Me';
  const text = applyVariables(rawText, variables);

  return (
    <div style={{ width: '100%', height: '100%', userSelect: 'none' }}>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          // Map textAlign to flexbox justifyContent for horizontal centering
          justifyContent: contentStyles.textAlign === 'right' ? 'flex-end'
                        : contentStyles.textAlign === 'left'  ? 'flex-start'
                        : 'center',
          width: '100%',
          height: '100%',
          backgroundColor: contentStyles.backgroundColor || '#4f46e5',
          color: contentStyles.color || '#ffffff',
          padding: contentStyles.padding || '10px 20px',
          borderRadius: contentStyles.borderRadius || '4px',
          fontSize: contentStyles.fontSize || '16px',
          fontWeight: contentStyles.fontWeight || '600',
          boxSizing: 'border-box',
          pointerEvents: 'none',
        }}
      >
        {text}
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DividerBlock
// ─────────────────────────────────────────────────────────────────────────────
export const DividerBlock = ({ element }: { element: EmailElement }) => {
  const contentStyles = getContentStyles(element.styles);
  const color = contentStyles.borderColor || '#e5e7eb';
  return (
    <div style={{ padding: '8px 0', width: '100%', pointerEvents: 'none', userSelect: 'none', ...contentStyles }}>
      <hr style={{ border: 'none', borderTop: `1px solid ${color}`, margin: 0 }} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SpacerBlock – visual gap
// ─────────────────────────────────────────────────────────────────────────────
export const SpacerBlock = ({ element }: { element: EmailElement }) => {
  const h = element.content.height || '24px';
  return (
    <div
      style={{ height: h, width: '100%', pointerEvents: 'none', userSelect: 'none' }}
      className="flex items-center justify-center"
    >
      <div className="h-px w-full border-t border-dashed border-gray-300 opacity-40" />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// VideoBlock – thumbnail with play overlay
// ─────────────────────────────────────────────────────────────────────────────
export const VideoBlock = ({ element }: { element: EmailElement }) => {
  const { variables } = useBuilderStore();
  const contentStyles = getContentStyles(element.styles);
  
  const rawUrl = element.content.thumbnailUrl || 'https://via.placeholder.com/600x337/1a1a2e/ffffff?text=Video';
  const url = applyVariables(rawUrl, variables);

  return (
    <div style={{ ...contentStyles, position: 'relative', overflow: 'hidden', backgroundColor: '#000', pointerEvents: 'none', userSelect: 'none' }}>
      <img
        src={url}
        alt="Video thumbnail"
        draggable={false}
        style={{ display: 'block', width: '100%', height: 'auto' }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.22)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid rgba(255,255,255,0.55)',
        }}>
          <div style={{
            width: 0, height: 0,
            borderTop: '9px solid transparent',
            borderBottom: '9px solid transparent',
            borderLeft: '16px solid white',
            marginLeft: 3,
          }} />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TableBlock – cells still editable inline (best UX for tables)
// ─────────────────────────────────────────────────────────────────────────────
export const TableBlock = ({ element }: { element: EmailElement }) => {
  const { updateElement, selectedId } = useBuilderStore();
  const contentStyles = getContentStyles(element.styles);
  // Only allow cell editing when THIS table is already selected
  const isSelected = selectedId === element.id;

  const rows = Number(element.content.rows) || 2;
  const cols = Number(element.content.cols) || 2;
  const matrix: string[][] = element.content.matrix || [];
  const headers: string[] = element.content.headers || [];
  const hasHeader = element.content.hasHeader || false;

  const saveHeader = (c: number, val: string) => {
    const next = [...headers]; next[c] = val;
    updateElement(element.id, { content: { ...element.content, headers: next } });
  };

  const saveCell = (r: number, c: number, val: string) => {
    const next = matrix.map((row) => [...row]);
    while (next.length <= r) next.push([]);
    while (next[r].length <= c) next[r].push('');
    next[r][c] = val;
    updateElement(element.id, { content: { ...element.content, matrix: next } });
  };

  const cellBase: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    padding: '8px 12px',
    outline: 'none',
    fontSize: contentStyles.fontSize || '14px',
    minWidth: 50,
    // When not selected, block pointer events so clicks reach the canvas wrapper
    pointerEvents: isSelected ? 'auto' : 'none',
    userSelect: isSelected ? 'auto' : 'none',
  };

  return (
    <div style={{ overflowX: 'auto', ...contentStyles, pointerEvents: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        {hasHeader && (
          <thead>
            <tr>
              {Array.from({ length: cols }).map((_, c) => (
                <th
                  key={c}
                  contentEditable={isSelected}
                  suppressContentEditableWarning
                  onBlur={(e) => isSelected && saveHeader(c, e.currentTarget.innerText)}
                  style={{ ...cellBase, backgroundColor: '#f9fafb', fontWeight: 700, textAlign: 'left' }}
                >
                  {headers[c] ?? `Header ${c + 1}`}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} style={{ backgroundColor: r % 2 === 1 ? '#fafafa' : 'white' }}>
              {Array.from({ length: cols }).map((_, c) => (
                <td
                  key={c}
                  contentEditable={isSelected}
                  suppressContentEditableWarning
                  onBlur={(e) => isSelected && saveCell(r, c, e.currentTarget.innerText)}
                  style={cellBase}
                >
                  {matrix[r]?.[c] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HtmlBlock – live renders the raw HTML written in Monaco editor
// ─────────────────────────────────────────────────────────────────────────────
export const HtmlBlock = ({ element }: { element: EmailElement }) => {
  const { variables } = useBuilderStore();
  const contentStyles = getContentStyles(element.styles);
  const htmlContent = applyVariables(element.content.code || '', variables);
  return (
    <div
      style={{ ...contentStyles, pointerEvents: 'none', userSelect: 'none' }}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// QrBlock – live QR code using qrcode.react
// data: string (may contain ${variable} placeholders for dynamic values)
// transparent: boolean — shows white or transparent background
// ─────────────────────────────────────────────────────────────────────────────
export const QrBlock = ({ element }: { element: EmailElement }) => {
  const { variables } = useBuilderStore();
  const rawData = element.content?.data || 'https://example.com';
  const data = applyVariables(rawData, variables);
  const transparent = element.content?.transparent ?? false;

  // Parse width/height (fall back to 150px) — QRCodeSVG takes numbers
  const wStr = element.styles.width  as string || '150px';
  const hStr = element.styles.height as string || '150px';
  const size = Math.min(parseFloat(wStr) || 150, parseFloat(hStr) || 150);

  return (
    <div style={{
      width:  '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: transparent ? 'transparent' : '#ffffff',
      pointerEvents: 'none',
      userSelect: 'none',
    }}>
      <QRCodeSVG
        value={data}
        size={size}
        bgColor={transparent ? 'transparent' : '#ffffff'}
        fgColor="#000000"
        level="M"
        includeMargin={false}
        style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// renderBlock – dispatcher
// ─────────────────────────────────────────────────────────────────────────────
export const renderBlock = (element: EmailElement) => {
  switch (element.type) {
    case 'text':    return <TextBlock    element={element} />;
    case 'heading': return <HeadingBlock element={element} />;
    case 'image':   return <ImageBlock   element={element} />;
    case 'button':  return <ButtonBlock  element={element} />;
    case 'table':   return <TableBlock   element={element} />;
    case 'divider': return <DividerBlock element={element} />;
    case 'spacer':  return <SpacerBlock  element={element} />;
    case 'video':   return <VideoBlock   element={element} />;
    case 'html':    return <HtmlBlock    element={element} />;
    case 'qr':      return <QrBlock      element={element} />;
    default:
      return (
        <div className="p-3 bg-red-50 text-red-500 text-sm border border-red-200 rounded">
          Unknown block: {(element as any).type}
        </div>
      );
  }
};
