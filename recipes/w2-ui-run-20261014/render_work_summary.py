import os,sys,runpy
renderer='./private-local-path'
os.environ['PATH']='C:/Program Files/LibreOffice/program'+os.pathsep+os.environ.get('PATH','')
sys.argv=[renderer,'./artifacts/ui-audit-20261014/20261014-ui-audit/SN318_前端UI规范审查与修改清单_两日工作概述_20261014.docx','--output_dir','./recipes/w2-ui-run-20261014/docx-render','--emit_pdf','--verbose']
runpy.run_path(renderer,run_name='__main__')
