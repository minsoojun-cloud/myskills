import re
import logging
import httpx
from typing import Any, Dict, List, Optional, Tuple
from app.config import settings
from app.auth import auth_manager

logger = logging.getLogger("aics-demo")

DEFAULT_FACET_KEYS = [
    "brands",
    "categories",
    "attributes.edition_type",
    "attributes.color",
    "attributes.room_capacity",
    "attributes.capacity",
    "attributes.screen_size",
    "attributes.storage_ssd"
]


def _split_filter_and_extract_tiles(filter_str: str) -> Tuple[str, List[Dict[str, Any]], List[str]]:
    """
    Splits a filter string into:
    1. safe_filter_str: built-in indexed Retail API filters (brands, categories, availability, price)
    2. extracted_tiles: list of {"productAttributeValue": {"name": key, "value": val}} for custom attributes
    3. query_terms: list of attribute values to augment search query if custom attributes aren't indexed yet
    """
    if not filter_str or not filter_str.strip():
        return "", [], []

    parts = [p.strip() for p in filter_str.split(" AND ") if p.strip()]
    safe_parts: List[str] = []
    extracted_tiles: List[Dict[str, Any]] = []
    query_terms: List[str] = []

    attr_pattern = re.compile(r'^(attributes\.[a-zA-Z0-9_]+):ANY\((.+)\)$')
    for part in parts:
        m = attr_pattern.match(part)
        if m:
            attr_key = m.group(1)
            raw_vals = m.group(2)
            # Extract quoted values
            vals = re.findall(r'"([^"]+)"', raw_vals)
            for v in vals:
                extracted_tiles.append({
                    "productAttributeValue": {
                        "name": attr_key,
                        "value": v
                    }
                })
                query_terms.append(v)
        else:
            safe_parts.append(part)

    return " AND ".join(safe_parts), extracted_tiles, query_terms


class RetailClient:
    def __init__(self):
        self.base_url = "https://retail.googleapis.com/v2"

    def get_placement_path(self) -> str:
        return (
            f"projects/{settings.project_id}/locations/{settings.location}/"
            f"catalogs/{settings.catalog_id}/placements/{settings.serving_config}"
        )

    async def search(
        self,
        query: str,
        visitor_id: str = "demo_visitor_001",
        page_size: int = 24,
        page_token: str = "",
        filter_str: str = "",
        order_by: str = "",
        query_expansion: bool = True,
        applied_tiles: Optional[List[Dict[str, Any]]] = None
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Executes Google Cloud Retail API Search request with native tileNavigationSpec support.
        Automatically handles custom attribute filtering via tileNavigationSpec + semantic query refinement
        if custom attributes are not yet indexed for strict ':' filter syntax.
        """
        token = auth_manager.get_access_token()
        placement = self.get_placement_path()
        url = f"{self.base_url}/{placement}:search"

        facet_specs = [
            {"facetKey": {"key": k}, "limit": 15}
            for k in DEFAULT_FACET_KEYS
        ]

        safe_filter, extracted_tiles, extra_query_terms = _split_filter_and_extract_tiles(filter_str)
        all_applied_tiles = list(applied_tiles or [])
        for et in extracted_tiles:
            if et not in all_applied_tiles:
                all_applied_tiles.append(et)

        effective_query = query.strip()
        for term in extra_query_terms:
            if term not in effective_query:
                effective_query = f"{effective_query} {term}".strip()

        def _build_payload(q_str: str, f_str: str, tiles_list: List[Dict[str, Any]]) -> Dict[str, Any]:
            p: Dict[str, Any] = {
                "placement": placement,
                "query": q_str,
                "visitorId": visitor_id,
                "pageSize": page_size,
                "facetSpecs": facet_specs,
                "dynamicFacetSpec": {"mode": "ENABLED"},
                "tileNavigationSpec": {
                    "tileNavigationRequested": True,
                    "appliedTiles": tiles_list
                },
                "queryExpansionSpec": {
                    "condition": "AUTO" if query_expansion else "DISABLED",
                    "pinUnexpandedResults": True
                }
            }
            if page_token:
                p["pageToken"] = page_token
            if f_str:
                p["filter"] = f_str
            if order_by:
                p["orderBy"] = order_by
            return p

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-Goog-User-Project": settings.project_id
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            # First attempt: if filter_str had custom attributes, try with safe_filter + effective_query + tileNavigationSpec
            # so we never hit HTTP 400 "Unsupported field attributes.xxx on : operator" and always get matching AICS hits.
            payload = _build_payload(effective_query, safe_filter, all_applied_tiles)
            resp = await client.post(url, json=payload, headers=headers)

            # Fallback if any unexpected filter error occurs
            if resp.status_code == 400 and safe_filter:
                logger.warning("Retail API filter returned 400, retrying with query expansion: %s", resp.text)
                payload = _build_payload(effective_query, "", all_applied_tiles)
                resp = await client.post(url, json=payload, headers=headers)

            resp.raise_for_status()
            data = resp.json()

            # If effective_query with extra terms returned 0 results (e.g. strict term mismatch), retry with base query
            if int(data.get("totalSize") or 0) == 0 and extra_query_terms and query.strip() != effective_query:
                logger.info("Retrying with base query '%s' and safe_filter '%s' for broader recall", query, safe_filter)
                fallback_payload = _build_payload(query.strip(), safe_filter, all_applied_tiles)
                resp2 = await client.post(url, json=fallback_payload, headers=headers)
                if resp2.status_code == 200:
                    data2 = resp2.json()
                    if int(data2.get("totalSize") or 0) > 0:
                        return fallback_payload, data2

            return payload, data


retail_client = RetailClient()

