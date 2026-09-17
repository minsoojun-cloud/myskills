from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ProductAttributeValue(BaseModel):
    name: str
    value: str


class AppliedTile(BaseModel):
    product_attribute_value: ProductAttributeValue = Field(..., alias="productAttributeValue")


class SearchRequest(BaseModel):
    query: str = ""
    visitor_id: str = "demo_visitor_001"
    page_size: int = 24
    page_token: str = ""
    filter: str = ""
    order_by: str = ""
    facet_specs: Optional[List[Dict[str, Any]]] = None
    applied_tiles: Optional[List[AppliedTile]] = None
    query_expansion: bool = True


class FacetValueItem(BaseModel):
    value: str
    count: int


class FacetGroup(BaseModel):
    key: str
    display_name: str
    values: List[FacetValueItem]


class TileItem(BaseModel):
    attribute_key: str
    attribute_value: str
    display_label: str
    image_url: str


class ProductCardItem(BaseModel):
    id: str
    type: str = "PRIMARY"
    primary_product_id: Optional[str] = None
    title: str
    brand: str
    categories: List[str]
    price: float
    original_price: float
    discount_rate: int
    currency_code: str
    rating: float
    rating_count: int
    image_url: str
    pdp_url: str
    availability: str = "IN_STOCK"
    attributes: Dict[str, List[str]] = {}
    variant_count: int = 0
    variant_options: List[str] = []


class SearchResponse(BaseModel):
    query: str
    total_size: int
    next_page_token: str = ""
    attribution_token: str = ""
    query_expansion_info: Dict[str, Any] = {}
    engine_used: str = "RETAIL_API"  # "RETAIL_API" | "BIGQUERY_FALLBACK" | "BIGQUERY_INSTANT"
    execution_ms: int = 0
    facets: List[FacetGroup] = []
    tiles: List[TileItem] = []
    products: List[ProductCardItem] = []
    raw_upstream_request: Dict[str, Any] = {}
    raw_upstream_response: Dict[str, Any] = {}
