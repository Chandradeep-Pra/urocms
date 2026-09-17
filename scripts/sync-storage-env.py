"""Copy only the deployed Storage signer into Cloud Shell's deployment env file."""

import json
import os
from pathlib import Path
import subprocess
import sys

from dotenv import set_key


def main():
    target = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else Path.home() / ".env.prod"
    if not target.is_file():
        raise RuntimeError("Environment file does not exist; no file was changed")

    result = subprocess.run(
        ["gcloud", "run", "services", "describe", "urologics-web",
         "--project", "proud-woods-489814-s6", "--region", "asia-south1", "--format=json"],
        capture_output=True, text=True, check=False,
    )
    if result.returncode:
        raise RuntimeError("Could not read Cloud Run configuration; no file was changed")
    service = json.loads(result.stdout)
    entries = service["spec"]["template"]["spec"]["containers"][0].get("env", [])
    value = next((entry.get("value") for entry in entries
                  if entry.get("name") == "GOOGLE_APPLICATION_CREDENTIALS_JSON"), None)
    if not isinstance(value, str) or not value:
        raise RuntimeError("Storage setting is absent or uses Secret Manager; no file was changed")
    credentials = json.loads(value)
    if not all(credentials.get(key) for key in ("project_id", "client_email", "private_key")):
        raise RuntimeError("Deployed Storage configuration is incomplete; no file was changed")

    os.chmod(target, 0o600)
    set_key(str(target), "GOOGLE_APPLICATION_CREDENTIALS_JSON", value, quote_mode="always")
    os.chmod(target, 0o600)
    print("Storage signer synchronized. Other variables are unchanged. No credentials printed.")


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception:
        print("Storage env synchronization failed. No credentials printed.", file=sys.stderr)
        sys.exit(1)
