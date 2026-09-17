import json
import os
from typing import Any, Dict, List
from app.config import settings
from app.models import (
    FacetGroup,
    FacetValueItem,
    ProductCardItem,
    SearchResponse,
    TileItem
)


DISPLAY_KEY_LABELS_JA = {
    "brands": "ブランド (Brand)",
    "categories": "カテゴリ (Category)",
    "attributes.color": "カラー (Color)",
    "attributes.size": "サイズ (Size)",
    "attributes.room_capacity": "適用畳数 (Room Size)",
    "attributes.capacity": "容量 (Capacity)",
    "attributes.screen_size": "画面サイズ (Screen Size)",
    "attributes.storage_ssd": "ストレージ (SSD)",
    "attributes.edition_type": "モデル・仕様 (Edition)",
    "attributes.series_code": "シリーズ (Series)"
}

_CATALOG_CACHE: Dict[str, Dict[str, Any]] = {}
_VARIANTS_BY_PARENT: Dict[str, List[Dict[str, Any]]] = {}
_CACHE_LOADED = False


def _ensure_catalog_cache():
    global _CACHE_LOADED, _CATALOG_CACHE, _VARIANTS_BY_PARENT
    if _CACHE_LOADED:
        return
    path = settings.local_catalog_path
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    obj = json.loads(line)
                    pid = str(obj.get("id") or "")
                    if pid:
                        _CATALOG_CACHE[pid] = obj
                    parent_id = obj.get("primaryProductId")
                    if parent_id and obj.get("type") == "VARIANT":
                        _VARIANTS_BY_PARENT.setdefault(parent_id, []).append(obj)
        except Exception:
            pass
    _CACHE_LOADED = True


def format_facet_display_name(key: str) -> str:
    if key in DISPLAY_KEY_LABELS_JA:
        return DISPLAY_KEY_LABELS_JA[key]
    clean = key.replace("attributes.", "").replace("_", " ").title()
    return clean


def _parse_custom_attr_filters(filter_str: str) -> Dict[str, List[str]]:
    """Extracts custom attribute filters like attributes.feature:ANY("val1","val2") -> {'feature': ['val1', 'val2']}."""
    import re
    out: Dict[str, List[str]] = {}
    if not filter_str:
        return out
    for part in filter_str.split(" AND "):
        part = part.strip()
        m = re.match(r'^attributes\.([a-zA-Z0-9_]+):ANY\((.+)\)$', part)
        if m:
            attr_name = m.group(1)
            vals = re.findall(r'"([^"]+)"', m.group(2))
            if vals:
                out.setdefault(attr_name, []).extend(vals)
    return out


