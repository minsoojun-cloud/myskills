import os
import subprocess
import time
from typing import Dict, Any, Optional
import google.auth
import google.auth.transport.requests

SDK_BIN = "/usr/local/google/home/minsoojun/google-cloud-sdk/bin"
if os.path.exists(SDK_BIN) and SDK_BIN not in os.environ.get("PATH", ""):
    os.environ["PATH"] = f"{SDK_BIN}:{os.environ.get('PATH', '')}"


class AuthManager:
    def __init__(self):
        self._token: Optional[str] = None
        self._expiry: float = 0.0
        self._source: str = "ADC"

    def get_access_token(self) -> str:
        now = time.time()
        if self._token and now < self._expiry - 60:
            return self._token

        try:
            credentials, _ = google.auth.default(
                scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )
            auth_req = google.auth.transport.requests.Request()
            credentials.refresh(auth_req)
            if credentials.token:
                self._token = credentials.token
                self._expiry = now + 3000
                self._source = "Google ADC / Cloud Run Service Account"
                return self._token
        except Exception:
            pass

        # Fallback to gcloud CLI token if running in local dev environment
        try:
            res = subprocess.run(
                ["gcloud", "auth", "print-access-token"],
                text=True,
                capture_output=True,
                check=True
            )
            token = res.stdout.strip()
            if token:
                self._token = token
                self._expiry = now + 1800
                self._source = "gcloud CLI Auth"
                return self._token
        except Exception:
            pass

        raise RuntimeError("Failed to obtain Google Cloud OAuth2 Bearer access token.")

    def get_token_info(self) -> Dict[str, Any]:
        try:
            tok = self.get_access_token()
            return {
                "authenticated": True,
                "source": self._source,
                "token_preview": f"{tok[:12]}...{tok[-6:]}" if len(tok) > 20 else "VALID",
                "expires_in_seconds": max(0, int(self._expiry - time.time()))
            }
        except Exception as e:
            return {
                "authenticated": False,
                "error": str(e)
            }


auth_manager = AuthManager()
