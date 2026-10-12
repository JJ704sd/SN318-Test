from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path('./pcs-front')
DIST = ROOT / 'dist'
PROTOTYPE = ROOT / 'docs/other/SN318系统 · 产品、订单与合单配载交互原型_files/saved_resource.html'
REPORT = Path('./artifacts/frontend-audit/PCS_前端设计研究与本地构建报告.html')

class PreviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def do_GET(self):
        request_path = unquote(urlsplit(self.path).path)
        if request_path in ('/spa-build.log', '/bff-build.log'):
            payload = (REPORT.parent / request_path.lstrip('/')).read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        if request_path == '/__report':
            payload = REPORT.read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        if request_path.startswith('/evidence/'):
            evidence_root = REPORT.parent / 'evidence'
            evidence_target = (REPORT.parent / request_path.lstrip('/')).resolve()
            if evidence_target.is_relative_to(evidence_root.resolve()) and evidence_target.is_file():
                payload = evidence_target.read_bytes()
                self.send_response(200)
                self.send_header('Content-Type', self.guess_type(str(evidence_target)))
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            self.send_error(404)
            return
        if request_path == '/__prototype':
            payload = PROTOTYPE.read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        target = (DIST / request_path.lstrip('/')).resolve()
        if not target.is_relative_to(DIST.resolve()):
            self.send_error(403)
            return
        if not target.is_file() and not Path(request_path).suffix:
            self.path = '/index.html'
        super().do_GET()

    def list_directory(self, path):
        self.send_error(403)

if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', 4174), PreviewHandler)
    print('Read-only SPA preview: http://127.0.0.1:4174/login', flush=True)
    print('In-memory prototype: http://127.0.0.1:4174/__prototype', flush=True)
    server.serve_forever()
