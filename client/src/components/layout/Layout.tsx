import { Navbar } from './Navbar';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { Canvas } from '../builder/Canvas';
import { DndContext } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useBuilderStore } from '../../store/useBuilderStore';
import type { ElementType } from '../../store/useBuilderStore';

// Default empty 3x3 table HTML — cells are blank, no pre-filled text
const DEFAULT_TABLE_HTML = `<table>
  <tbody>
    <tr>
      <th></th>
      <th></th>
      <th></th>
    </tr>
    <tr>
      <td></td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  </tbody>
</table>`;

export const Layout = () => {
  const { pages, addElementToPage, reorderPageElements } = useBuilderStore();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // ── Layer panel reorder ──────────────────────────────────────────────
    if (activeId.startsWith('layer-')) {
      if (activeId !== overId) {
        const state = useBuilderStore.getState();
        const currentPage = state.pages.find(p => p.id === state.currentPageId);
        if (!currentPage) return;
        const reversed = [...currentPage.elements].reverse();
        const oldIndex = reversed.findIndex(e => `layer-${e.id}` === activeId);
        const newIndex = reversed.findIndex(e => `layer-${e.id}` === overId);
        const newReversed = arrayMove(reversed, oldIndex, newIndex);
        reorderPageElements(state.currentPageId, [...newReversed].reverse());
      }
      return;
    }

    const SIDEBAR_TYPES: ElementType[] = ['text', 'heading', 'image', 'video', 'button', 'table', 'divider', 'spacer', 'html', 'qr'];
    const isSidebarBlock = SIDEBAR_TYPES.includes(activeId as ElementType);

    // ── Drop from sidebar ────────────────────────────────────────────────
    if (isSidebarBlock) {
      let targetPageId: string | null = null;

      if (overId.startsWith('page-')) {
        targetPageId = overId.replace('page-', '');
      } else {
        for (const page of pages) {
          if (page.elements.some(el => el.id === overId)) {
            targetPageId = page.id;
            break;
          }
        }
        if (!targetPageId) targetPageId = pages[0]?.id ?? null;
      }

      if (!targetPageId) return;

      const type = activeId as ElementType;

      let left = '20px';
      let top = '20px';
      const canvasEl = document.querySelector(`[data-canvas-id="${targetPageId}"]`);
      if (canvasEl && active.rect.current.translated) {
        const canvasRect = canvasEl.getBoundingClientRect();
        const dropCenter = {
          x: active.rect.current.translated.left + active.rect.current.translated.width / 2,
          y: active.rect.current.translated.top + active.rect.current.translated.height / 2
        };
        const relativeX = dropCenter.x - canvasRect.left;
        const relativeY = dropCenter.y - canvasRect.top;
        left = `${Math.max(0, Math.round(relativeX))}px`;
        top  = `${Math.max(0, Math.round(relativeY))}px`;
      }

      const defaultContent: Record<ElementType, any> = {
        text:    { text: 'Your text here' },
        heading: { text: 'Heading', headingLevel: 'h1' },
        image:   { url: '', alt: 'Image' },
        button:  { text: 'Click Me', url: '#' },
        // Table: start with clean HTML — no pre-filled text, user types in cells
        table: {
          html: DEFAULT_TABLE_HTML,
          borderColor: '#e5e7eb',
          cellPadding: '10px 12px',
          headerBg: '#f9fafb',
          striped: false,
          stripeColor: '#fafafa',
        },
        divider: {},
        spacer:  { height: '24px' },
        video:   { url: '', thumbnailUrl: '' },
        html:    { code: '<div style="background:#f3f4f6;padding:20px;text-align:center"><h2>Custom HTML Block</h2><p>Edit this in the Properties panel.</p></div>' },
        qr:      { data: 'https://example.com', transparent: false },
      };

      const defaultStyles: Record<ElementType, any> = {
        text:    { padding: '8px 0', fontSize: '16px', fontWeight: '400', color: '#333333', textAlign: 'left', width: '280px', left, top, zIndex: 10 },
        heading: { padding: '8px 0', fontSize: '32px', fontWeight: '700', color: '#000000', textAlign: 'left', width: '300px', left, top, zIndex: 10 },
        image:   { width: '250px', left, top, zIndex: 10 },
        button:  { padding: '12px 16px', backgroundColor: '#4f46e5', color: '#ffffff', borderRadius: '4px', textAlign: 'center', width: '200px', left, top, zIndex: 10 },
        table:   { width: '100%', left, top, zIndex: 10 },
        divider: { padding: '8px 0', width: '300px', left, top, zIndex: 10 },
        spacer:  { width: '200px', left, top, zIndex: 10 },
        video:   { width: '300px', left, top, zIndex: 10, height: '250px' },
        html:    { width: '300px', left, top, zIndex: 10 },
        qr:      { width: '150px', height: '150px', left, top, zIndex: 10 },
      };

      addElementToPage(targetPageId, {
        type,
        content: defaultContent[type],
        styles: defaultStyles[type],
      });
      return;
    }

    // ── Reorder elements within a page ─────────────────────────────────
    if (activeId !== overId) {
      let sourcePage = pages.find(p => p.elements.some(el => el.id === activeId));
      if (!sourcePage) return;

      const oldIndex = sourcePage.elements.findIndex(el => el.id === activeId);
      const newIndex = sourcePage.elements.findIndex(el => el.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderPageElements(sourcePage.id, arrayMove(sourcePage.elements, oldIndex, newIndex));
      }
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden font-sans">
        <Navbar />
        <div className="flex-1 flex overflow-hidden min-h-0">
          <LeftSidebar />
          <Canvas />
          <RightSidebar />
        </div>
      </div>
    </DndContext>
  );
};