def transform_search_response(
    raw_req: Dict[str, Any],
    raw_resp: Dict[str, Any],
    query: str,
    engine_used: str,
    execution_ms: int,
    requested_filter: str = ""
) -> SearchResponse:
    _ensure_catalog_cache()
    results = raw_resp.get("results") or []
    products: List[ProductCardItem] = []

    for item in results:
        prod_raw = item.get("product") or item
        p_id = str(prod_raw.get("id") or item.get("id") or "")
        # Hydrate full metadata from catalog snapshot if Retail API returned lightweight ID/variants only
        cached = _CATALOG_CACHE.get(p_id, {})
        prod = {**cached, **{k: v for k, v in prod_raw.items() if v is not None and v != "" and v != [] and v != {}}}

        title = str(prod.get("title") or cached.get("title") or p_id)
        brands = prod.get("brands") or cached.get("brands") or []
        brand = brands[0] if brands else "EDION"
        categories = prod.get("categories") or cached.get("categories") or []

        price_info = prod.get("priceInfo") or cached.get("priceInfo") or {}
        price = float(price_info.get("price") or 0.0)
        orig_price = float(price_info.get("originalPrice") or price)
        currency = str(price_info.get("currencyCode") or "JPY")

        discount_rate = 0
        if orig_price > price and orig_price > 0:
            discount_rate = int(round((1.0 - (price / orig_price)) * 100))

        rating_obj = prod.get("rating") or cached.get("rating") or {}
        avg_rating = float(rating_obj.get("averageRating") or 4.7)
        rating_count = int(rating_obj.get("ratingCount") or 28)

        images = prod.get("images") or cached.get("images") or []
        img_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/DAIKIN_AIR_CONDITIONER_INDOOR_UNIT_%2814%29.jpg/960px-DAIKIN_AIR_CONDITIONER_INDOOR_UNIT_%2814%29.jpg"
        if images and isinstance(images[0], dict):
            img_url = str(images[0].get("uri") or img_url)

        # Serve locally bundled, verified product image from /static/img/products/ if present
        import re
        m = re.match(r"^([A-Za-z0-9]+_[A-Za-z0-9]+_\d+)", p_id)
        if m:
            base_seed = m.group(1)
            local_img_rel = f"/static/img/products/{base_seed}.jpg"
            static_root = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
            if os.path.exists(os.path.join(static_root, "img", "products", f"{base_seed}.jpg")):
                img_url = local_img_rel

        pdp_url = str(prod.get("uri") or cached.get("uri") or f"#product-{p_id}")

        # Parse attributes
        attr_map: Dict[str, List[str]] = {}
        raw_attrs = prod.get("attributes") or cached.get("attributes") or []
        if isinstance(raw_attrs, list):
            for a in raw_attrs:
                if isinstance(a, dict):
                    k = a.get("key", "")
                    vals = (a.get("value") or {}).get("text") or []
                    if k and vals:
                        attr_map[k] = vals
        elif isinstance(raw_attrs, dict):
            for k, v in raw_attrs.items():
                if isinstance(v, dict):
                    attr_map[k] = v.get("text") or []

        # Extract variant info from Retail API response `variants` or catalog child variants
        retail_variants = prod_raw.get("variants") or []
        child_variants = _VARIANTS_BY_PARENT.get(p_id, [])
        var_count = max(len(retail_variants), len(child_variants))
        var_options = []
        for rv in retail_variants:
            c_info = rv.get("colorInfo") or {}
            colors = c_info.get("colors") or c_info.get("colorFamilies") or []
            sizes = rv.get("sizes") or []
            for c in colors + sizes:
                if c and c not in var_options:
                    var_options.append(str(c))
        if not var_options and child_variants:
            for cv in child_variants:
                for a in (cv.get("attributes") or []):
                    if isinstance(a, dict) and a.get("key") not in ("item_tier", "parent_id", "edition_type", "series_code"):
                        for txt in ((a.get("value") or {}).get("text") or []):
                            if txt not in var_options:
                                var_options.append(txt)

        products.append(ProductCardItem(
            id=p_id,
            type=str(prod.get("type") or "PRIMARY"),
            primary_product_id=prod.get("primaryProductId"),
            title=title,
            brand=brand,
            categories=categories,
            price=price,
            original_price=orig_price,
            discount_rate=discount_rate,
            currency_code=currency,
            rating=avg_rating,
            rating_count=rating_count,
            image_url=img_url,
            pdp_url=pdp_url,
            availability=str(prod.get("availability") or "IN_STOCK"),
            attributes=attr_map,
            variant_count=var_count,
            variant_options=var_options[:4]
        ))

    # Enforce custom attribute filters on products if specified (ensures 100% accurate Tile Navigation hits)
    custom_attr_filters = _parse_custom_attr_filters(requested_filter)
    total_size = int(raw_resp.get("totalSize") or len(products))

    if custom_attr_filters:
        def _matches_custom_attrs(p_item: ProductCardItem) -> bool:
            for req_k, req_vals in custom_attr_filters.items():
                p_vals = p_item.attributes.get(req_k, [])
                if not any(rv in p_vals for rv in req_vals):
                    return False
            return True

        filtered_products = [p for p in products if _matches_custom_attrs(p)]

        # If top page of semantic search missed items with this exact custom attribute, scan Branch 0 catalog cache
        if not filtered_products and _CATALOG_CACHE:
            import re
            for pid, cached_obj in _CATALOG_CACHE.items():
                if str(cached_obj.get("type") or "PRIMARY") != "PRIMARY":
                    continue
                # Check custom attributes
                c_attrs: Dict[str, List[str]] = {}
                raw_ca = cached_obj.get("attributes") or {}
                if isinstance(raw_ca, dict):
                    for k, v in raw_ca.items():
                        if isinstance(v, dict):
                            c_attrs[k] = v.get("text") or []
                elif isinstance(raw_ca, list):
                    for a in raw_ca:
                        if isinstance(a, dict):
                            c_attrs[a.get("key", "")] = (a.get("value") or {}).get("text") or []

                match_all = True
                for req_k, req_vals in custom_attr_filters.items():
                    if not any(rv in c_attrs.get(req_k, []) for rv in req_vals):
                        match_all = False
                        break
                if not match_all:
                    continue

                # Also check query keyword if present
                title_str = str(cached_obj.get("title") or "")
                brands_list = cached_obj.get("brands") or []
                brand_str = brands_list[0] if brands_list else "EDION"
                cats_list = cached_obj.get("categories") or []
                if query.strip():
                    q_terms = [t for t in query.strip().split() if t]
                    searchable_blob = f"{title_str} {brand_str} {' '.join(cats_list)} {' '.join(sum(c_attrs.values(), []))}".lower()
                    if not any(qt.lower() in searchable_blob for qt in q_terms):
                        continue

                p_info = cached_obj.get("priceInfo") or {}
                pr = float(p_info.get("price") or 0.0)
                opr = float(p_info.get("originalPrice") or pr)
                disc = int(round((1.0 - (pr / opr)) * 100)) if opr > pr and opr > 0 else 0
                r_obj = cached_obj.get("rating") or {}

                img_u = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/DAIKIN_AIR_CONDITIONER_INDOOR_UNIT_%2814%29.jpg/960px-DAIKIN_AIR_CONDITIONER_INDOOR_UNIT_%2814%29.jpg"
                m_seed = re.match(r"^([A-Za-z0-9]+_[A-Za-z0-9]+_\d+)", pid)
                if m_seed:
                    base_seed = m_seed.group(1)
                    static_root = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
                    if os.path.exists(os.path.join(static_root, "img", "products", f"{base_seed}.jpg")):
                        img_u = f"/static/img/products/{base_seed}.jpg"

                c_vars = _VARIANTS_BY_PARENT.get(pid, [])
                filtered_products.append(ProductCardItem(
                    id=pid,
                    type="PRIMARY",
                    primary_product_id=cached_obj.get("primaryProductId"),
                    title=title_str,
                    brand=brand_str,
                    categories=cats_list,
                    price=pr,
                    original_price=opr,
                    discount_rate=disc,
                    currency_code=str(p_info.get("currencyCode") or "JPY"),
                    rating=float(r_obj.get("averageRating") or 4.7),
                    rating_count=int(r_obj.get("ratingCount") or 28),
                    image_url=img_u,
                    pdp_url=str(cached_obj.get("uri") or f"#product-{pid}"),
                    availability=str(cached_obj.get("availability") or "IN_STOCK"),
                    attributes=c_attrs,
                    variant_count=len(c_vars),
                    variant_options=[]
                ))
                if len(filtered_products) >= 24:
                    break

        products = filtered_products
        total_size = len(products)

    # Transform Facets from Retail API response
    facets: List[FacetGroup] = []
    for f_raw in (raw_resp.get("facets") or []):
        f_key = f_raw.get("key", "")
        vals_list = []
        for v in (f_raw.get("values") or []):
            val_str = str(v.get("value") or "").strip()
            cnt = int(v.get("count") or 0)
            if val_str and cnt > 0:
                vals_list.append(FacetValueItem(value=val_str, count=cnt))
        if f_key and vals_list:
            facets.append(FacetGroup(
                key=f_key,
                display_name=format_facet_display_name(f_key),
                values=vals_list
            ))

    # If Retail API facets are not yet indexed on a freshly created ServingConfig, aggregate from Retail API matched results
    if not facets and products:
        brand_counts: Dict[str, int] = {}
        cat_counts: Dict[str, int] = {}
        attr_counts: Dict[str, Dict[str, int]] = {}
        for p in products:
            if p.brand:
                brand_counts[p.brand] = brand_counts.get(p.brand, 0) + 1
            for c in p.categories:
                top_c = c.split(">")[0].strip()
                if top_c:
                    cat_counts[top_c] = cat_counts.get(top_c, 0) + 1
            for ak, avals in p.attributes.items():
                if ak in ("item_tier", "parent_id", "series_code"):
                    continue
                fkey = f"attributes.{ak}"
                for av in avals:
                    attr_counts.setdefault(fkey, {})[av] = attr_counts.get(fkey, {}).get(av, 0) + 1

        if brand_counts:
            facets.append(FacetGroup(
                key="brands",
                display_name=format_facet_display_name("brands"),
                values=[FacetValueItem(value=k, count=v) for k, v in sorted(brand_counts.items(), key=lambda x: -x[1])]
            ))
        if cat_counts:
            facets.append(FacetGroup(
                key="categories",
                display_name=format_facet_display_name("categories"),
                values=[FacetValueItem(value=k, count=v) for k, v in sorted(cat_counts.items(), key=lambda x: -x[1])]
            ))
        for fkey, vmap in attr_counts.items():
            facets.append(FacetGroup(
                key=fkey,
                display_name=format_facet_display_name(fkey),
                values=[FacetValueItem(value=k, count=v) for k, v in sorted(vmap.items(), key=lambda x: -x[1])[:10]]
            ))

    # Build Visual Tile Navigation items:
    # 1. First check native Google Cloud Retail API tileNavigationResult.tiles
    tiles: List[TileItem] = []
    seen_tile_keys = set()

    default_img = products[0].image_url if products else "/static/img/products/ED_AC_001.jpg"

    native_tiles = (raw_resp.get("tileNavigationResult") or {}).get("tiles") or []
    for nt in native_tiles:
        pav = nt.get("productAttributeValue") or {}
        ak = str(pav.get("name") or "")
        av = str(pav.get("value") or "")
        if ak and av and (ak, av) not in seen_tile_keys:
            seen_tile_keys.add((ak, av))
            # Find matching product image if available
            matched_img = default_img
            for p in products:
                if ak == "brands" and p.brand == av:
                    matched_img = p.image_url
                    break
                elif ak.startswith("attributes.") and av in p.attributes.get(ak.replace("attributes.", ""), []):
                    matched_img = p.image_url
                    break
            tiles.append(TileItem(
                attribute_key=ak,
                attribute_value=av,
                display_label=av,
                image_url=matched_img
            ))

    # 2. Ensure any currently active custom attribute tile stays visible so the user can toggle it off
    for req_k, req_vals in custom_attr_filters.items():
        ak = f"attributes.{req_k}"
        for rv in req_vals:
            if (ak, rv) not in seen_tile_keys:
                seen_tile_keys.add((ak, rv))
                tiles.append(TileItem(
                    attribute_key=ak,
                    attribute_value=rv,
                    display_label=rv,
                    image_url=default_img
                ))

    # 3. Augment up to 8 visual tiles from AICS matched products (prioritizing top brands + key attributes)
    for p in products:
        if len(tiles) >= 8:
            break
        # Add brand tile (natively indexed by Retail API filter)
        if p.brand and ("brands", p.brand) not in seen_tile_keys and len(tiles) < 4:
            seen_tile_keys.add(("brands", p.brand))
            tiles.append(TileItem(
                attribute_key="brands",
                attribute_value=p.brand,
                display_label=p.brand,
                image_url=p.image_url
            ))
        # Add key feature/spec attribute tile
        for attr_k, attr_vals in p.attributes.items():
            if attr_k in ("item_tier", "parent_id", "series_code"):
                continue
            for v in attr_vals:
                ak = f"attributes.{attr_k}"
                if (ak, v) not in seen_tile_keys and len(tiles) < 8:
                    seen_tile_keys.add((ak, v))
                    tiles.append(TileItem(
                        attribute_key=ak,
                        attribute_value=v,
                        display_label=v,
                        image_url=p.image_url
                    ))

    return SearchResponse(
        query=query,
        total_size=total_size,
        next_page_token=str(raw_resp.get("nextPageToken") or ""),
        attribution_token=str(raw_resp.get("attributionToken") or ""),
        query_expansion_info=raw_resp.get("queryExpansionInfo") or {},
        engine_used=engine_used,
        execution_ms=execution_ms,
        facets=facets,
        tiles=tiles,
        products=products,
        raw_upstream_request=raw_req,
        raw_upstream_response=raw_resp
    )
