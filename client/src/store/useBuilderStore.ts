import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { temporal } from 'zundo';

export type ElementType = 'text' | 'heading' | 'image' | 'video' | 'button' | 'table' | 'divider' | 'spacer' | 'html' | 'qr';
export type SidebarTab = 'content' | 'layers' | 'personalize';

export interface TemplateVariable {
  id: string;
  name: string;
  fallback: string;
}

export interface EmailElement {
  id: string;
  type: ElementType;
  content: any;
  styles: Record<string, any>;
  children?: EmailElement[];
}

export interface Page {
  id: string;
  name: string;
  elements: EmailElement[];
}

export interface BuilderState {
  pages: Page[];
  currentPageId: string;
  selectedId: string | null;
  hoveredId: string | null;
  activeTab: SidebarTab;
  variables: TemplateVariable[];
  readonly elements: EmailElement[];
  
  // Mobile UI State
  showMobileMenu: boolean;
  setShowMobileMenu: (show: boolean) => void;

  // Page actions
  addPage: () => void;
  deletePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;
  setCurrentPage: (id: string) => void;
  reorderPages: (pages: Page[]) => void;

  // Element actions
  addElement: (element: Omit<EmailElement, 'id'>, parentId?: string, index?: number) => void;
  addElementToPage: (pageId: string, element: Omit<EmailElement, 'id'>) => void;
  removeElement: (id: string) => void;
  updateElement: (id: string, updates: Partial<EmailElement>) => void;
  selectElement: (id: string | null) => void;
  setHoveredElement: (id: string | null) => void;
  reorderElements: (elements: EmailElement[]) => void;
  reorderPageElements: (pageId: string, elements: EmailElement[]) => void;
  moveLayer: (id: string, direction: 'up' | 'down' | 'front' | 'back') => void;
  moveElement: (id: string, newIndex: number, newParentId?: string) => void;
  setActiveTab: (tab: SidebarTab) => void;

