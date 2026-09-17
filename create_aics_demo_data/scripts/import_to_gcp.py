#!/usr/bin/env python3
"""
BigQuery Table Ingestion & Google Cloud Retail API (AICS) Import Script.

1. Creates BigQuery Dataset (default: `aics_demo`) and Table (default: `products`).
2. Loads `products.jsonl` using official `AI_Commerce_Search_Bigquery_schema.json`.
3. Triggers Google Cloud Retail API `products:import` from BigQuery into `default_catalog/branches/0`.
"""

import argparse
import json
import os
import subprocess
import sys
import urllib.request
import urllib.error

SDK_BIN = "/usr/local/google/home/minsoojun/google-cloud-sdk/bin"
if os.path.exists(SDK_BIN) and SDK_BIN not in os.environ.get("PATH", ""):
    os.environ["PATH"] = f"{SDK_BIN}:{os.environ.get('PATH', '')}"


def run_cmd(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    print(f"  $ {' '.join(cmd)}")
    return subprocess.run(cmd, text=True, capture_output=True, check=check)


def get_access_token() -> str:
    res = run_cmd(["gcloud", "auth", "print-access-token"], check=True)
    return res.stdout.strip()


def ensure_bq_dataset(project_id: str, dataset: str, location: str = "US"):
    os.environ["CLOUDSDK_CORE_PROJECT"] = project_id
    print(f"📦 Ensuring BigQuery Dataset `{project_id}:{dataset}` exists (location={location})...")
    check_res = run_cmd(["bq", f"--project_id={project_id}", "show", f"{project_id}:{dataset}"], check=False)
    if check_res.returncode == 0:
        print(f"  ✓ Dataset `{project_id}:{dataset}` already exists.")
        return

    mk_res = run_cmd([
        "bq", f"--project_id={project_id}", f"--location={location}", "mk", "--dataset",
        "--description", "AI Commerce Search Demo Catalog Dataset",
        f"{project_id}:{dataset}"
    ], check=False)
    if mk_res.returncode != 0:
        print(f"❌ Failed to create BigQuery dataset:\n{mk_res.stdout}\n{mk_res.stderr}", file=sys.stderr)
        sys.exit(1)
    print(f"  ✓ Created Dataset `{project_id}:{dataset}`.")


def load_to_bigquery(project_id: str, dataset: str, table: str, jsonl_path: str, schema_path: str):
    os.environ["CLOUDSDK_CORE_PROJECT"] = project_id
    target_table = f"{project_id}:{dataset}.{table}"
    print(f"⬆️ Loading `{jsonl_path}` into BigQuery table `{target_table}`...")
    res = run_cmd([
        "bq", f"--project_id={project_id}", "load",
        "--replace",
        "--source_format=NEWLINE_DELIMITED_JSON",
        target_table,
        jsonl_path,
        schema_path
    ], check=False)
    if res.returncode != 0:
        print(f"❌ Failed to load data into BigQuery:\n{res.stdout}\n{res.stderr}", file=sys.stderr)
        sys.exit(1)
    print(f"  ✓ Successfully loaded products into BigQuery `{target_table}`!")


def ensure_retail_search_enrolled(project_id: str, token: str):
    """Ensures Retail API Data Use Terms are accepted and SOLUTION_TYPE_SEARCH is enrolled."""
    print(f"🛍️ Verifying AI Commerce Search Terms & Solution Enrollment for `{project_id}`...")
    # 1. Accept Terms
    accept_url = f"https://retail.googleapis.com/v2alpha/projects/{project_id}/retailProject:acceptTerms"
    req_accept = urllib.request.Request(
        accept_url,
        data=b"{}",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-Goog-User-Project": project_id
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req_accept, timeout=30) as resp:
            print("  ✓ Retail API Data Use Terms verified/accepted.")
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="ignore")
        print(f"  ℹ️ acceptTerms status ({e.code}): {err[:150]}")

    # 2. Enroll Search Solution
    enroll_url = f"https://retail.googleapis.com/v2alpha/projects/{project_id}:enrollSolution"
    enroll_payload = json.dumps({"solution": "SOLUTION_TYPE_SEARCH"}).encode("utf-8")
    req_enroll = urllib.request.Request(
        enroll_url,
        data=enroll_payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-Goog-User-Project": project_id
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req_enroll, timeout=30) as resp:
            print("  ✓ Enrolled in Retail Search (`SOLUTION_TYPE_SEARCH`).")
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="ignore")
        if "already enrolled" in err.lower() or e.code == 409 or e.code == 400:
            print("  ✓ Project is already enrolled or ready for SOLUTION_TYPE_SEARCH.")
        else:
            print(f"  ℹ️ enrollSolution response ({e.code}): {err[:150]}")


