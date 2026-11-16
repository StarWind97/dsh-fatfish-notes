"""Serve a local page with optional JSON state; reuse only the same page and state file."""

import argparse
import json
import socket
import tempfile
import threading
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen
import webbrowser


ROOT = Path.cwd()
APP_ID = "interactive-web-local-page"
STATUS_PATH = "/__preview_status__"
STATE_PATH = "/__page_state__"
SERVICE_VERSION = 2
STATE_FILE = ROOT / "page-state.json"
STATE_LOCK = threading.Lock()


def read_state():
    if not STATE_FILE.exists():
        return {"version": 1, "data": {}}
    result = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    if not isinstance(result, dict) or result.get("version") != 1 or not isinstance(result.get("data"), dict):
        raise ValueError("Invalid page state")
    return result


def write_state(state):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=STATE_FILE.parent, delete=False) as stream:
            temporary = Path(stream.name)
            json.dump(state, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write("\n")
        temporary.replace(STATE_FILE)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


class PreviewServer(ThreadingHTTPServer):
    # Windows permits duplicate listeners with SO_REUSEADDR; keep this port exclusive.
    allow_reuse_address = False

    def server_bind(self):
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


class Handler(SimpleHTTPRequestHandler):
    def json_response(self, status, data):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def local_request(self):
        host = self.headers.get("Host", "")
        return host in {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}

    def do_GET(self):
        if self.path == STATUS_PATH:
            self.json_response(200, {"app": APP_ID, "root": str(ROOT), "serviceVersion": SERVICE_VERSION, "stateFile": str(STATE_FILE)})
            return
        if self.path == STATE_PATH:
            if not self.local_request():
                self.json_response(403, {"error": "Local requests only"})
                return
            try:
                with STATE_LOCK:
                    state = read_state()
                self.json_response(200, state)
            except (OSError, ValueError):
                self.json_response(503, {"error": "Cannot read page state; existing file preserved"})
            return
        super().do_GET()

    def do_POST(self):
        if self.path != STATE_PATH:
            self.json_response(404, {"error": "Unknown endpoint"})
            return
        host = self.headers.get("Host", "")
        if not self.local_request() or self.headers.get("Origin") not in (None, f"http://{host}"):
            self.json_response(403, {"error": "Same-origin local requests only"})
            return
        if self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json":
            self.json_response(415, {"error": "JSON required"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 65536:
                raise ValueError("Invalid length")
            def invalid_constant(value):
                raise ValueError("Non-finite number")
            incoming = json.loads(self.rfile.read(length), parse_constant=invalid_constant)
            changes = incoming.get("changes") if isinstance(incoming, dict) else None
            if not isinstance(changes, dict):
                raise ValueError("Changes must be an object")
        except (ValueError, UnicodeError):
            self.json_response(400, {"error": "Invalid state changes"})
            return
        try:
            with STATE_LOCK:
                state = read_state()
                state["data"].update(changes)
                state["updatedAt"] = datetime.now(timezone.utc).isoformat()
                write_state(state)
            self.json_response(200, {"saved": True, "updatedAt": state["updatedAt"]})
        except (OSError, ValueError):
            self.json_response(503, {"error": "Cannot save page state; original file preserved"})


def matching_preview(url):
    try:
        with urlopen(url + STATUS_PATH, timeout=2) as response:
            status = json.loads(response.read(4096))
        return isinstance(status, dict) and status.get("app") == APP_ID and status.get("root") == str(ROOT) and status.get("serviceVersion") == SERVICE_VERSION and status.get("stateFile") == str(STATE_FILE)
    except (URLError, OSError, ValueError):
        return False


def main():
    global ROOT, STATE_FILE
    parser = argparse.ArgumentParser(description="Start a local interactive page.")
    parser.add_argument("--port", type=int, default=8768)
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--directory", type=Path, default=ROOT, help="Folder containing index.html")
    parser.add_argument("--state-file", type=Path, help="Page state JSON location; defaults to the page folder")
    args = parser.parse_args()
    ROOT = args.directory.resolve()
    STATE_FILE = (args.state_file or ROOT / "page-state.json").resolve()
    if not (ROOT / "index.html").is_file():
        parser.error("directory must contain index.html")
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    url = f"http://127.0.0.1:{args.port}"
    try:
        server = PreviewServer(("127.0.0.1", args.port), partial(Handler, directory=str(ROOT)))
    except OSError as error:
        if matching_preview(url):
            print(f"网页 的服务已经在运行：{url}/", flush=True)
            if not args.no_browser:
                webbrowser.open(url + "/")
            return 0
        print(f"无法启动：端口 {args.port} 被其他服务占用，或无法监听。\n{error}", flush=True)
        print("不会关闭其他程序。可使用 --port 8770 指定其他端口。", flush=True)
        return 1
    print(f"网页 已启动：{url}/", flush=True)
    print(f"网页文件：{ROOT / 'index.html'}", flush=True)
    print("请保留这个服务窗口。关闭窗口或按 Ctrl+C 即停止；以后再次双击启动脚本即可。", flush=True)
    if not args.no_browser:
        webbrowser.open(url + "/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n网页 服务已停止。", flush=True)
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
