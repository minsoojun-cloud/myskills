import json
import os
from typing import Any, Dict, List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # GCP & Retail API Configuration
    project_id: str = os.getenv("PROJECT_ID", "ai-commerce-search-demo")
    location: str = os.getenv("LOCATION", "global")
    catalog_id: str = os.getenv("CATALOG_ID", "default_catalog")
    serving_config: str = os.getenv("SERVING_CONFIG", "default_search")

    # BigQuery Configuration (Configurable Dataset & Table)
    bq_dataset: str = os.getenv("BQ_DATASET", "aics_demo")
    bq_table: str = os.getenv("BQ_TABLE", "products")

    # Local fallback files bundled during deployment
    brand_config_path: str = os.getenv("BRAND_CONFIG_PATH", "brand_config.json")
    local_catalog_path: str = os.getenv("LOCAL_CATALOG_PATH", "products.jsonl")

    # Server Configuration
    port: int = int(os.getenv("PORT", "8080"))
    environment: str = os.getenv("ENV", "production")
    cors_origins: List[str] = ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def load_brand_config(self) -> Dict[str, Any]:
        default_cfg = {
            "brand_name": "AI COMMERCE",
            "display_title": "AIコマース検索デモ",
            "subtitle": "Powered by Google Cloud AI Commerce Search",
            "domain": "https://cloud.google.com/solutions/retail",
            "pdp_base_url": "https://example.com/product/",
            "primary_color": "#009e96",
            "secondary_color": "#1f2937",
            "accent_color": "#e60012",
            "currency_code": "JPY",
            "language_code": "ja-JP",
            "search_placeholder": "商品名、ブランド、カテゴリ、スペックで検索してみてください...",
            "demo_queries": ["おすすめ商品", "新商品", "人気ランキング", "限定セット"],
            "categories": ["すべて"]
        }
        if os.path.exists(self.brand_config_path):
            try:
                with open(self.brand_config_path, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                    default_cfg.update(loaded)
            except Exception:
                pass
        return default_cfg


settings = Settings()
