import type { EmailElement, Page, TemplateVariable } from '../store/useBuilderStore';

// Variable Interpolation Helper
function applyVariables(text: string, variables: TemplateVariable[] = [], keepVariablesIntact = false): string {
  if (!text) return text;
  if (keepVariablesIntact) return String(text);
  let result = String(text);
  variables.forEach((v) => {
    if (v.name) {
      const safeName = String(v.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\$\\{\\s*${safeName}\\s*\\}`, 'g');
      // Fix: only replace if the fallback is a string. Table variables (arrays) are handled separately.
      const fallbackValue = (typeof v.fallback === 'string' && v.fallback !== undefined && v.fallback !== null) ? String(v.fallback) : '';
      if (typeof v.fallback === 'string') {
        result = result.replace(regex, fallbackValue);
      }
    }
  });
  return result;
}

// Formula evaluator: {key} replaced with row value, then expression evaluated
function evalFormula(formula: string, row: Record<string, string>): string {
  try {
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

// Per-element HTML serializers

function serializeText(el: EmailElement, vars: TemplateVariable[], keepVars: boolean): string {
  const s = el.styles;
  const tag = el.type === 'heading'
    ? (['h1','h2','h3','h4','h5','h6'].includes(el.content.headingLevel) ? el.content.headingLevel : 'h1')
    : 'p';

  let rawText = el.content.text || (el.type === 'heading' ? 'Heading' : 'Your text here');
  const text = applyVariables(rawText, vars, keepVars).replace(/\n/g, '<br />');

  const fontSize   = s.fontSize   || (el.type === 'heading' ? '32px' : '16px');
  const fontWeight = s.fontWeight || (el.type === 'heading' ? '700' : '400');
  const color      = s.color      || '#000000';
  const textAlign  = s.textAlign  || 'left';
  const fontFamily = s.fontFamily || 'Arial,sans-serif';
  const fontStyle  = s.fontStyle  || 'normal';
  const textDecoration = s.textDecoration || 'none';

  const style = `margin:0;padding:0;font-size:${fontSize};font-weight:${fontWeight};color:${color};text-align:${textAlign};font-family:${fontFamily};font-style:${fontStyle};text-decoration:${textDecoration};line-height:1.5;`;
  return `<${tag} style="${style}">${text}</${tag}>`;
}

function serializeImage(el: EmailElement, vars: TemplateVariable[], keepVars: boolean): string {
  const w = el.styles.width || '100%';
  const rawSrc = el.content.url || '';
  const src = applyVariables(rawSrc, vars, keepVars);
  const alt = applyVariables(el.content.alt || '', vars, keepVars);
  
  if (!src) return `<div style="width:${w};height:80px;background:#f3f4f6;border:1px dashed #d1d5db;text-align:center;line-height:80px;color:#9ca3af;font-size:14px;font-family:Arial,sans-serif">No Image</div>`;
  return `<img src="${src}" alt="${alt}" style="display:block;width:100%;max-width:${w};height:auto;border:0" />`;
}

function serializeButton(el: EmailElement, vars: TemplateVariable[], keepVars: boolean): string {
  const s = el.styles;
  const rawText = el.content.text || 'Click Here';
  const rawUrl = el.content.url || '#';
  const text = applyVariables(rawText, vars, keepVars);
  const url = applyVariables(rawUrl, vars, keepVars);
  const bg = s.backgroundColor || '#4f46e5';
  const color = s.color || '#ffffff';
  const padding = s.padding || '10px 24px';
  const radius = s.borderRadius || '4px';
  const fontSize = s.fontSize || '16px';
  const textAlign = s.textAlign || 'center';
  return `<a href="${url}" style="display:block;width:100%;box-sizing:border-box;text-align:${textAlign};background-color:${bg};color:${color};padding:${padding};border-radius:${radius};font-size:${fontSize};font-weight:600;text-decoration:none;font-family:Arial,sans-serif">${text}</a>`;
}

function serializeDivider(el: EmailElement): string {
  const color = el.styles.borderColor || '#e5e7eb';
  const padding = el.styles.padding || '8px 0';
  return `<div style="padding:${padding}"><hr style="border:none;border-top:1px solid ${color};margin:0" /></div>`;
}

function serializeSpacer(el: EmailElement): string {
  const h = el.content.height || el.styles.height || '24px';
  return `<div style="height:${h};line-height:${h};font-size:1px">&nbsp;</div>`;
}

function serializeVideo(el: EmailElement, vars: TemplateVariable[], keepVars: boolean): string {
  const rawThumb = el.content.thumbnailUrl || 'https://via.placeholder.com/600x337/1a1a2e/ffffff?text=Video';
  const rawUrl = el.content.url || '#';
  const thumb = applyVariables(rawThumb, vars, keepVars);
  const url = applyVariables(rawUrl, vars, keepVars);
  const w = el.styles.width || '100%';
  return `
<div style="position:relative;max-width:${w};text-align:center">
  <a href="${url}" style="display:block">
    <img src="${thumb}" alt="Video" style="display:block;width:100%;height:auto;border:0" />
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:52px;height:52px;border-radius:50%;background:rgba(0,0,0,0.4);border:2px solid rgba(255,255,255,0.6)">
      <div style="width:0;height:0;border-top:9px solid transparent;border-bottom:9px solid transparent;border-left:16px solid white;margin:14px auto 0 17px"></div>
    </div>
  </a>
</div>`.trim();
}

// ─── Table: inline-style the Tiptap HTML for email clients ───────────────────
function emailifyTiptapTable(html: string, el: EmailElement): string {
  const borderColor = el.content.borderColor || '#e5e7eb';
  const cellPadding = el.content.cellPadding || '10px 12px';
  const headerBg    = el.content.headerBg    || '#f9fafb';
  const striped     = el.content.striped     ?? false;
  const stripeColor = el.content.stripeColor || '#fafafa';

  // Parse the HTML using DOMParser in browser, or return as-is for SSR
  if (typeof document === 'undefined') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (!table) return html;

  // Table wrapper styles
  table.setAttribute('cellpadding', '0');
  table.setAttribute('cellspacing', '0');
  table.setAttribute('border', '0');
  table.style.cssText = 'border-collapse:collapse;width:100%;table-layout:auto;';

  // Style th / td
  const rows = table.querySelectorAll('tr');
  rows.forEach((row, rowIndex) => {
    // Determine even/odd for striping (skip header)
    const isHeader = row.closest('thead') !== null || row.querySelector('th') !== null;
    const rowBg = isHeader ? headerBg : (striped && rowIndex % 2 === 1 ? stripeColor : '#ffffff');

    row.querySelectorAll('td, th').forEach((cell) => {
      const tag = cell.tagName.toLowerCase();
      const isHeaderCell = tag === 'th';

      // Preserve any existing inline background set by CellBgBtn
      const existingBg = (cell as HTMLElement).style.backgroundColor;
      const bgToUse = existingBg || (isHeaderCell ? headerBg : (striped && rowIndex % 2 === 1 ? stripeColor : ''));

      const existingStyle = (cell as HTMLElement).style.cssText || '';
      const baseStyle = `border:1px solid ${borderColor};padding:${cellPadding};vertical-align:top;box-sizing:border-box;font-family:Arial,sans-serif;font-size:14px;word-break:break-word;`;

      // Merge: base + header defaults + existing cell styles (cell styles win)
      let finalStyle = baseStyle;
      if (isHeaderCell) finalStyle += 'font-weight:bold;';
      if (bgToUse) finalStyle += `background-color:${bgToUse};`;
      // Re-apply original cell styles so they override the defaults
      if (existingStyle) {
        // Parse existing style to append/override
        existingStyle.split(';').forEach(rule => {
          const [prop] = rule.split(':');
          if (prop?.trim()) {
            // Remove the prop from finalStyle then re-add with original value
            const propName = prop.trim();
            finalStyle = finalStyle.replace(new RegExp(`${propName}:[^;]+;`, 'g'), '');
            finalStyle += rule.trim() + ';';
          }
        });
      }

      (cell as HTMLElement).style.cssText = finalStyle;
    });
  });

  // Return serialized HTML without outer document wrapper
  return table.outerHTML;
}

function serializeDynamicTable(el: EmailElement, vars: TemplateVariable[]): string {
  const columnMappings: any[] = el.content.columnMappings || [];
  const dataSourceVarName: string = el.content.dataSourceVariable || '';
  const borderColor = el.content.borderColor || '#000000';
  const headerBg = el.content.headerBg || el.content.headerBackgroundColor || '#f0f0f0';
  const headerTextColor = el.content.headerTextColor || '#000000';
  const cellPadding = el.content.cellPadding || '8px 12px';

  // Find the table variable
  const sourceVar = vars.find(v => v.name === dataSourceVarName);
  const dataRows: Record<string, string>[] = (Array.isArray(sourceVar?.fallback) ? sourceVar!.fallback : []) as Record<string, string>[];

  const thStyle = `border:1px solid ${borderColor};padding:${cellPadding};font-family:Arial,sans-serif;font-size:14px;font-weight:bold;background-color:${headerBg};color:${headerTextColor};vertical-align:top;box-sizing:border-box;`;
  const tdStyle = `border:1px solid ${borderColor};padding:${cellPadding};font-family:Arial,sans-serif;font-size:14px;vertical-align:top;box-sizing:border-box;`;
  const footerStyle = `border:1px solid ${borderColor};padding:${cellPadding};font-family:Arial,sans-serif;font-size:14px;font-weight:bold;background:#f3f4f6;vertical-align:top;box-sizing:border-box;`;

  let html = `\n<!-- DYNAMIC_TABLE_START:${el.id} -->\n`;
  html += `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;table-layout:auto;">`;

  // Header row
  html += '<thead><tr>';
  for (const col of columnMappings) {
    html += `<th style="${thStyle}">${col.header || ''}</th>`;
  }
  html += '</tr></thead>';

  // Body rows
  html += '<tbody>';
  if (dataRows.length === 0) {
    html += `<tr><td colspan="${columnMappings.length}" style="${tdStyle}text-align:center;color:#9ca3af;font-style:italic;">No data</td></tr>`;
  } else {
    dataRows.forEach((row, ri) => {
      const rowBg = ri % 2 === 1 ? 'background:#fafafa;' : '';
      html += `<tr>`;
      for (const col of columnMappings) {
        const val = col.type === 'formula'
          ? evalFormula(col.formula || '', row)
          : (row[col.dataKey] ?? '');
        html += `<td style="${tdStyle}${rowBg}">${val}</td>`;
      }
      html += '</tr>';
    });
  }
  html += '</tbody>';

  // Footer row (if any column has aggregation)
  const hasFooter = columnMappings.some(c => c.footerAggregation && c.footerAggregation !== 'none');
  if (hasFooter) {
    html += '<tfoot><tr>';
    for (const col of columnMappings) {
      let footerVal = '';
      if (col.footerAggregation && col.footerAggregation !== 'none') {
        const vals = dataRows.map(row => {
          const raw = col.type === 'formula' ? evalFormula(col.formula || '', row) : (row[col.dataKey] ?? '');
          return parseFloat(raw);
        }).filter(n => !isNaN(n));

        if (vals.length) {
          switch (col.footerAggregation) {
            case 'sum':   footerVal = vals.reduce((a, b) => a + b, 0).toFixed(2).replace(/\.00$/, ''); break;
            case 'avg':   footerVal = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2); break;
            case 'count': footerVal = String(vals.length); break;
          }
        } else {
          footerVal = '—';
        }
      }
      html += `<td style="${footerStyle}">${footerVal}</td>`;
    }
    html += '</tr></tfoot>';
  }

  html += '</table>';
  html += `\n<!-- DYNAMIC_TABLE_END -->\n`;
  return html;
}

function serializeTable(el: EmailElement, vars: TemplateVariable[] = []): string {
  // Dynamic table: expand rows from data source variable
  if (el.content.isDynamic) {
    return serializeDynamicTable(el, vars);
  }

  // Use Tiptap-generated HTML if available (primary path)
  if (el.content.html) {
    return emailifyTiptapTable(el.content.html, el);
  }


  // Legacy cellData fallback
  const cols = Number(el.content.cols) || 3;
  const cellData: any[][] = el.content.cellData || [];
  const columnWidths: number[] = el.content.columnWidths || Array(cols).fill(100 / cols);
  const borderColor = el.content.borderColor || '#e5e7eb';
  const cellPadding = el.content.cellPadding || '8px 12px';
  const cellStyle = `border:1px solid ${borderColor};padding:${cellPadding};font-size:14px;font-family:Arial,sans-serif;vertical-align:top`;

  if (cellData.length === 0) {
    const rows = Number(el.content.rows) || 2;
    const matrix: string[][] = el.content.matrix || [];
    const headers: string[] = el.content.headers || [];
    const hasHeader = el.content.hasHeader || false;
    let html = `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%">`;
    if (hasHeader) {
      html += '<thead><tr>';
      for (let c = 0; c < cols; c++) html += `<th style="${cellStyle};background:#f9fafb;font-weight:700">${headers[c] ?? ''}</th>`;
      html += '</tr></thead>';
    }
    html += '<tbody>';
    for (let r = 0; r < rows; r++) {
      html += `<tr style="background:${r % 2 === 1 ? '#fafafa' : '#ffffff'}">`;
      for (let c = 0; c < cols; c++) html += `<td style="${cellStyle}">${matrix[r]?.[c] ?? ''}</td>`;
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  }

  // Render cellData
  const serializeContentNode = (node: any): string => {
    if (!node) return '';
    switch (node.type) {
      case 'text': return node.text || '';
      case 'paragraph': return `<p style="margin:0;min-height:1em">${(node.content || []).map(serializeContentNode).join('')}</p>`;
      case 'resizableImage': {
        const textAlign = node.attrs?.textAlign || 'center';
        const width = node.attrs?.width ? `width:${node.attrs.width}px;` : 'width:100%;';
        return `<div style="text-align:${textAlign};margin:4px 0"><img src="${node.attrs?.src || ''}" style="${width}max-width:100%;display:inline-block;border:0" /></div>`;
      }
      case 'variable': return `\${${node.attrs?.id || 'var'}}`;
      default: return '';
    }
  };

  const serializeCellContent = (content: any): string => {
    if (!content) return '';
    if (Array.isArray(content)) return content.map(serializeContentNode).join('');
    if (typeof content === 'object' && 'type' in content) {
      const { type, value } = content as any;
      if (type === 'image') return `<img src="${value || ''}" style="width:100%;height:auto;display:block;border:0" />`;
      return value || '';
    }
    return '';
  };

  let html = `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;table-layout:fixed">`;
  html += '<colgroup>';
  columnWidths.forEach((w) => { html += `<col style="width:${w}%">`; });
  html += '</colgroup><tbody>';

  cellData.forEach((row: any[], ri: number) => {
    html += '<tr>';
    row.forEach((cell: any) => {
      const Tag = cell.isHeader ? 'th' : 'td';
      const bg = cell.backgroundColor ? `background:${cell.backgroundColor};` : (cell.isHeader ? 'background:#f9fafb;' : '');
      const fw = cell.isHeader ? 'font-weight:700;' : (cell.fontWeight === 'bold' ? 'font-weight:700;' : '');
      const align = cell.textAlign ? `text-align:${cell.textAlign};` : '';
      const color = cell.color ? `color:${cell.color};` : '';
      html += `<${Tag} style="${cellStyle};${bg}${fw}${align}${color}">${serializeCellContent(cell.content)}</${Tag}>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}

function serializeHtml(el: EmailElement, vars: TemplateVariable[], keepVars: boolean): string {
  return applyVariables(el.content.code || '', vars, keepVars);
}

function serializeQr(el: EmailElement, vars: TemplateVariable[], keepVars: boolean): string {
  const rawData = el.content.data || 'https://example.com';
  const data = applyVariables(rawData, vars, keepVars);
  const wStr = el.styles.width as string || '150px';
  const hStr = el.styles.height as string || '150px';
  const size = Math.min(parseFloat(wStr) || 150, parseFloat(hStr) || 150);
  let encodedData = encodeURIComponent(data);
  vars.forEach(v => {
    if (v.name) {
      const literal = `\${${v.name}}`;
      const encoded = encodeURIComponent(literal);
      encodedData = encodedData.split(encoded).join(literal);
    }
  });
  const url = `https://quickchart.io/qr?text=${encodedData}&size=${size}&margin=0`;
  return `<img src="${url}" alt="QR Code" style="display:block;width:${size}px;height:${size}px;border:0" />`;
}

// Dispatcher
function serializeElement(el: EmailElement, vars: TemplateVariable[], keepVars: boolean): string {
  switch (el.type) {
    case 'text':    return serializeText(el, vars, keepVars);
    case 'heading': return serializeText(el, vars, keepVars);
    case 'image':   return serializeImage(el, vars, keepVars);
    case 'button':  return serializeButton(el, vars, keepVars);
    case 'divider': return serializeDivider(el);
    case 'spacer':  return serializeSpacer(el);
    case 'video':   return serializeVideo(el, vars, keepVars);
    case 'table':   return serializeTable(el, vars);
    case 'html':    return serializeHtml(el, vars, keepVars);
    case 'qr':      return serializeQr(el, vars, keepVars);
    default:        return '';
  }
}

// Build full email HTML document
export function buildEmailHtml(
  pages: Page[],
  variables: TemplateVariable[] = [],
  title = 'Email',
  keepVariablesIntact = false,
  canvasSettings = { width: '794px', height: '1123px', backgroundColor: '#ffffff' }
): string {
  const allElements = pages.flatMap(p => p.elements);
  const width = canvasSettings.width;
  const minHeight = canvasSettings.height;
  const canvasBg = canvasSettings.backgroundColor;

  const elementsHtml = allElements
    .map((el) => {
      const bgStyle = el.styles.backgroundColor ? `background-color:${el.styles.backgroundColor};` : '';
      return `\n    <!-- ${el.type} -->\n    <div style="position:absolute;left:${el.styles.left||'0px'};top:${el.styles.top||'0px'};z-index:${el.styles.zIndex||10};width:${el.styles.width||'auto'};${bgStyle}">\n      ${serializeElement(el, variables, keepVariablesIntact)}\n    </div>`;
    })
    .join('\n');

  const contentHtml = `\n    <div style="position:relative;width:${width};min-height:${minHeight};background:${canvasBg};margin:0 auto;overflow:hidden">\n${elementsHtml}\n    </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin:0; padding:0; background-color:#f3f4f6; font-family:Arial,Helvetica,sans-serif; }
    table { border-spacing:0; }
    img { border:0; display:block; }
    @media only screen and (max-width:${width}) {
      .email-container, .email-container table, .email-container div {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      .email-container { padding: 0 10px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6">
  <center>
    <table role="presentation" width="${width}" class="email-container" style="margin:0 auto;background:${canvasBg}" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:0">
          ${contentHtml}
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
}

// Download helper — triggers browser file download
export function downloadHtmlFile(
  pages: Page[],
  variables: TemplateVariable[] = [],
  filename = 'email.html',
  title = 'Email',
  canvasSettings?: { width: string; height: string; backgroundColor: string }
) {
  const html = buildEmailHtml(pages, variables, title, false, canvasSettings);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}