import asyncio
import sys

# MUST be set before anything else
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import traceback
import re
import base64
from typing import Optional
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException, Body, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from playwright.async_api import async_playwright
from bson import ObjectId

from .databse import client, get_db
from .schema import EmailTemplateCreate, EmailTemplateResponse, PDFRequest, BulkRenderRequest


# ─── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──
    print("Starting worker process... Initializing Playwright")

    # Launch Playwright browser and store on app.state
    playwright_instance = await async_playwright().start()
    browser = await playwright_instance.chromium.launch(headless=True)
    app.state.playwright = playwright_instance
    app.state.browser = browser
    print("Playwright browser launched.")

    # Check MongoDB
    try:
        await client.admin.command('ping')
        print("Connected to MongoDB Atlas!")
    except Exception as e:
        print(f"Could not connect to MongoDB: {e}")

    yield

    # ── Shutdown ──
    print("Shutting down... Closing browser")
    await browser.close()
    await playwright_instance.stop()
    client.close()


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Email Builder API", lifespan=lifespan)

# ─── CORS — fix: proper formatting, all origins for dev ──────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Rendering Helpers ────────────────────────────────────────────────────────
def eval_formula(formula: str, row_data: Dict[str, Any]) -> str:
    """Evaluates a math formula like '{a}*{b}' using row data."""
    try:
        expr = formula
        for k, v in row_data.items():
            # Replace {key} with numeric value
            val = str(v) if v is not None else "0"
            expr = expr.replace(f"{{{k}}}", val)
        # Simple sanitize: only allow numbers, operators, dots, and parens
        if not re.match(r'^[0-9+\-*/().\s]+$', expr):
            return "#VAL!"
        # Using eval with restricted builtins
        res = eval(expr, {"__builtins__": None}, {})
        if isinstance(res, (int, float)):
            return f"{res:.2f}".rstrip('0').rstrip('.')
        return str(res)
    except Exception:
        return "#ERR"


def render_table_from_config(config: Dict[str, Any], data_list: List[Dict[str, Any]], variables_config: List[Dict[str, Any]]) -> str:
    """Expansion logic for dynamic tables using a configuration object and data list."""
    mappings = config.get("columnMappings", [])
    border_color = config.get("borderColor", "#000000")
    header_bg = config.get("headerBackgroundColor") or config.get("headerBg") or "#f0f0f0"
    header_text = config.get("headerTextColor", "#000000")
    cell_padding = config.get("cellPadding", "8px 12px")
    
    td_style = f"border:1px solid {border_color};padding:{cell_padding};font-family:Arial,sans-serif;font-size:14px;vertical-align:top;box-sizing:border-box;"
    th_style = f"border:1px solid {border_color};padding:{cell_padding};font-family:Arial,sans-serif;font-size:14px;font-weight:bold;background-color:{header_bg};color:{header_text};vertical-align:top;box-sizing:border-box;"
    footer_style = f"border:1px solid {border_color};padding:{cell_padding};font-family:Arial,sans-serif;font-size:14px;font-weight:bold;background:#f3f4f6;vertical-align:top;box-sizing:border-box;"

    html = '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;table-layout:auto;">'
    # Header
    html += '<thead><tr>'
    for col in mappings:
        html += f'<th style="{th_style}">{col.get("header","")}</th>'
    html += '</tr></thead><tbody>'
    
    # Data rows
    if not data_list:
        html += f'<tr><td colspan="{len(mappings)}" style="{td_style}text-align:center;color:#9ca3af;font-style:italic;">No data</td></tr>'
    else:
        for ri, row in enumerate(data_list):
            row_bg = "background:#fafafa;" if ri % 2 == 1 else ""
            html += '<tr>'
            for col in mappings:
                val = ""
                if col.get("type") == "formula":
                    val = eval_formula(col.get("formula", ""), row)
                else:
                    val = row.get(col.get("dataKey", ""), "")
                html += f'<td style="{td_style}{row_bg}">{val}</td>'
            html += '</tr>'
    html += '</tbody>'

    # Footer Aggregations
    has_footer = any(c.get("footerAggregation") and c.get("footerAggregation") != "none" for c in mappings)
    if has_footer:
        html += '<tfoot><tr>'
        for col in mappings:
            agg_type = col.get("footerAggregation")
            footer_val = ""
            if agg_type and agg_type != "none":
                vals = []
                for row in data_list:
                    try:
                        raw = eval_formula(col.get("formula",""), row) if col.get("type")=="formula" else row.get(col.get("dataKey",""), "0")
                        vals.append(float(raw))
                    except: pass
                
                if vals:
                    if agg_type == "sum":   footer_val = f"{sum(vals):.2f}".rstrip('0').rstrip('.')
                    elif agg_type == "avg": footer_val = f"{sum(vals)/len(vals):.2f}"
                    elif agg_type == "count": footer_val = str(len(vals))
                else:
                    footer_val = "—"
            html += f'<td style="{footer_style}">{footer_val}</td>'
        html += '</tr></tfoot>'
    
    html += '</table>'
    return html


