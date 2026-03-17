import React from 'react';
import type { EmailElement } from '../../store/useBuilderStore';
import { useBuilderStore } from '../../store/useBuilderStore';
import { QRCodeSVG } from 'qrcode.react';

// Re-export TableBlock from its own file
export { TableBlock } from '../layout/TableBlock';

// Strip only absolute-layout props that are managed externally by the Canvas wrapper.
const getContentStyles = (styles: Record<string, any>): React.CSSProperties => {
  const { position, left, top, bottom, right, zIndex, transform, ...rest } = styles || {};
  return { ...rest, maxWidth: '100%', boxSizing: 'border-box' } as React.CSSProperties;
};

// Helper to replace ${variable_name} with its fallback value
export const applyVariables = (text: string, variables: any[]) => {
  if (!text) return text;
  let result = String(text);
  variables.forEach((v) => {
    if (v.name) {
      const safeName = String(v.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\$\\{\\s*${safeName}\\s*\\}`, 'g');
      const fallbackValue = v.fallback !== undefined && v.fallback !== null ? String(v.fallback) : '';
      result = result.replace(regex, fallbackValue);
    }
  });
  return result;
};

// YouTube ID extractor
export const getYouTubeID = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// HeadingBlock
// ─────────────────────────────────────────────────────────────────────────────
const HEADING_TAGS: Record<string, string> = { h1:'h1', h2:'h2', h3:'h3', h4:'h4', h5:'h5', h6:'h6' };

export const HeadingBlock = ({ element }: { element: EmailElement }) => {
  const { variables, updateElement, selectedId } = useBuilderStore();
  const isSelected = selectedId === element.id;
  const tag = HEADING_TAGS[element.content?.headingLevel ?? 'h1'] ?? 'h1';
  const Tag = tag as any;

  const style: React.CSSProperties = {
    margin: 0,
    padding: element.styles.padding || '0',
    fontSize: element.styles.fontSize || '32px',
    fontWeight: element.styles.fontWeight || '700',
    color: element.styles.color || '#000000',
    textAlign: (element.styles.textAlign as any) || 'left',
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
// TextBlock
// ─────────────────────────────────────────────────────────────────────────────
export const TextBlock = ({ element }: { element: EmailElement }) => {
  const { variables, updateElement, selectedId } = useBuilderStore();
  const isSelected = selectedId === element.id;

  const style: React.CSSProperties = {
    margin: 0,
    padding: element.styles.padding || '0',
    fontSize: element.styles.fontSize || '16px',
    fontWeight: element.styles.fontWeight || '400',
    fontStyle: element.styles.fontStyle || 'normal',
    textDecoration: element.styles.textDecoration || 'none',
    color: element.styles.color || '#333333',
    textAlign: (element.styles.textAlign as any) || 'left',
    fontFamily: element.styles.fontFamily || 'Arial, sans-serif',
    lineHeight: '1.5',
    userSelect: isSelected ? 'auto' : 'none',
    pointerEvents: isSelected ? 'auto' : 'none',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    outline: 'none',
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
// ImageBlock
// ─────────────────────────────────────────────────────────────────────────────
export const ImageBlock = ({ element }: { element: EmailElement }) => {
  const { variables } = useBuilderStore();
  const contentStyles = getContentStyles(element.styles);
  const rawUrl = element.content.url || '';
  const url = applyVariables(rawUrl, variables);

  return (
    <div style={contentStyles}>
      {url ? (
        <img src={url} alt={element.content.alt || ''} draggable={false} style={{ display: 'block', width: '100%', height: 'auto', pointerEvents: 'none' }} />
      ) : (
        <div style={{ pointerEvents: 'none' }} className="w-full h-32 bg-gray-100 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-300 rounded gap-2 select-none">
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
// ButtonBlock
// ─────────────────────────────────────────────────────────────────────────────
export const ButtonBlock = ({ element }: { element: EmailElement }) => {
  const { variables } = useBuilderStore();
  const contentStyles = getContentStyles(element.styles);
  const rawText = element.content.text || 'Click Me';
  const text = applyVariables(rawText, variables);

  return (
    <div style={{ width: '100%', height: '100%', userSelect: 'none' }}>
      <span style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: contentStyles.textAlign === 'right' ? 'flex-end' : contentStyles.textAlign === 'left' ? 'flex-start' : 'center',
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
      }}>
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
// SpacerBlock
// ─────────────────────────────────────────────────────────────────────────────
export const SpacerBlock = ({ element }: { element: EmailElement }) => {
  const h = element.content.height || '24px';
  return (
    <div style={{ height: h, width: '100%', pointerEvents: 'none', userSelect: 'none' }} className="flex items-center justify-center">
      <div className="h-px w-full border-t border-dashed border-gray-300 opacity-40" />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// VideoBlock
// ─────────────────────────────────────────────────────────────────────────────
export const VideoBlock = ({ element }: { element: EmailElement }) => {
  const { variables } = useBuilderStore();
  const contentStyles = getContentStyles(element.styles);
  const rawUrl = element.content.url || '';
  const url = applyVariables(rawUrl, variables);
  const ytId = getYouTubeID(url);

  // If there's no URL, show placeholder
  if (!url) {
    const rawThumb = element.content.thumbnailUrl || 'https://via.placeholder.com/600x337/1a1a2e/ffffff?text=Video';
    const thumbUrl = applyVariables(rawThumb, variables);
    return (
      <div style={{ ...contentStyles, position: 'relative', overflow: 'hidden', backgroundColor: '#000', pointerEvents: 'none', userSelect: 'none' }}>
        <img src={thumbUrl} alt="Video thumbnail" draggable={false} style={{ display: 'block', width: '100%', height: 'auto' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.55)' }}>
            <div style={{ width: 0, height: 0, borderTop: '9px solid transparent', borderBottom: '9px solid transparent', borderLeft: '16px solid white', marginLeft: 3 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...contentStyles, position: 'relative', overflow: 'hidden', backgroundColor: '#000', aspectRatio: '16/9' }}>
      {ytId ? (
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${ytId}`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
      ) : (
        <video
          src={url}
          controls
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        >
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HtmlBlock
// ─────────────────────────────────────────────────────────────────────────────
export const HtmlBlock = ({ element }: { element: EmailElement }) => {
  const { variables } = useBuilderStore();
  const contentStyles = getContentStyles(element.styles);
  const htmlContent = applyVariables(element.content.code || '', variables);
  return (
    <div style={{ ...contentStyles, pointerEvents: 'none', userSelect: 'none' }} dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// QrBlock
// ─────────────────────────────────────────────────────────────────────────────
export const QrBlock = ({ element }: { element: EmailElement }) => {
  const { variables } = useBuilderStore();
  const rawData = element.content?.data || 'https://example.com';
  const data = applyVariables(rawData, variables);
  const transparent = element.content?.transparent ?? false;
  const wStr = element.styles.width as string || '150px';
  const hStr = element.styles.height as string || '150px';
  const size = Math.min(parseFloat(wStr) || 150, parseFloat(hStr) || 150);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: transparent ? 'transparent' : '#ffffff', pointerEvents: 'none', userSelect: 'none' }}>
      <QRCodeSVG value={data} size={size} bgColor={transparent ? 'transparent' : '#ffffff'} fgColor="#000000" level="M" includeMargin={false} style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// renderBlock – dispatcher
// ─────────────────────────────────────────────────────────────────────────────
// Import TableBlock lazily to avoid circular deps
import { TableBlock } from '../layout/TableBlock';

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