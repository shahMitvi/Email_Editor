import { useState, useRef, useEffect } from 'react';
import Moveable from 'react-moveable';
import { useBuilderStore } from '../../store/useBuilderStore';
import type { EmailElement, Page } from '../../store/useBuilderStore';
import { useDroppable } from '@dnd-kit/core';
import { FileText, GripVertical } from 'lucide-react';
import { renderBlock } from '../blocks';

// ─────────────────────────────────────────────────────────────────────────────
// AbsoluteEmailBlock — plain absolutely-positioned element.
// react-moveable (in PageCanvas) overlays the handles on top of this.
// ─────────────────────────────────────────────────────────────────────────────
const AbsoluteEmailBlock = ({
  element,
  pageId,
}: {
  element: EmailElement;
  pageId: string;
}) => {
  const { selectElement, setCurrentPage, selectedId } = useBuilderStore();
  const isSelected = selectedId === element.id;

  // Safely parse numeric position — use isNaN so 0 is a valid value
  const leftRaw = parseFloat(element.styles.left as string);
  const topRaw  = parseFloat(element.styles.top  as string);
  const left  = isNaN(leftRaw) ? 10 : leftRaw;
  const top   = isNaN(topRaw)  ? 10 : topRaw;

  return (
    <div
      id={`el-${element.id}`}
      style={{
        ...element.styles,
        position: 'absolute',
        left:      `${left}px`,
        top:       `${top}px`,
        width:     element.styles.width  || '200px',
        height:    'auto',
        minHeight: element.styles.height || '30px',
        transform: element.styles.transform || '',
        zIndex:    isSelected ? 50 : ((element.styles.zIndex as number) || 10),
        boxSizing: 'border-box',
        overflow:  'visible', // Allow handle to stick out
        // Faint outline when NOT selected so user knows it's there
        outline:   isSelected ? 'none' : '1px solid transparent',
        cursor:    'default',
        backgroundColor: element.styles.backgroundColor as string,
      }}
      onMouseDown={(e) => {
        if (isSelected) return; // Allow click to pass through to content (like table cells) if already selected
        e.stopPropagation();
        setCurrentPage(pageId);
        selectElement(element.id);
      }}
    >
      {isSelected && (
        <div 
          className="absolute -top-7 left-0 flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded-t-md shadow-md cursor-move select-none z-[1000]"
          onMouseDown={(e) => e.stopPropagation()} // Stop bubble to AbsoluteEmailBlock
        >
          <GripVertical size={12} className="opacity-80" />
          <span className="text-[9px] font-bold uppercase tracking-wider">{element.type}</span>
        </div>
      )}
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: element.styles.borderRadius }}>
        {renderBlock(element)}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PageCanvas — one page + its Moveable overlay for the selected element