def find_element_config(el_id: str, content_json: Dict[str, Any], layers: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Locates an element's configuration by ID in either layers or contentJSON."""
    # Search in layers (props)
    for layer in layers:
        if layer.get("id") == el_id:
            return layer.get("props", {})
    
    # Search in contentJSON (recursively)
    def search_json(node):
        if not isinstance(node, dict): return None
        # Check node attributes
        attrs = node.get("attrs", {})
        if attrs.get("id") == el_id: return attrs
        # Fallback: if node is a table and dynamic, it might be our target if ID matches or is missing
        if node.get("type") == "table" and (attrs.get("id") == el_id or attrs.get("isDynamic")):
             return attrs
        for child in node.get("content", []):
            res = search_json(child)
            if res: return res
        return None
    
    return search_json(content_json)


def render_template_content(base_html: str, variables_config: List[Dict[str, Any]], template_config: Dict[str, Any], user_data: Dict[str, Any]) -> str:
    """Full rendering engine: variable interpolation + dynamic table expansion."""
    rendered_html = base_html
    content_json = template_config.get("contentJSON", {})
    layers = template_config.get("layers", [])

    # 1. Dynamic Table Expansion
    marker_pattern = r'<!-- DYNAMIC_TABLE_START:(.*?) -->.*?<!-- DYNAMIC_TABLE_END -->'
    
    def replace_marker(match):
        el_id = match.group(1)
        config = find_element_config(el_id, content_json, layers)
        if not config: return match.group(0)
        
        var_name = config.get("dataSourceVariable")
        data_list = user_data.get(var_name)
        
        # Fallback to variable fallback if not provided in user_data
        if data_list is None:
            for v in variables_config:
                if v.get("name") == var_name:
                    data_list = v.get("fallback")
                    break
        
        if not isinstance(data_list, list):
            data_list = []
        
        return render_table_from_config(config, data_list, variables_config)

    rendered_html = re.sub(marker_pattern, replace_marker, rendered_html, flags=re.DOTALL)

    # 2. Variable Replacement
    for var in variables_config:
        var_name = var.get("name")
        if not var_name: continue
        
        fallback = var.get("fallback")
        actual_value = user_data.get(var_name)
        
        if actual_value is None or actual_value == "":
            actual_value = fallback
        
        # Skip objects/lists for standard replacement (already handled by tables or not intended for text)
        if isinstance(actual_value, (list, dict)):
            continue

        actual_str = str(actual_value)
        placeholder = f"${{{var_name}}}"
        encoded_placeholder = f"%24%7B{var_name}%7D"
        rendered_html = rendered_html.replace(placeholder, actual_str)
        rendered_html = rendered_html.replace(encoded_placeholder, actual_str)

    return rendered_html


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "Welcome! React Email Editor backend"}


@app.post("/api/save-templates")
async def create_template(
    template: EmailTemplateCreate,
    template_id: Optional[str] = None
):
    try:
        db = get_db()
        template_dict = template.dict()
        template_dict["updatedAt"] = datetime.utcnow()

        if template_id:
            # Update existing document
            await db["email_templates"].update_one(
                {"_id": ObjectId(template_id)},
                {"$set": template_dict}
            )
            saved = await db["email_templates"].find_one({"_id": ObjectId(template_id)})
        else:
            # Insert new document
            template_dict["createdAt"] = datetime.utcnow()
            result = await db["email_templates"].insert_one(template_dict)
            saved = await db["email_templates"].find_one({"_id": result.inserted_id})

        if not saved:
            raise HTTPException(status_code=500, detail="Failed to save template")

        saved["_id"] = str(saved["_id"])
        return saved

    except Exception as e:
        print(f"Error saving template: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/generate-templates/{template_id}")
