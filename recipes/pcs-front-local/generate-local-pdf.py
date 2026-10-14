from pathlib import Path
from reportlab.pdfgen.canvas import Canvas
path=Path(r'.\pcs-front\public\local-samples\batch.pdf')
path.parent.mkdir(parents=True,exist_ok=True)
canvas=Canvas(str(path))
canvas.setTitle('Local UI demo attachment')
canvas.drawString(60,780,'LOCAL UI DEMO - NOT A REAL WAYBILL')
canvas.drawString(60,750,'Reference: LOCAL-DEMO-001')
canvas.drawString(60,720,'This synthetic file is served from the local frontend.')
canvas.save()
print('Local synthetic PDF fixture exported.')