  // Variable actions
  addVariable: () => void;
  updateVariable: (id: string, updates: Partial<TemplateVariable>) => void;
  removeVariable: (id: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const recursivelyUpdate = (
  elements: EmailElement[],
  id: string,
  updater: (el: EmailElement) => EmailElement | null
): EmailElement[] =>
  elements
    .map((el) => {
      if (el.id === id) return updater(el);
      if (el.children) return { ...el, children: recursivelyUpdate(el.children, id, updater).filter(Boolean) as EmailElement[] };
      return el;
    })
    .filter(Boolean) as EmailElement[];

const updatePageElements = (
  pages: Page[],
  pageId: string,
  updater: (elements: EmailElement[]) => EmailElement[]
): Page[] => pages.map((p) => (p.id === pageId ? { ...p, elements: updater(p.elements) } : p));

const makeDefaultPage = (name = 'Page 1'): Page => ({ id: uuidv4(), name, elements: [] });

// ─── Store ────────────────────────────────────────────────────────────────────
const initialPage = makeDefaultPage('Page 1');

export const useBuilderStore = create<BuilderState>()(
  temporal(
    (set, get) => ({
      pages: [initialPage],
  currentPageId: initialPage.id,
  selectedId: null,
  hoveredId: null,
  activeTab: 'content',
  variables: [],
  showMobileMenu: false,

  setShowMobileMenu: (show) => set({ showMobileMenu: show }),

  get elements() {
    const s = get();
    return s.pages.find((p) => p.id === s.currentPageId)?.elements ?? [];
  },

  // ─── Page actions ─────────────────────────────────────────────────────────
  addPage: () =>
    set((state) => {
      const newPage = makeDefaultPage(`Page ${state.pages.length + 1}`);
      return { pages: [...state.pages, newPage], currentPageId: newPage.id, selectedId: null };
    }),

  deletePage: (id) =>
    set((state) => {
      if (state.pages.length <= 1) return state;
      const newPages = state.pages.filter((p) => p.id !== id);
      const newCurrentId = state.currentPageId === id ? (newPages[0]?.id ?? '') : state.currentPageId;
      return { pages: newPages, currentPageId: newCurrentId, selectedId: null };
    }),

  renamePage: (id, name) =>
    set((state) => ({ pages: state.pages.map((p) => (p.id === id ? { ...p, name } : p)) })),

  setCurrentPage: (id) => set({ currentPageId: id, selectedId: null }),

  reorderPages: (pages) => set({ pages }),

  // ─── Element actions ──────────────────────────────────────────────────────
  addElement: (element, parentId, index) =>
    set((state) => {
      const newEl: EmailElement = { ...element, id: uuidv4() };
      const pages = updatePageElements(state.pages, state.currentPageId, (els) => {
        if (!parentId) {
          const next = [...els];
          if (index !== undefined) next.splice(index, 0, newEl); else next.push(newEl);
          return next;
        }
        return recursivelyUpdate(els, parentId, (el) => ({
          ...el,
          children: index !== undefined
            ? [...(el.children || []).slice(0, index), newEl, ...(el.children || []).slice(index)]
            : [...(el.children || []), newEl],
        }));
      });
      return { pages, selectedId: newEl.id };
    }),

  addElementToPage: (pageId, element) =>
    set((state) => {
      const newEl: EmailElement = { ...element, id: uuidv4() };
      const pages = state.pages.map((p) =>
        p.id === pageId ? { ...p, elements: [...p.elements, newEl] } : p
      );
      return { pages, currentPageId: pageId, selectedId: newEl.id };
    }),

  removeElement: (id) =>
    set((state) => ({
      pages: updatePageElements(state.pages, state.currentPageId, (els) =>
        recursivelyUpdate(els, id, () => null)
      ),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  updateElement: (id, updates) =>
    set((state) => {
      // Safely find which page the element belongs to
      let targetPageId = state.currentPageId;
      for (const p of state.pages) {
        if (p.elements.some(e => e.id === id || e.children?.some(c => c.id === id))) {
          targetPageId = p.id;
          break;
        }
      }
      return {
        pages: updatePageElements(state.pages, targetPageId, (els) =>
          recursivelyUpdate(els, id, (el) => ({
            ...el,
            ...updates,
            styles: updates.styles ? { ...el.styles, ...updates.styles } : el.styles,
            content: updates.content ? { ...el.content, ...updates.content } : el.content,
          }))
        ),
      };
    }),

  selectElement: (id) => set({ selectedId: id }),
  setHoveredElement: (id) => set({ hoveredId: id }),

  reorderElements: (elements) =>
    set((state) => ({
      pages: state.pages.map((p) => (p.id === state.currentPageId ? { ...p, elements } : p)),
    })),

  reorderPageElements: (pageId, elements) =>
    set((state) => ({
      pages: state.pages.map((p) => (p.id === pageId ? { ...p, elements } : p)),
    })),

  setActiveTab: (tab) => set({ activeTab: tab }),

  moveLayer: (id, direction) =>
    set((state) => {
      const currentElements = get().elements;
      let maxZ = 0, minZ = 10000;
      currentElements.forEach((n) => {
        const z = (n.styles?.zIndex as number) || 1;
        if (z > maxZ) maxZ = z;
        if (z < minZ) minZ = z;
      });
      const pages = updatePageElements(state.pages, state.currentPageId, (els) =>
        els.map((node) => {
          if (node.id !== id) return node;
          let newZ = (node.styles?.zIndex as number) || 1;
          if (direction === 'up') newZ += 1;
          if (direction === 'down') newZ = Math.max(0, newZ - 1);
          if (direction === 'front') newZ = maxZ + 1;
          if (direction === 'back') newZ = Math.max(0, minZ - 1);
          return { ...node, styles: { ...node.styles, zIndex: newZ } };
        })
      );
      return { pages };
    }),

  moveElement: (id, newIndex, newParentId) =>
    set((state): Partial<BuilderState> => {
      let extracted: EmailElement | null = null;
      const extract = (els: EmailElement[]): EmailElement[] =>
        els.filter((el) => {
          if (el.id === id) { extracted = el; return false; }
          if (el.children) el.children = extract(el.children);
          return true;
        });
      const pages = updatePageElements(state.pages, state.currentPageId, (els) => {
        const without = extract([...els]);
        if (!extracted) return els;
        if (!newParentId) {
          const next = [...without];
          next.splice(newIndex, 0, extracted!);
          return next;
        }
        return recursivelyUpdate(without, newParentId, (el) => {
          const children = [...(el.children || [])];
          children.splice(newIndex, 0, extracted!);
          return { ...el, children };
        });
      });
      return { pages };
    }),

  // ─── Variable actions ─────────────────────────────────────────────────────
  addVariable: () =>
    set((state) => ({
      variables: [
        ...state.variables,
        { id: uuidv4(), name: `variable_${state.variables.length + 1}`, fallback: 'Default' },
      ],
    })),

  updateVariable: (id, updates) =>
    set((state) => ({
      variables: state.variables.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    })),

  removeVariable: (id) =>
    set((state) => ({
      variables: state.variables.filter((v) => v.id !== id),
    })),
  }),
  { 
    partialize: (state) => ({ pages: state.pages }),
    equality: (pastState, currentState) => pastState.pages === currentState.pages,
    limit: 50,
  }
)
);

// We need to export this to access .temporal
export const useTemporalStore = useBuilderStore.temporal;
