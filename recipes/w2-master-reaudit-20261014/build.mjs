import fs from 'node:fs/promises';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const work='./recipes/w2-master-reaudit-20261014';
const plan=JSON.parse(await fs.readFile(work+'/workbook-plan.json','utf8'));
const mode=process.argv[2]||'preview';
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(['preview','author'].includes(mode)?plan.source:plan.destination));
if(mode==='preview'){
 const b=await wb.render({sheetName:'业务UI与交互用例',range:'K98:M99',scale:1,format:'png'});
 await fs.writeFile(work+'/source-preview.png',new Uint8Array(await b.arrayBuffer()));
 console.log((await wb.inspect({kind:'sheet',include:'id,name',maxChars:800})).ndjson);
}else if(mode==='author'){
 for(const block of plan.blocks){
  const s=wb.worksheets.getItem(block.sheet),r=s.getRange(block.range);
  r.values=block.values;r.format.wrapText=true;r.format.verticalAlignment='top';
  for(const [col,width]of Object.entries(block.widths||{}))s.getRange(col+':'+col).format.columnWidth=width;
  if(block.header){const h=s.getRange(block.header);h.format.fill='#1F4E78';h.format.font.color='#FFFFFF';h.format.font.bold=true;}
 }
 for(const f of plan.formulas)wb.worksheets.getItem(f.sheet).getRange(f.cell).formulas=[[f.formula]];
 wb.worksheets.getItem('业务UI与交互用例').getRange('N2:N102').dataValidation={rule:{type:'list',values:['通过','不通过','受阻','未执行','不适用']}};
 wb.recalculate();
 const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:15},maxChars:1200});
 await fs.writeFile(work+'/formula-scan.ndjson',errors.ndjson);
 console.log((await wb.inspect({kind:'table',range:"'范围与依据'!A238:B243",include:'values,formulas',tableMaxRows:6,tableMaxCols:2,maxChars:2000})).ndjson);
 await(await SpreadsheetFile.exportXlsx(wb)).save(work+'/artifact-export.xlsx');
}else{
 const renders=mode==='summary'?[['current-summary','范围与依据','A236:D244'],['new-issue','修改清单','F54:I55']]:[['case-change','业务UI与交互用例','N98:O99'],['candidate-change','业务UI与交互用例','N58:O60'],['current-summary','范围与依据','A236:D244'],['issue-change','修改清单','P44:Q49']];
 for(const [name,sheet,range]of renders){
  const b=await wb.render({sheetName:sheet,range,scale:1,format:'png'});
  await fs.writeFile(work+'/'+name+'.png',new Uint8Array(await b.arrayBuffer()));
 }
 console.log((await wb.inspect({kind:'table',range:"'业务UI与交互用例'!N99:Q99",include:'values',tableMaxRows:1,tableMaxCols:4,maxChars:1600})).ndjson);
}
process.exit(0);
