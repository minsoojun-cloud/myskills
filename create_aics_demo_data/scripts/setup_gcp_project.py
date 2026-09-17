#!/usr/bin/env python3
"""
GCP Project Setup, IAM, Org Policy & AI Commerce Search (Retail API) Enrollment Script.

Handles:
1. Checking or creating a new GCP project (`gcloud projects create`).
2. Linking active billing account.
3. Enabling required APIs (`bigquery`, `retail`, `run`, `cloudbuild`, `artifactregistry`, `aiplatform`, `orgpolicy`).
4. Granting Cloud Build / Storage / Retail / BigQuery IAM roles to default Compute Service Account.
5. Configuring Organization Policy v2 (`iam.allowedPolicyMemberDomains` -> `allowAll: true`) for public Cloud Run URLs.
6. Programmatically accepting Retail API Data Use Terms (`v2alpha/projects/*/retailProject:acceptTerms`)
   and enrolling the project in AI Commerce Search (`v2alpha/projects/*:enrollSolution` -> `SOLUTION_TYPE_SEARCH`).
"""

import argparse
import json
import os
import random
import re
import subprocess
import sys
import time
import urllib.request
import urllib.error
from typing import Optional

# Ensure gcloud/bq binaries in google-cloud-sdk are in PATH
SDK_BIN = "/usr/local/google/home/minsoojun/google-cloud-sdk/bin"
if os.path.exists(SDK_BIN) and SDK_BIN not in os.environ.get("PATH", ""):
    os.environ["PATH"] = f"{SDK_BIN}:{os.environ.get('PATH', '')}"

os.environ["CLOUDSDK_CORE_DISABLE_PROMPTS"] = "1"

REQUIRED_APIS = [
    "bigquery.googleapis.com",
    "retail.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "aiplatform.googleapis.com",
    "orgpolicy.googleapis.com",
]


def run_cmd(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    print(f"  $ {' '.join(cmd)}")
    return subprocess.run(cmd, text=True, capture_output=True, check=check)


def get_access_token() -> str:
    res = run_cmd(["gcloud", "auth", "print-access-token"], check=True)
    return res.stdout.strip()


def get_active_billing_account() -> Optional[str]:
    res = run_cmd(["gcloud", "billing", "accounts", "list", "--filter=open=true", "--format=json"], check=False)
    if res.returncode == 0 and res.stdout.strip():
        try:
            accounts = json.loads(res.stdout)
            if accounts:
                return accounts[0].get("name", "").replace("billingAccounts/", "")
        except Exception:
            pass
    return None


def check_project_exists(project_id: str) -> bool:
    res = run_cmd(["gcloud", "projects", "describe", project_id, "--format=json"], check=False)
    return res.returncode == 0


import string


def generate_default_project_id() -> str:
    """Generates a globally unique GCP Project ID in format: aics-demo-site-xxxxx-999999 (27 chars)."""
    rand_alpha = "".join(random.choices(string.ascii_lowercase, k=5))
    rand_digits = f"{random.randint(0, 999999):06d}"
    return f"aics-demo-site-{rand_alpha}-{rand_digits}"


def resolve_project_id_pattern(raw_id: str) -> str:
    """
    If raw_id is empty or contains placeholder pattern like 'xxxxx' or '9999',
    dynamically replaces 'xxxxx' with 5 random lowercase letters and '9999'/'999999' with 6 random digits.
    """
    if not raw_id:
        return generate_default_project_id()
    resolved = raw_id.strip().lower()
    if "xxxxx" in resolved or "9999" in resolved:
        rand_alpha = "".join(random.choices(string.ascii_lowercase, k=5))
        rand_digits = f"{random.randint(0, 999999):06d}"
        resolved = resolved.replace("xxxxx", rand_alpha)
        resolved = re.sub(r"999999|9999", rand_digits, resolved)
    return resolved


def create_new_project(brand_slug: str = "") -> str:
    project_id = generate_default_project_id()

    print(f"🚀 Creating new GCP project (v1.0 format): {project_id}")
    display_name = f"AICS Demo {brand_slug[:14]}".strip() if brand_slug else "AICS Demo Site"
    res = run_cmd(["gcloud", "projects", "create", project_id, f"--name={display_name}", "--quiet"], check=False)
    if res.returncode != 0:
        print(f"❌ Failed to create project {project_id}:\n{res.stderr}", file=sys.stderr)
        sys.exit(1)

    billing_account = get_active_billing_account()
    if billing_account:
        print(f"💳 Linking billing account {billing_account} to {project_id}...")
        run_cmd(["gcloud", "billing", "projects", "link", project_id, f"--billing-account={billing_account}", "--quiet"], check=False)
    else:
        print("⚠️ Warning: Could not automatically detect an active billing account.")

    return project_id


def enable_apis(project_id: str):
    print(f"⚙️ Enabling required Google Cloud APIs on project '{project_id}'...")
    cmd = ["gcloud", "services", "enable"] + REQUIRED_APIS + ["--project", project_id, "--quiet"]
    res = run_cmd(cmd, check=False)
    if res.returncode != 0:
        print(f"⚠️ Warning while enabling APIs:\n{res.stderr}", file=sys.stderr)
    else:
        print("✅ All required APIs enabled successfully.")


def configure_compute_service_account_iam(project_id: str):
    print(f"🔐 Granting Cloud Build, Storage, BigQuery & Retail IAM roles to default Compute Service Account...")
    res = run_cmd(["gcloud", "projects", "describe", project_id, "--format=value(projectNumber)"], check=False)
    if res.returncode == 0 and res.stdout.strip():
        project_num = res.stdout.strip()
        sa = f"{project_num}-compute@developer.gserviceaccount.com"
        roles = [
            "roles/editor",
            "roles/storage.admin",
            "roles/artifactregistry.admin",
            "roles/logging.logWriter",
            "roles/bigquery.admin",
            "roles/retail.admin"
        ]
        for role in roles:
            run_cmd([
                "gcloud", "projects", "add-iam-policy-binding", project_id,
                f"--member=serviceAccount:{sa}",
                f"--role={role}",
                "--quiet"
            ], check=False)
        print(f"✅ Granted IAM roles to `{sa}`.")


def allow_public_cloud_run_access(project_id: str):
    print(f"🌐 Configuring Organization Policy v2 (`iam.allowedPolicyMemberDomains` -> allowAll)...")
    policy_yaml = (
        f"name: projects/{project_id}/policies/iam.allowedPolicyMemberDomains\n"
        f"spec:\n"
        f"  rules:\n"
        f"  - allowAll: true\n"
    )
    policy_path = f"/tmp/orgpolicy_{project_id}.yaml"
    try:
        with open(policy_path, "w", encoding="utf-8") as f:
            f.write(policy_yaml)
        run_cmd(["gcloud", "org-policies", "set-policy", policy_path, f"--project={project_id}", "--quiet"], check=False)
        print("  ✓ Organization policy updated (`iam.allowedPolicyMemberDomains` -> allowAll).")
    except Exception as e:
        print(f"  ⚠️ Warning updating org policy: {e}")


def initialize_aics_retail_project(project_id: str):
    """
    Programmatically accepts Retail API Data Use Terms and enrolls SOLUTION_TYPE_SEARCH
    so the project can immediately import products into AI Commerce Search without manual Console clicks.
    """
    print(f"📜 Programmatically accepting AI Commerce Search Data Use Terms & enrolling SOLUTION_TYPE_SEARCH...")
    token = get_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Goog-User-Project": project_id
    }

    # Wait briefly for retail.googleapis.com activation to propagate
    time.sleep(5)

    # 1. Accept Terms
    accept_url = f"https://retail.googleapis.com/v2alpha/projects/{project_id}/retailProject:acceptTerms"
    for attempt in range(1, 5):
        req = urllib.request.Request(accept_url, data=b"{}", headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                print(f"  ✓ Accepted Retail Data Use Terms! Response: {json.dumps(data)}")
                break
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="ignore")
            print(f"  [Attempt {attempt}/4] acceptTerms HTTP {e.code}: {body[:200]}")
            time.sleep(5)

    # 2. Enroll Solution (SOLUTION_TYPE_SEARCH)
    enroll_url = f"https://retail.googleapis.com/v2alpha/projects/{project_id}:enrollSolution"
    payload = json.dumps({"solution": "SOLUTION_TYPE_SEARCH"}).encode("utf-8")
    for attempt in range(1, 5):
        req = urllib.request.Request(enroll_url, data=payload, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                print(f"  ✓ Enrolled AI Commerce Search (SOLUTION_TYPE_SEARCH)! Operation: {data.get('name', 'OK')}")
                break
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="ignore")
            if "ALREADY_EXISTS" in body or "already enrolled" in body.lower():
                print("  ✓ AI Commerce Search (SOLUTION_TYPE_SEARCH) is already enrolled.")
                break
            print(f"  [Attempt {attempt}/4] enrollSolution HTTP {e.code}: {body[:200]}")
            time.sleep(5)


