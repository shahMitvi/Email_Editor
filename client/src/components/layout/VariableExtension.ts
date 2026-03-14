import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Tiptap extension to handle ${variable} placeholders as non-editable chips.
 */
export const VariableExtension = Node.create({
  name: 'variable',
  group: 'inline',
  inline: true,
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
      },
      name: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-variable]',
        getAttrs: (node: string | HTMLElement) => {
          if (typeof node === 'string') return false;
          return {
            id: node.getAttribute('data-id'),
            name: node.getAttribute('data-name'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // When exporting, we want the raw ${name} syntax for the final email processor
    return [
      'span',
      mergeAttributes({ 'data-variable': '', 'data-id': HTMLAttributes.id, 'data-name': HTMLAttributes.name }),
      `\${${HTMLAttributes.name}}`,
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span');
      dom.className = 'tiptap-variable-chip';
      dom.style.backgroundColor = '#fdf2f8';
      dom.style.color = '#db2777';
      dom.style.padding = '1px 6px';
      dom.style.borderRadius = '4px';
      dom.style.border = '1px solid #fbcfe8';
      dom.style.fontWeight = '600';
      dom.style.fontSize = '0.9em';
      dom.style.margin = '0 2px';
      dom.style.userSelect = 'none';
      dom.style.display = 'inline-block';
      dom.textContent = node.attrs.name;
      return { dom };
    };
  },
});
