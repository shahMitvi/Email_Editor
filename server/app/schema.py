from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class VariableSchema(BaseModel):
    id:str
    name: str
    fallback: str

class GlobalSettingsSchema(BaseModel):
    backgroundColor: str = "#f3f4f6"
    fontFamily: str = "Arial, Helvetica, sans-serif"

class PosSchema(BaseModel):
    x: float
    y: float
    z: int = 1

class LayerSchema(BaseModel):
    id: str
    type: str
    pos: PosSchema
    props: Dict[str,Any]

# class PageSchema(BaseModel):
#     id: str
#     name: str
#     layer: List[LayerSchema] = []

class EmailTemplateCreate(BaseModel):

    name: str
    type: str = "email_template"
    page_size: str = "A4"

    variable: List[VariableSchema] = []

    globalSettings: GlobalSettingsSchema

    contentJSON: Optional[Dict[str,Any]] = None

    # pages: List[PageSchema] = []
    layers: List[LayerSchema] = []

    base_html: str = ""

class EmailTemplateResponse(EmailTemplateCreate):

    id: str = Field(alias="_id")
    createdAt: datetime
    updatedAt: datetime

class PDFRequest(BaseModel):
    html_content: Optional[str] = None
    template_id: Optional[str] = None

class DynamicRenderRequest(BaseModel):
    dynamic_data: Dict[str, Any] = {}
    format: str = "pdf" # "pdf" or "html"

class BulkRenderRequest(BaseModel):
    template_id: str
    users: List[Dict[str, Any]]
    format: str = "html" # "html" or "pdf"
    zip: bool = False

class BulkSaveRequest(BaseModel):
    template_id: str
    users: List[Dict[str, Any]]
    format: str = "html"