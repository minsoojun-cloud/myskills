#!/usr/bin/env python3
"""
Deterministic AICS Product Catalog Expander & Generator (Token-Efficient Architecture)

Supports Japanese (`ja-JP`) as the default target language, while allowing users to specify
any ISO language code (e.g., `ja-JP`, `en-US`, `ko-KR`).
"""

import argparse
import itertools
import json
import os
import random
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


DEFAULT_CURRENCY_BY_LANG = {
    "ja": "JPY",
    "en": "USD",
    "ko": "KRW"
}

LOCALIZED_SERIES_MODIFIERS = {
    "ja": [
        {"suffix": "特別セット (Special Edition)", "price_mult": 1.25, "tag": "special_edition"},
        {"suffix": "プレミアムモデル (PRO)", "price_mult": 1.40, "tag": "premium_line"},
        {"suffix": "デイリーライト仕様", "price_mult": 0.85, "tag": "daily_light"},
        {"suffix": "WEB限定大容量パック", "price_mult": 1.50, "tag": "online_exclusive"},
        {"suffix": "季節限定リミテッド", "price_mult": 1.15, "tag": "seasonal_limited"},
        {"suffix": "ギフトボックス仕様", "price_mult": 1.35, "tag": "gift_box"}
    ],
    "en": [
        {"suffix": "Special Edition Set", "price_mult": 1.25, "tag": "special_edition"},
        {"suffix": "PRO Premium Line", "price_mult": 1.40, "tag": "premium_line"},
        {"suffix": "Daily Light Edition", "price_mult": 0.85, "tag": "daily_light"},
        {"suffix": "Online Exclusive Jumbo Pack", "price_mult": 1.50, "tag": "online_exclusive"},
        {"suffix": "Seasonal Limited Edition", "price_mult": 1.15, "tag": "seasonal_limited"},
        {"suffix": "Deluxe Gift Box Edition", "price_mult": 1.35, "tag": "gift_box"}
    ],
    "ko": [
        {"suffix": "기획 세트 (Special Edition)", "price_mult": 1.25, "tag": "special_edition"},
        {"suffix": "프리미엄 라인 (PRO)", "price_mult": 1.40, "tag": "premium_line"},
        {"suffix": "라이트 데일리 에디션", "price_mult": 0.85, "tag": "daily_light"},
        {"suffix": "온라인 단독 대용량 패키지", "price_mult": 1.50, "tag": "online_exclusive"},
        {"suffix": "시즌 한정 리미티드", "price_mult": 1.15, "tag": "seasonal_limited"},
        {"suffix": "기프트 박스 에디션", "price_mult": 1.35, "tag": "gift_box"}
    ]
}

OPTION_LABEL_PREFIX = {
    "ja": "オプション",
    "en": "Options",
    "ko": "옵션"
}


def get_lang_prefix(iso_code: str) -> str:
    code = (iso_code or "ja-JP").lower().strip()
    if code.startswith("en"):
        return "en"
    if code.startswith("ko"):
        return "ko"
    return "ja"


def to_snake_case(key: str) -> str:
    """Converts any attribute key to clean alphanumeric snake_case required by Retail API."""
    key = re.sub(r"[^a-zA-Z0-9_]", "_", key.strip())
    key = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", key)
    key = re.sub(r"_+", "_", key).lower().strip("_")
    if not key or not key[0].isalpha():
        key = "attr_" + key
    return key[:64]


def clean_empty_values(obj: Any) -> Any:
    """Recursively removes None, empty lists, and empty dicts to comply with Retail BQ schema rules."""
    if isinstance(obj, dict):
        cleaned = {}
        for k, v in obj.items():
            c_val = clean_empty_values(v)
            if c_val is not None and c_val != [] and c_val != {}:
                cleaned[k] = c_val
        return cleaned
    elif isinstance(obj, list):
        cleaned = [clean_empty_values(item) for item in obj]
        return [item for item in cleaned if item is not None and item != [] and item != {}]
    return obj


