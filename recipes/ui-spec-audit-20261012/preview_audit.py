from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
ROOT=Path(r'.\outputs\frontend-audit\ui-spec-audit')
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def list_directory(self,path):self.send_error(404,'No directory listing')
    def log_message(self,*args):pass
ThreadingHTTPServer(('127.0.0.1',4175),Handler).serve_forever()