def main():
    parser = argparse.ArgumentParser(description="GCP Project Setup for AICS Demo (v1.0)")
    parser.add_argument(
        "--project-id",
        default="aics-demo-site-xxxxx-999999",
        help="Target GCP Project ID or pattern (default: aics-demo-site-xxxxx-999999 -> 5 random letters + 6 random digits).",
    )
    parser.add_argument("--brand-name", default="demo", help="Brand name used for naming a newly created project.")
    parser.add_argument("--create-new", action="store_true", help="Force creation of a new GCP project.")
    parser.add_argument(
        "--dry-run-project-id",
        action="store_true",
        help="Only resolve and print the generated Project ID without calling gcloud.",
    )
    args = parser.parse_args()

    project_id = resolve_project_id_pattern(args.project_id)

    if args.dry_run_project_id:
        print(f"RESOLVED_PROJECT_ID={project_id}")
        return

    if args.create_new:
        project_id = create_new_project(args.brand_name)
    else:
        print(f"🔍 Verifying or creating project: {project_id}")
        if not check_project_exists(project_id):
            print(f"🚀 Project '{project_id}' not found. Creating project ID: {project_id}...")
            display_name = f"AICS Demo {args.brand_name[:14]}".strip()
            res = run_cmd(["gcloud", "projects", "create", project_id, f"--name={display_name}", "--quiet"], check=False)
            if res.returncode == 0:
                billing = get_active_billing_account()
                if billing:
                    run_cmd(["gcloud", "billing", "projects", "link", project_id, f"--billing-account={billing}", "--quiet"], check=False)
                print(f"✅ Created project ID: {project_id}")
            else:
                print(f"⚠️ Project ID '{project_id}' unavailable ({res.stderr.strip()}). Generating new collision-free project ID...")
                project_id = create_new_project(args.brand_name)
        else:
            print(f"✅ Existing project '{project_id}' verified.")

    enable_apis(project_id)
    configure_compute_service_account_iam(project_id)
    allow_public_cloud_run_access(project_id)
    initialize_aics_retail_project(project_id)

    print("====================================================================")
    print(f"🎯 ACTIVE_PROJECT_ID={project_id}")
    print("====================================================================")


if __name__ == "__main__":
    main()