def build_attributes_list(attr_dict: Dict[str, Any], extra_kv: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
    """Builds the BigQuery repeated RECORD structure for `attributes`."""
    merged: Dict[str, List[str]] = {}
    for k, v in (attr_dict or {}).items():
        clean_k = to_snake_case(k)
        if isinstance(v, list):
            vals = [str(x).strip() for x in v if str(x).strip()]
        else:
            vals = [str(v).strip()] if str(v).strip() else []
        if vals:
            merged[clean_k] = vals

    if extra_kv:
        for k, v in extra_kv.items():
            clean_k = to_snake_case(k)
            val_str = str(v).strip()
            if val_str:
                if clean_k in merged:
                    if val_str not in merged[clean_k]:
                        merged[clean_k].append(val_str)
                else:
                    merged[clean_k] = [val_str]

    result = []
    for k, text_list in merged.items():
        result.append({
            "key": k,
            "value": {
                "text": text_list
            }
        })
    return result


def expand_seed_variants(seed: Dict[str, Any], brand_profile: Dict[str, Any], seed_index: int) -> List[Dict[str, Any]]:
    """
    Expands a single primary seed into:
    - 1 PRIMARY product record
    - N VARIANT product records (if variant_axes exist)
    """
    lang_iso = brand_profile.get("language_code", "ja-JP")
    lang_prefix = get_lang_prefix(lang_iso)
    currency = brand_profile.get("currency_code") or DEFAULT_CURRENCY_BY_LANG.get(lang_prefix, "JPY")
    pdp_base = brand_profile.get("pdp_base_url", "https://example.com/product/")

    primary_id = str(seed.get("seed_id") or f"PROD_{seed_index:04d}").strip()
    title = str(seed.get("title", "Sample Product")).strip()
    brand = str(seed.get("brand") or brand_profile.get("brand_name", "Brand")).strip()
    categories = seed.get("categories") or ["General > Products"]
    description = str(seed.get("description") or title).strip()
    base_price = float(seed.get("base_price", 2990 if currency == "JPY" else 19900))
    orig_price = float(seed.get("original_price", round(base_price * 1.2, -1 if currency == "JPY" else -2)))
    img_url = str(seed.get("image_url") or "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80").strip()
    raw_attrs = seed.get("attributes") or {}

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    rating_count = int(seed.get("rating_count") or random.randint(18, 850))
    avg_rating = float(seed.get("average_rating") or round(random.uniform(4.3, 4.95), 2))

    # 1. Create PRIMARY Product
    primary_record = {
        "id": primary_id,
        "type": "PRIMARY",
        "title": title,
        "brands": [brand],
        "categories": categories,
        "description": description,
        "languageCode": lang_iso,
        "priceInfo": {
            "currencyCode": currency,
            "price": base_price,
            "originalPrice": max(base_price, orig_price)
        },
        "availability": "IN_STOCK",
        "availableQuantity": random.randint(30, 300),
        "rating": {
            "ratingCount": rating_count,
            "averageRating": avg_rating
        },
        "uri": f"{pdp_base}{primary_id}",
        "images": [
            {
                "uri": img_url,
                "height": 600,
                "width": 600
            }
        ],
        "publishTime": now_iso,
        "attributes": build_attributes_list(raw_attrs, {"item_tier": "primary"})
    }

    records = [clean_empty_values(primary_record)]

    # 2. Check for variant_axes
    variant_axes: Dict[str, List[Any]] = seed.get("variant_axes") or {}
    if not variant_axes:
        return records

    axis_names = list(variant_axes.keys())
    axis_options_lists = []
    for axis in axis_names:
        opts = variant_axes[axis]
        norm_opts = []
        for opt in opts:
            if isinstance(opt, dict):
                norm_opts.append({
                    "label": str(opt.get("label", "Standard")),
                    "price_delta": float(opt.get("price_delta", 0)),
                    "image_url": opt.get("image_url", img_url)
                })
            else:
                norm_opts.append({
                    "label": str(opt),
                    "price_delta": 0.0,
                    "image_url": img_url
                })
        axis_options_lists.append(norm_opts)

    opt_prefix = OPTION_LABEL_PREFIX.get(lang_prefix, "オプション")
    combinations = list(itertools.product(*axis_options_lists))
    for v_idx, combo in enumerate(combinations, start=1):
        variant_id = f"{primary_id}_V{v_idx:02d}"
        labels = [c["label"] for c in combo]
        total_delta = sum(c["price_delta"] for c in combo)
        variant_img = next((c["image_url"] for c in combo if c.get("image_url")), img_url)

        variant_title = f"{title} ({' / '.join(labels)})"
        variant_price = max(1.0, base_price + total_delta)
        variant_orig = max(variant_price, orig_price + total_delta)

        extra_attrs = {"item_tier": "variant", "parent_id": primary_id}
        colors = []
        sizes = []
        for axis_name, chosen in zip(axis_names, combo):
            clean_axis = to_snake_case(axis_name)
            extra_attrs[clean_axis] = chosen["label"]
            if "color" in clean_axis or "カラー" in axis_name or "색상" in axis_name:
                colors.append(chosen["label"])
            if "size" in clean_axis or "volume" in clean_axis or "サイズ" in axis_name or "용량" in axis_name:
                sizes.append(chosen["label"])

        variant_record = {
            "id": variant_id,
            "type": "VARIANT",
            "primaryProductId": primary_id,
            "title": variant_title,
            "brands": [brand],
            "categories": categories,
            "description": f"{description} [{opt_prefix}: {', '.join(labels)}]",
            "languageCode": lang_iso,
            "priceInfo": {
                "currencyCode": currency,
                "price": variant_price,
                "originalPrice": variant_orig
            },
            "availability": "IN_STOCK",
            "availableQuantity": random.randint(10, 150),
            "rating": {
                "ratingCount": max(5, int(rating_count / max(1, len(combinations)))),
                "averageRating": avg_rating
            },
            "uri": f"{pdp_base}{variant_id}",
            "images": [
                {
                    "uri": variant_img,
                    "height": 600,
                    "width": 600
                }
            ],
            "publishTime": now_iso,
            "attributes": build_attributes_list(raw_attrs, extra_attrs)
        }

        if colors:
            variant_record["colorInfo"] = {
                "colorFamilies": colors,
                "colors": colors
            }
        if sizes:
            variant_record["sizes"] = sizes

        records.append(clean_empty_values(variant_record))

    return records


def multiply_seeds_to_target(
    seeds: List[Dict[str, Any]],
    brand_profile: Dict[str, Any],
    target_count: int,
    max_variant_ratio: float = 0.25
) -> List[Dict[str, Any]]:
    """
    Expands primary seeds and series models to reach target_count while strictly
    enforcing that total VARIANT products do not exceed max_variant_ratio (e.g. <= 25-30%).
    """
    if not seeds:
        return []

    max_variants_allowed = int(target_count * max_variant_ratio)
    all_records: List[Dict[str, Any]] = []
    current_variants = 0

    lang_prefix = get_lang_prefix(brand_profile.get("language_code", "ja-JP"))
    series_modifiers = LOCALIZED_SERIES_MODIFIERS.get(lang_prefix, LOCALIZED_SERIES_MODIFIERS["ja"])

    seed_counter = 1
    mod_idx = 0

    while len(all_records) < target_count:
        base_seed = seeds[(seed_counter - 1) % len(seeds)]
        new_seed = json.loads(json.dumps(base_seed))

        if seed_counter > len(seeds):
            mod = series_modifiers[mod_idx % len(series_modifiers)]
            mod_idx += 1
            series_batch = (seed_counter - 1) // (len(seeds) * len(series_modifiers))
            model_suffix = f" [Model-{seed_counter:03d}]" if series_batch > 0 else f" [{mod['tag'].upper()}-{seed_counter:03d}]"
            new_seed["seed_id"] = f"{base_seed.get('seed_id', 'PROD')}_S{seed_counter:03d}"
            new_seed["title"] = f"{base_seed['title']} {mod['suffix']}{model_suffix}"
            base_p = float(base_seed.get("base_price", 2990))
            batch_factor = 1.0 + ((seed_counter % 7) - 3) * 0.02
            round_unit = 10 if brand_profile.get("currency_code") == "JPY" else 100
            new_seed["base_price"] = max(round_unit, round((base_p * mod["price_mult"] * batch_factor) / round_unit) * round_unit)
            new_seed["original_price"] = round((new_seed["base_price"] * 1.2) / round_unit) * round_unit

            attrs = new_seed.get("attributes") or {}
            attrs["edition_type"] = [mod["tag"]]
            attrs["series_code"] = [f"S{seed_counter:03d}"]
            new_seed["attributes"] = attrs

        # Check if we can still add variants under max_variants_allowed budget
        remaining_total_slots = target_count - len(all_records)
        remaining_variant_budget = max_variants_allowed - current_variants

        if remaining_variant_budget <= 0 or remaining_total_slots <= 1:
            # Strip variant_axes so this seed expands as a standalone PRIMARY product
            new_seed["variant_axes"] = {}
            expanded = expand_seed_variants(new_seed, brand_profile, seed_counter)
        else:
            expanded = expand_seed_variants(new_seed, brand_profile, seed_counter)
            # expanded[0] is PRIMARY, expanded[1:] are VARIANTS
            variants_in_expanded = expanded[1:]
            max_v_to_take = min(len(variants_in_expanded), remaining_variant_budget, remaining_total_slots - 1)
            expanded = [expanded[0]] + variants_in_expanded[:max_v_to_take]
            current_variants += max_v_to_take

        all_records.extend(expanded)
        seed_counter += 1

    return all_records


def validate_catalog(records: List[Dict[str, Any]], max_variant_ratio: float = 0.30) -> Dict[str, Any]:
    """Validates generated records against AICS BigQuery schema constraints and variant ratio <= 30%."""
    primary_ids = set()
    variant_count = 0
    primary_count = 0
    missing_required = 0

    for r in records:
        if not r.get("id") or not r.get("title"):
            missing_required += 1
        if r.get("type") == "PRIMARY":
            primary_count += 1
            primary_ids.add(r["id"])
        elif r.get("type") == "VARIANT":
            variant_count += 1

    orphan_variants = 0
    for r in records:
        if r.get("type") == "VARIANT":
            parent_id = r.get("primaryProductId")
            if parent_id not in primary_ids:
                orphan_variants += 1

    total = len(records)
    variant_ratio = (variant_count / total) if total > 0 else 0.0
    ratio_valid = variant_ratio <= max_variant_ratio + 0.001

    return {
        "total_records": total,
        "primary_count": primary_count,
        "variant_count": variant_count,
        "variant_ratio_pct": round(variant_ratio * 100, 2),
        "missing_required_fields": missing_required,
        "orphan_variants": orphan_variants,
        "valid": (missing_required == 0 and orphan_variants == 0 and total > 0 and ratio_valid)
    }


def main():
    parser = argparse.ArgumentParser(description="Deterministic AICS Product Catalog Generator")
    parser.add_argument("--blueprint", required=True, help="Path to input blueprint.json")
    parser.add_argument("--language", default="", help="ISO language code override (e.g., ja-JP, en-US, ko-KR). Default: ja-JP")
    parser.add_argument("--output-catalog", default="products.jsonl", help="Path to output products.jsonl")
    parser.add_argument("--output-brand-config", default="brand_config.json", help="Path to output brand_config.json")
    parser.add_argument("--target-count", type=int, default=1050, help="Target minimum number of products to generate (default: 1050)")
    parser.add_argument("--max-variant-ratio", type=float, default=0.25, help="Maximum ratio of VARIANT products (default: 0.25, must be <= 0.30)")
    parser.add_argument("--design-profile", default="", help="Optional path to brand_design_profile.json generated by extract_brand_design.py")
    args = parser.parse_args()

    if not os.path.exists(args.blueprint):
        print(f"❌ Error: Blueprint file not found: {args.blueprint}", file=sys.stderr)
        sys.exit(1)

    with open(args.blueprint, "r", encoding="utf-8") as f:
        blueprint = json.load(f)

    brand_profile = blueprint.get("brand_profile", {})
    if args.design_profile and os.path.exists(args.design_profile):
        with open(args.design_profile, "r", encoding="utf-8") as df:
            design_data = json.load(df)
            for k in ("logo_url", "primary_color", "secondary_color", "accent_color", "header_bg", "badge_text_color", "price_color", "search_radius"):
                if design_data.get(k) and not brand_profile.get(k):
                    brand_profile[k] = design_data[k]

    if args.language.strip():
        brand_profile["language_code"] = args.language.strip()
    elif not brand_profile.get("language_code"):
        brand_profile["language_code"] = "ja-JP"

    lang_prefix = get_lang_prefix(brand_profile["language_code"])
    if not brand_profile.get("currency_code"):
        brand_profile["currency_code"] = DEFAULT_CURRENCY_BY_LANG.get(lang_prefix, "JPY")

    primary_seeds = blueprint.get("primary_seeds", [])

    print(
        f"Loaded blueprint for brand: {brand_profile.get('brand_name', 'Unknown')} "
        f"| ISO Language: {brand_profile['language_code']} | Currency: {brand_profile['currency_code']} "
        f"({len(primary_seeds)} primary seeds)"
    )

    records = multiply_seeds_to_target(primary_seeds, brand_profile, args.target_count, args.max_variant_ratio)
    stats = validate_catalog(records, max_variant_ratio=0.30)

    # Write products.jsonl
    os.makedirs(os.path.dirname(os.path.abspath(args.output_catalog)), exist_ok=True)
    with open(args.output_catalog, "w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    # Extract all top categories for UI category tabs
    all_categories = []
    for r in records:
        for cat in r.get("categories", []):
            top_cat = cat.split(">")[0].strip()
            if top_cat and top_cat not in all_categories:
                all_categories.append(top_cat)

    brand_config_out = {
        **brand_profile,
        "categories": all_categories[:8],
        "catalog_stats": stats,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

    os.makedirs(os.path.dirname(os.path.abspath(args.output_brand_config)), exist_ok=True)
    with open(args.output_brand_config, "w", encoding="utf-8") as f:
        json.dump(brand_config_out, f, ensure_ascii=False, indent=2)

    print("====================================================================")
    print("✅ AICS Product Catalog Generation & Validation Complete!")
    print("====================================================================")
    print(f"  • ISO Language Code      : {brand_profile['language_code']}")
    print(f"  • Output JSONL File      : {args.output_catalog}")
    print(f"  • Output Brand Config    : {args.output_brand_config}")
    print(f"  • Total Products         : {stats['total_records']}")
    print(f"  • Primary Products       : {stats['primary_count']} ({round(stats['primary_count']/max(1, stats['total_records'])*100, 1)}%)")
    print(f"  • Variant Products       : {stats['variant_count']} ({stats['variant_ratio_pct']}% <= 30.0% limit)")
    print(f"  • Orphan Variants        : {stats['orphan_variants']} (Must be 0)")
    print(f"  • Schema Compliance      : {'PASS' if stats['valid'] else 'FAIL'}")
    print("====================================================================")

    if not stats["valid"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