def poll_retail_operation(project_id: str, op_name: str, token: str, timeout_sec: int = 600):
    """Polls the Retail API long-running operation until done."""
    import time
    op_url = f"https://retail.googleapis.com/v2/{op_name}"
    start_time = time.time()
    print(f"⏳ Polling Retail API Operation `{op_name}` until indexing completes...")
    while time.time() - start_time < timeout_sec:
        req = urllib.request.Request(
            op_url,
            headers={
                "Authorization": f"Bearer {token}",
                "X-Goog-User-Project": project_id
            },
            method="GET"
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                done = data.get("done", False)
                meta = data.get("metadata", {})
                success_cnt = meta.get("successCount", 0)
                failure_cnt = meta.get("failureCount", 0)
                if done:
                    print(f"  ✅ Retail API Import Operation COMPLETED!")
                    print(f"     • Success Count : {success_cnt}")
                    print(f"     • Failure Count : {failure_cnt}")
                    if "error" in data:
                        print(f"     ⚠️ Operation Error: {data['error']}")
                    return data
                else:
                    elapsed = int(time.time() - start_time)
                    print(f"  ... [{elapsed}s] In progress (successCount={success_cnt}, failureCount={failure_cnt})...")
        except Exception as e:
            print(f"  ⚠️ Poll warning: {e}")
        time.sleep(10)
    print("⚠️ Polling timed out after 600s, operation continues in background.")
    return None


def trigger_retail_api_import(project_id: str, dataset: str, table: str, branch_id: str = "0", wait_for_completion: bool = True):
    token = get_access_token()
    ensure_retail_search_enrolled(project_id, token)

    print(f"🔄 Triggering Google Cloud Retail API `products:import` from `{project_id}.{dataset}.{table}` into Branch `{branch_id}`...")
    url = (
        f"https://retail.googleapis.com/v2/projects/{project_id}/locations/global/"
        f"catalogs/default_catalog/branches/{branch_id}/products:import"
    )
    payload = {
        "inputConfig": {
            "bigQuerySource": {
                "projectId": project_id,
                "datasetId": dataset,
                "tableId": table,
                "dataSchema": "product"
            }
        },
        "reconciliationMode": "FULL"
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-Goog-User-Project": project_id
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp_data = json.loads(resp.read().decode("utf-8"))
            op_name = resp_data.get("name", "UNKNOWN_OPERATION")
            print(f"  ✓ Retail API Import Operation Started: {op_name}")
            if wait_for_completion and op_name != "UNKNOWN_OPERATION":
                poll_retail_operation(project_id, op_name, token)
            return op_name
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        print(f"❌ Error: Retail API import request returned HTTP {e.code}:\n{err_body}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Load AICS catalog to BigQuery and import to Retail API")
    parser.add_argument("--project-id", required=True, help="GCP Project ID")
    parser.add_argument("--dataset", default="aics_demo", help="BigQuery Dataset name (default: aics_demo)")
    parser.add_argument("--table", default="products", help="BigQuery Table name (default: products)")
    parser.add_argument("--bq-location", default="US", help="BigQuery Dataset location (default: US for global Retail API compatibility)")
    parser.add_argument("--catalog-file", default="products.jsonl", help="Path to products.jsonl")
    parser.add_argument("--schema-file", default="", help="Path to AI_Commerce_Search_Bigquery_schema.json")
    parser.add_argument("--skip-retail-import", action="store_true", help="Skip triggering Retail API import")
    parser.add_argument("--no-wait", action="store_true", help="Do not wait for Retail API import operation to complete")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_schema = os.path.join(os.path.dirname(script_dir), "resources", "AI_Commerce_Search_Bigquery_schema.json")
    schema_path = args.schema_file or default_schema

    if not os.path.exists(args.catalog_file):
        print(f"❌ Catalog JSONL file not found: {args.catalog_file}", file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(schema_path):
        print(f"❌ Schema JSON file not found: {schema_path}", file=sys.stderr)
        sys.exit(1)

    ensure_bq_dataset(args.project_id, args.dataset, args.bq_location)
    load_to_bigquery(args.project_id, args.dataset, args.table, args.catalog_file, schema_path)

    if not args.skip_retail_import:
        trigger_retail_api_import(args.project_id, args.dataset, args.table, wait_for_completion=not args.no_wait)

    print("====================================================================")
    print("✅ BigQuery & Retail API Ingestion Pipeline Complete!")
    print(f"  • BigQuery Table : {args.project_id}.{args.dataset}.{args.table}")
    print("====================================================================")


if __name__ == "__main__":
    main()
