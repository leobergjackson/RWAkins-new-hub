"""Lendora AI entrypoint — works under both `python main.py` and `uvicorn main:app`.

We import the FastAPI `app` lazily so any startup crash inside server.py is
printed with a full traceback rather than silently exiting with code 0.
"""
import os
import sys
import traceback

print(f"[Lendora] main.py starting, python={sys.version.split()[0]}, cwd={os.getcwd()}", flush=True)

try:
    from backend.api.server import app
    print("[Lendora] server.py imported successfully", flush=True)
except Exception as exc:
    print("[Lendora] FATAL: failed to import backend.api.server", flush=True)
    traceback.print_exc()
    raise

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"[Lendora] starting uvicorn on {host}:{port}", flush=True)
    uvicorn.run(app, host=host, port=port, log_level="info")
