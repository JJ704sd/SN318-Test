import fs from 'node:fs/promises';
import {FileBlob, SpreadsheetFile} from '@oai/artifact-tool';
const work='./recipes/w2-ui-run-20261014';
const out='./artifacts/ui-audit-20261014/20261014-ui-audit';
const mode=process.argv[2]||'preview';
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(mode==='verify'?JSON.parse(await fs.readFile(work+'/workbook-plan.json','utf8')).destination:out+'/sources/执行基线原件.xlsx'));
if(mode==='preview'){
 const b=await wb.render({sheetName:'通用模板UI与交互用例',range:'H1:J3',scale:1,format:'png'});
 await fs.writeFile(work+'/source-preview.png',new Uint8Array(await b.arrayBuffer()));
 console.log((await wb.inspect({kind:'sheet',include:'id,name',maxChars:1000})).ndjson);
}else if(mode==='author'){
 const plan=JSON.parse(await fs.readFile(work+'/workbook-plan.json','utf8'));
 for(const change of plan.blocks){
  const s=wb.worksheets.getItem(change.sheet);
  s.getRange(change.range).values=change.values;
  s.getRange(change.range).format.wrapText=true;
  s.getRange(change.range).format.verticalAlignment='top';
  for(const [col,width] of Object.entries(change.widths||{}))s.getRange(col+':'+col).format.columnWidth=width;
  if(change.header){s.getRange(change.header).format.fill='#1F4E78';s.getRange(change.header).format.font.color='#FFFFFF';s.getRange(change.header).format.font.bold=true;}
  if(change.rowHeight)s.getRange(change.range).format.rowHeight=change.rowHeight;
 }
 wb.recalculate();
 console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:20},maxChars:1000})).ndjson);
 await (await SpreadsheetFile.exportXlsx(wb)).save(work+'/artifact-export.xlsx');
 console.log('Authored added records with Artifact Tool');
}else{
 for(const [name,sheet,range]of [['template-result','通用模板UI与交互用例','J1:L3'],['business-result','业务UI与交互用例','K78:L80'],['issue-result','修改清单','F35:I37'],['current-summary','范围与依据','A184:D187']]){
  const b=await wb.render({sheetName:sheet,range,scale:1,format:'png'});await fs.writeFile(work+'/'+name+'.png',new Uint8Array(await b.arrayBuffer()));
 }
 console.log((await wb.inspect({kind:'table',range:"'通用模板UI与交互用例'!K2:L3",include:'values',tableMaxRows:2,tableMaxCols:2,maxChars:1800})).ndjson);
}
process.exit(0);
