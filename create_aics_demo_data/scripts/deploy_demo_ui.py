#!/usr/bin/env python3
"""
Cloud Run Demo UI Deployment Script.

Packages the customer-branded `template/` application along with the generated `products.jsonl`
snapshot and `brand_config.json`, then deploys directly to Google Cloud Run via `gcloud run deploy`.
"""

import argparse
import os
import re
import shutil
import subprocess
import sys

SDK_BIN = "/usr/local/google/home/minsoojun/google-cloud-sdk/bin"
if os.path.exists(SDK_BIN) and SDK_BIN not in os.environ.get("PATH", ""):
    os.environ["PATH"] = f"{SDK_BIN}:{os.environ.get('PATH', '')}"


def run_cmd(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    print(f"  $ {' '.join(cmd)}")
    return subprocess.run(cmd, text=True, capture_output=True, check=check)


def sanitize_service_name(name: str) -> str:
    clean = re.sub(r"[^a-z0-9-]", "-", name.lower()).strip("-")
    clean = re.sub(r"-+", "-", clean)
    if not clean or not clean[0].isalpha():
        clean = "aics-" + clean
    return clean[:48]


def main():
    parser = argparse.ArgumentParser(description="Deploy Customer-Branded AICS Demo UI to Cloud Run")
    parser.add_argument("--project-id", required=True, help="GCP Project ID")
    parser.add_argument("--service-name", default="aics-demo-ui", help="Cloud Run Service Name")
    parser.add_argument("--region", default="asia-northeast1", help="Cloud Run Region (default: asia-northeast1)")
    parser.add_argument("--dataset", default="aics_demo", help="BigQuery Dataset name")
    parser.add_argument("--table", default="products", help="BigQuery Table name")
    parser.add_argument("--catalog-file", default="products.jsonl", help="Path to generated products.jsonl")
    parser.add_argument("--brand-config", default="brand_config.json", help="Path to generated brand_config.json")
    parser.add_argument("--build-dir", default="/tmp/aics_cloudrun_build", help="Temporary staging directory for build")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    template_dir = os.path.join(os.path.dirname(script_dir), "template")

    if not os.path.exists(template_dir):
        print(f"❌ Template directory not found: {template_dir}", file=sys.stderr)
        sys.exit(1)

    service_name = sanitize_service_name(args.service_name)

    print(f"📁 Preparing Cloud Run build staging directory at `{args.build_dir}`...")
    if os.path.exists(args.build_dir):
        shutil.rmtree(args.build_dir)
    shutil.copytree(template_dir, args.build_dir)

    # Copy generated catalog and brand config into container build directory
    if os.path.exists(args.catalog_file):
        shutil.copy2(args.catalog_file, os.path.join(args.build_dir, "products.jsonl"))
        print(f"  ✓ Bundled `{args.catalog_file}` for Instant BigQuery/Local Fallback Search.")
    if os.path.exists(args.brand_config):
        shutil.copy2(args.brand_config, os.path.join(args.build_dir, "brand_config.json"))
        print(f"  ✓ Bundled `{args.brand_config}` for Dynamic Customer Brand Theme.")

    env_vars = (
        f"PROJECT_ID={args.project_id},"
        f"BQ_DATASET={args.dataset},"
        f"BQ_TABLE={args.table},"
        f"BRAND_CONFIG_PATH=brand_config.json,"
        f"LOCAL_CATALOG_PATH=products.jsonl"
    )

    os.environ["CLOUDSDK_CORE_DISABLE_PROMPTS"] = "1"
    print(f"🚀 Deploying `{service_name}` to Google Cloud Run (Project: {args.project_id}, Region: {args.region})...")
    deploy_cmd = [
        "gcloud", "run", "deploy", service_name,
        "--quiet",
        "--source", args.build_dir,
        "--project", args.project_id,
        "--region", args.region,
        "--platform", "managed",
        "--allow-unauthenticated",
        "--set-env-vars", env_vars
    ]
    res = run_cmd(deploy_cmd, check=False)
    if res.returncode != 0:
        print(f"❌ Cloud Run deployment failed:\n{res.stdout}\n{res.stderr}", file=sys.stderr)
        sys.exit(1)

    print("🔓 Ensuring public unauthenticated access (`allUsers` -> `roles/run.invoker`)...")
    run_cmd([
        "gcloud", "run", "services", "add-iam-policy-binding", service_name,
        "--project", args.project_id,
        "--region", args.region,
        "--member=allUsers",
        "--role=roles/run.invoker",
        "--quiet"
    ], check=False)

    # Fetch service URL
    url_res = run_cmd([
        "gcloud", "run", "services", "describe", service_name,
        "--project", args.project_id,
        "--region", args.region,
        "--format=value(status.url)"
    ], check=False)
    service_url = url_res.stdout.strip()

    print("====================================================================")
    print("🎉 Cloud Run Demo UI Deployment Successful!")
    print("====================================================================")
    print(f"  • Service Name : {service_name}")
    print(f"  • Live Demo URL: {service_url}")
    print("====================================================================")


if __name__ == "__main__":
    main()
