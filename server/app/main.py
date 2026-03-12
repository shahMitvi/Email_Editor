import asyncio
import sys

# MUST be set before anything else, at module top level
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import httptools
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Body, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from playwright.async_api import async_playwright
from datetime import datetime
from bson import ObjectId
from .databse import client, get_db
from .schema import EmailTemplateCreate, EmailTemplateResponse, PDFRequest, BulkRenderRequest
import traceback
import re
import base64
from typing import Optional
@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Starting worker process... Initializing Playwright")
    
    # playwright = await async_playwright().start()
    # browser = await playwright.chromium.launch(headless=True)
    # app.state.playwright = playwright
    # app.state.browser = browser
    
    try:
        await client.admin.command('ping')
        print("Connected to MongoDB Atlas!")
    except Exception as e:
        print(f"Could not connect to MongoDB: {e}")

    yield
    
    print("Shutting down worker process... Closing Browser")
    await browser.close()
    await playwright.stop()
    client.close()

app = FastAPI(title="Email Builder API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message":"Welcome !! React Email Editor backend"}


@app.post("/api/save-templates")
async def create_template(template: EmailTemplateCreate, template_id: Optional[str] = None):
    try:
        db = get_db()
        template_dict = template.dict()
        template_dict["updatedAt"] = datetime.utcnow()

        if template_id:
            # Update existing
            await db["email_templates"].update_one(
                {"_id": ObjectId(template_id)},
                {"$set": template_dict}
            )
            created_template = await db["email_templates"].find_one({"_id": ObjectId(template_id)})
        else:
            # Create new
            template_dict["createdAt"] = datetime.utcnow()
            result = await db["email_templates"].insert_one(template_dict)
            created_template = await db["email_templates"].find_one({"_id": result.inserted_id})

        if not created_template:
            raise HTTPException(status_code=500, detail="Failed to save template")

        created_template["_id"] = str(created_template["_id"])
        return created_template
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

        if pdf_req.template_id:
            db = get_db()
            template = await db["email_templates"].find_one({"_id": ObjectId(pdf_req.template_id)})
            if template:
                html_content = template.get("base_html", "")

        if not html_content:
            raise HTTPException(status_code=400, detail="No HTML content or valid template ID provided")

        page = await browser.new_page()
        await page.set_content(html_content)
        pdf_bytes = await page.pdf(
            format="A4",
            print_background=True
        )

        await page.close()

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=email_template.pdf"
            }
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# @app.post("/api/generate-pdf")
# def generate_pdf(request: PDFRequest):
#     try:
#         with sync_playwright() as p:
#             browser = p.chromium.launch(headless=True)
#             page = browser.new_page()

#             page.set_content(request.html_content)

#             pdf_bytes = page.pdf(format="A4", print_background=True, margin={"top":"0","right":"0","bottom":"0","left":"0"})

#             browser.close()

#             return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=email_template.pdf"})

#     except Exception as e:
        
#         error_trace = traceback.format_exc()
#         print(error_trace)
#         raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)} \nTraceback: {error_trace}")

@app.get("/api/bulk-generate/{bulk_id}")
async def bulk_generate(bulk_id: str, request: Request):
    db = get_db()
    
    # 0. Fetch the Bulk Config
    try:
        bulk_config = await db["bulk_configs"].find_one({"_id": ObjectId(bulk_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid bulk ID format")

    if not bulk_config:
        raise HTTPException(status_code=404, detail="Bulk configuration not found. Please save first.")

    template_id = bulk_config.get("template_id")
    users = bulk_config.get("users", [])
    format_type = bulk_config.get("format", "html")
    is_zip = bulk_config.get("zip", False)
    
    # 1. Fetch the Blueprint
    try:
        template = await db["email_templates"].find_one({"_id": ObjectId(template_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid template ID format in bulk config")

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    base_html = template.get("base_html", "")
    variables_config = template.get("variable", []) # List of VariableSchema {id, name, fallback}
    
    results = []
    browser = request.app.state.browser

    try:
        # 2. Start a Loop for each user
        for idx, user_data in enumerate(users):
            rendered_html = base_html
            
            # 3. Process placeholders
            for var in variables_config:
                var_name = var["name"]
                fallback = var["fallback"]
                
                actual_value = user_data.get(var_name)
                if actual_value is None or actual_value == "":
                    actual_value = fallback
                
                placeholder = f"${{{var_name}}}"
                encoded_placeholder = f"%24%7B{var_name}%7D"
                
                rendered_html = rendered_html.replace(placeholder, str(actual_value))
                rendered_html = rendered_html.replace(encoded_placeholder, str(actual_value))
            
            # Determine filename
            ext = ".pdf" if format_type == "pdf" else ".html"
            base_filename = user_data.get("email") or user_data.get("name") or user_data.get("id") or f"user_{idx+1}"
            filename = f"{base_filename}{ext}"

            result_item = {
                "user": user_data,
                "filename": filename,
                "content": rendered_html # Default to HTML
            }

            # 4. Handle PDF format if requested
            if format_type == "pdf":
                page = await browser.new_page()
                await page.set_content(rendered_html)
                pdf_bytes = await page.pdf(format="A4", print_background=True)
                await page.close()
                # Encode bytes to base64 string for JSON
                result_item["content"] = base64.b64encode(pdf_bytes).decode('utf-8')

            results.append(result_item)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    # 5. Persist to dynamic-collection
    try:
        persistence_data = {
            "template_id": template_id,
            "format": format_type,
            "results": results,
            "timestamp": datetime.utcnow()
        }
        await db["dynamic-collection"].insert_one(persistence_data)
    except Exception as e:
        print(f"Failed to persist bulk results: {e}")
        # We still return the results even if persistence fails, but log the error


    # 6. Return ZIP if requested
    if is_zip:
        import io
        import zipfile
        
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
            for item in results:
                filename = item["filename"]
                content = item["content"]
                
                if format_type == "pdf":
                    # content is base64 string
                    file_bytes = base64.b64decode(content)
                else:
                    # content is html string
                    file_bytes = content.encode('utf-8')
                
                zip_file.writestr(filename, file_bytes)
        
        zip_buffer.seek(0)
        return Response(
            content=zip_buffer.getvalue(),
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=bulk_export_{template_id}.zip"
            }
        )

    return {"results": results, "format": format_type}