async def generate_template_html(template_id: str):
    db = get_db()
    try:
        template = await db["email_templates"].find_one({"_id": ObjectId(template_id)})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        return Response(
            content=template.get("base_html", ""),
            media_type="text/html",
            headers={
                "Content-Disposition": f"attachment; filename={template.get('name', 'email')}.html"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/bulk-save")
async def bulk_save(req: BulkRenderRequest):
    db = get_db()
    try:
        data = req.dict()
        data["timestamp"] = datetime.utcnow()
        result = await db["bulk_configs"].insert_one(data)
        return {"bulk_id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-pdf")
async def generate_pdf(request: Request, pdf_req: PDFRequest):
    try:
        browser = request.app.state.browser
        html_content = pdf_req.html_content
        
        # Load and render template if ID provided
        if pdf_req.template_id:
            db = get_db()
            template = await db["email_templates"].find_one({"_id": ObjectId(pdf_req.template_id)})
            if template:
                base_html = template.get("base_html", "")
                variables = template.get("variable", [])
                # Apply dynamic rendering
                html_content = render_template_content(
                    base_html, 
                    variables, 
                    template, 
                    pdf_req.dynamic_data or {}
                )

        if not html_content:
            raise HTTPException(status_code=400, detail="No HTML content or valid template ID provided")

        page = await browser.new_page()
        await page.set_content(html_content, wait_until="networkidle")
        pdf_bytes = await page.pdf(format="A4", print_background=True)
        await page.close()

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=email_template.pdf"}
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/bulk-generate/{bulk_id}")
async def bulk_generate(bulk_id: str, request: Request):
    db = get_db()

    # Fetch bulk config
    try:
        bulk_config = await db["bulk_configs"].find_one({"_id": ObjectId(bulk_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid bulk ID format")

    if not bulk_config:
        raise HTTPException(
            status_code=404,
            detail="Bulk configuration not found. Please save first."
        )

    template_id  = bulk_config.get("template_id")
    users        = bulk_config.get("users", [])
    format_type  = bulk_config.get("format", "html")
    is_zip       = bulk_config.get("zip", False)

    # Fetch template
    try:
        template = await db["email_templates"].find_one({"_id": ObjectId(template_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid template ID format in bulk config")

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    base_html        = template.get("base_html", "")
    variables_config = template.get("variable", [])

    results = []
    browser = request.app.state.browser

    try:
        for idx, user_data in enumerate(users):
            rendered_html = render_template_content(
                base_html, 
                variables_config, 
                template, 
                user_data
            )

            ext           = ".pdf" if format_type == "pdf" else ".html"
            base_filename = (
                user_data.get("email") or
                user_data.get("name") or
                user_data.get("id") or
                f"user_{idx + 1}"
            )
            filename = f"{base_filename}{ext}"

            result_item = {
                "user": user_data,
                "filename": filename,
                "content": rendered_html,
            }

            if format_type == "pdf":
                page = await browser.new_page()
                await page.set_content(rendered_html, wait_until="networkidle")
                pdf_bytes = await page.pdf(format="A4", print_background=True)
                await page.close()
                result_item["content"] = base64.b64encode(pdf_bytes).decode("utf-8")

            results.append(result_item)

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


    # Persist results
    try:
        await db["dynamic-collection"].insert_one({
            "template_id": template_id,
            "format":      format_type,
            "results":     results,
            "timestamp":   datetime.utcnow(),
        })
    except Exception as e:
        print(f"Failed to persist bulk results: {e}")

    # Return ZIP if requested
    if is_zip:
        import io
        import zipfile

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zf:
            for item in results:
                file_bytes = (
                    base64.b64decode(item["content"])
                    if format_type == "pdf"
                    else item["content"].encode("utf-8")
                )
                zf.writestr(item["filename"], file_bytes)

        zip_buffer.seek(0)
        return Response(
            content=zip_buffer.getvalue(),
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=bulk_export_{template_id}.zip"
            }
        )

    return {"results": results, "format": format_type}