import os
import time
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.models import SearchRequest, SearchResponse
from app.auth import auth_manager
from app.retail_client import retail_client
from app.transformer import transform_search_response

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("aics-demo")

app = FastAPI(
    title="Google Cloud AI Commerce Search - Customer Branded Demo",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/brand-config")
async def get_brand_config():
    cfg = settings.load_brand_config()
    cfg["gcp_metadata"] = {
        "project_id": settings.project_id,
        "bq_dataset": settings.bq_dataset,
        "bq_table": settings.bq_table,
        "catalog_id": settings.catalog_id,
        "serving_config": settings.serving_config
    }
    return cfg


@app.post("/api/v1/search", response_model=SearchResponse)
async def search_products(request: SearchRequest):
    """Executes search strictly via Google Cloud AI Commerce Search (Retail API)."""
    start_ts = time.time()
    try:
        applied_tiles_raw = None
        if request.applied_tiles:
            applied_tiles_raw = [t.model_dump(by_alias=True) for t in request.applied_tiles]

        req_payload, resp_payload = await retail_client.search(
            query=request.query,
            visitor_id=request.visitor_id,
            page_size=request.page_size,
            page_token=request.page_token,
            filter_str=request.filter,
            order_by=request.order_by,
            query_expansion=request.query_expansion,
            applied_tiles=applied_tiles_raw
        )
        elapsed = int((time.time() - start_ts) * 1000)
        return transform_search_response(
            req_payload,
            resp_payload,
            request.query,
            "RETAIL_API",
            elapsed,
            requested_filter=request.filter
        )
    except Exception as e:
        logger.error("Retail API Search Error: %s", e)
        raise HTTPException(status_code=502, detail=f"AI Commerce Search (Retail API) Error: {str(e)}")


@app.get("/api/v1/token-info")
async def get_token_info():
    return auth_manager.get_token_info()


@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "project_id": settings.project_id,
        "engine": "Google Cloud AI Commerce Search (Retail API v2)",
        "placement": f"projects/{settings.project_id}/locations/{settings.location}/catalogs/{settings.catalog_id}/placements/{settings.serving_config}"
    }


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")

if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def serve_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "AICS Demo API is running."}