// ─────────────────────────────────────────────────────────────────────────────
const PageCanvas = ({
  page,
  pageIndex,
  isActive,
  scale,
}: {
  page: Page;
  pageIndex: number;
  isActive: boolean;
  scale: number;
}) => {
  const { selectElement, setCurrentPage, selectedId, updateElement, canvasSettings } = useBuilderStore();
  const { isOver, setNodeRef } = useDroppable({ id: `page-${page.id}` });
  const moveableRef = useRef<any>(null);

  // The element on this page that is currently selected
  const selectedElement = page.elements.find((el) => el.id === selectedId) ?? null;

  // When element style changes from the RightSidebar panel, keep Moveable in sync
  useEffect(() => {
    moveableRef.current?.updateRect();
  }, [selectedElement?.styles, selectedElement?.content]);

  // Resolve the target DOM node — used as a direct HTMLElement (not a function)
  const moveableTarget = selectedElement
    ? (document.getElementById(`el-${selectedElement.id}`) ?? undefined)
    : undefined;

  return (
    <div 
      className="flex flex-col items-center" 
      style={{ width: canvasSettings.width }}
    >
      {/* Page break separator */}
      {pageIndex > 0 && (
        <div className="flex items-center gap-3 my-6 w-full">
          <div className="flex-1 border-t-2 border-dashed border-gray-300" />
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            <FileText size={11} />
            Page break
          </div>
          <div className="flex-1 border-t-2 border-dashed border-gray-300" />
        </div>
      )}

      {/* White page sheet */}
      <div
        ref={setNodeRef}
        data-canvas
        data-canvas-id={page.id}
        onMouseDown={(e: React.MouseEvent) => {
          if (e.target === e.currentTarget) {
            setCurrentPage(page.id);
            selectElement(null);
          }
        }}
        className={`shadow-md border relative transition-all overflow-visible ${
          isActive ? 'border-indigo-300 shadow-indigo-100' : 'border-gray-200'
        } ${isOver ? 'border-indigo-400 border-2 ring-2 ring-indigo-100' : ''}`}
        style={{
          width: canvasSettings.width,
          minHeight: canvasSettings.height,
          backgroundColor: canvasSettings.backgroundColor,
        }}
      >
        {/* Empty state */}
        {page.elements.length === 0 && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none transition-colors ${
              isOver ? 'text-indigo-400' : 'text-gray-300'
            }`}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-3 opacity-60"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <p className="text-sm font-medium">
              {isOver ? 'Drop here!' : `Drop blocks onto ${page.name}`}
            </p>
          </div>
        )}

        {/* Elements */}
        {page.elements.map((el) => (
          <AbsoluteEmailBlock key={el.id} element={el} pageId={page.id} />
        ))}

        {/* ── react-moveable: one instance per page ── */}
        {selectedElement && (
          <Moveable
            ref={moveableRef}
            target={moveableTarget}
            draggable
            resizable
            rotatable
            checkInput={true}
            zoom={scale}
            keepRatio={false}
            renderDirections={['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']}
            rotationPosition="top"
            onDragStart={({ inputEvent }) => {
              // Don't drag if clicking a column resizer
              if ((inputEvent.target as HTMLElement)?.classList.contains('cursor-col-resize')) {
                return false;
              }
            }}
            onDrag={({ target, left, top }) => {
              target.style.left = `${Math.round(left)}px`;
              target.style.top  = `${Math.round(top)}px`;
            }}
            onDragEnd={({ target }) => {
              updateElement(selectedElement.id, {
                styles: {
                  left: target.style.left,
                  top:  target.style.top,
                },
              });
            }}
            onResize={({ target, width, height, drag }) => {
              target.style.width  = `${Math.round(width)}px`;
              target.style.height = `${Math.round(height)}px`;
              target.style.left   = `${Math.round(drag.left)}px`;
              target.style.top    = `${Math.round(drag.top)}px`;
            }}
            onResizeEnd={({ target }) => {
              updateElement(selectedElement.id, {
                styles: {
                  width:  target.style.width,
                  height: target.style.height,
                  left:   target.style.left,
                  top:    target.style.top,
                },
              });
            }}
            onRotate={({ target, rotation }) => {
              target.style.transform = `rotate(${Math.round(rotation)}deg)`;
            }}
            onRotateEnd={({ target }) => {
              updateElement(selectedElement.id, {
                styles: { transform: target.style.transform },
              });
            }}
          />
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Canvas — all pages stacked vertically
// ─────────────────────────────────────────────────────────────────────────────
export const Canvas = () => {
  const { pages, currentPageId, selectElement, canvasSettings } = useBuilderStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Parse width for scaling
  const canvasWidth = parseInt(canvasSettings.width) || 794;

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        // Padding is approx 64px total
        const targetWidth = canvasWidth + 64; 
        if (width < targetWidth) {
          setScale(width / targetWidth);
        } else {
          setScale(1);
        }
      }
    });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [canvasWidth]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-100 flex flex-col items-center"
      style={{ padding: 'clamp(16px, 4vw, 32px)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) selectElement(null);
      }}
    >
      <div 
        className="flex flex-col mb-10 origin-top transition-transform duration-75"
        style={{ 
          width: canvasSettings.width, 
          transform: `scale(${scale})`,
        }}
      >
        {pages.map((page, i) => (
          <PageCanvas
            key={page.id}
            page={page}
            pageIndex={i}
            isActive={page.id === currentPageId}
            scale={scale}
          />
        ))}
      </div>
    </div>
  );
};
