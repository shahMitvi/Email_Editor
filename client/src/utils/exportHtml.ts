import type { EmailElement, Page, TemplateVariable } from '../store/useBuilderStore';


// Variable Interpolation Helper
function applyVariables(text: string, variables: TemplateVariable[] = [], keepVariablesIntact = false): string {
  if (!text) return text;
  if (keepVariablesIntact) return String(text); // Do not substitute anything

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
}

// Per-element HTML serializers

function serializeText(el: EmailElement, vars: TemplateVariable[], keepVars: boolean): string {
  const s = el.styles;
  // If it's explicitly a heading block, respect headingLevel. Otherwise, render as paragraph.
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
  // Use display:block + width:100% so the button fills the absolutely-positioned container
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

function serializeTable(el: EmailElement): string {
  const rows = Number(el.content.rows) || 2;
  const cols = Number(el.content.cols) || 2;
  const matrix: string[][] = el.content.matrix || [];
  const headers: string[] = el.content.headers || [];
  const hasHeader = el.content.hasHeader || false;
  const cellStyle = 'border:1px solid #e5e7eb;padding:8px 12px;font-size:14px;font-family:Arial,sans-serif';

  let html = `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%">`;

  if (hasHeader) {
    html += '<thead><tr>';
    for (let c = 0; c < cols; c++) {
      html += `<th style="${cellStyle};background:#f9fafb;font-weight:700;text-align:left">${headers[c] ?? `Header ${c + 1}`}</th>`;
    }
    html += '</tr></thead>';
  }

  html += '<tbody>';
  for (let r = 0; r < rows; r++) {
    html += `<tr style="background:${r % 2 === 1 ? '#fafafa' : '#ffffff'}">`;
    for (let c = 0; c < cols; c++) {
      html += `<td style="${cellStyle}">${matrix[r]?.[c] ?? ''}</td>`;
    }
    html += '</tr>';
  }
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
  
  // Use quickchart API to generate static QR code image for email clients
  // We encode then replace encoded placeholders back to literal form so backend can find them
  let encodedData = encodeURIComponent(data);
  vars.forEach(v => {
    if (v.name) {
      const literal = `\${${v.name}}`;
      const encoded = encodeURIComponent(literal);
      // Replace %24%7BName%7D with ${Name}
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
    case 'table':   return serializeTable(el);
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

  // Use canvas settings for sizing
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
      .email-container {
        padding: 0 10px !important;
      }
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
