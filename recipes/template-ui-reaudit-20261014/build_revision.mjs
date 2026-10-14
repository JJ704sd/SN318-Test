import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const mode = process.argv[2] || 'preview';
const revision = process.argv[3] || 'first';
const third = revision === 'third';
const second = revision === 'second' || third;
const baseWork = './recipes/template-ui-reaudit-20261014';
const config = second ? JSON.parse(await fs.readFile(`${baseWork}/${revision}-config.json`,'utf8')) : null;
const source = second ? (mode==='verify'?config.destination:config.source) : mode==='verify' ? './artifacts/template-reaudit/SN318_W2_UI与交互测试用例_40条实测复核修订_20261014.xlsx' : './artifacts/weekly-ui/SN318_W2_UI与交互测试用例_按工单用例风格重写.xlsx';
const work = second ? config.work : baseWork;
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(source));
if (mode === 'preview') {
  const preview = await wb.render({sheetName:'通用模板UI与交互用例',range:'G1:I4',scale:1,format:'png'});
  await fs.writeFile(`${work}/source-preview.png`,new Uint8Array(await preview.arrayBuffer()));
  console.log((await wb.inspect({kind:'sheet',include:'id,name',maxChars:1200})).ndjson);
} else if (mode === 'verify') {
  console.log((await wb.inspect({kind:'table',range:"'通用模板UI与交互用例'!H29:I29",include:'values',tableMaxRows:1,tableMaxCols:2,maxChars:1000})).ndjson);
  for(const [id,range,sheet] of third ? [['manual-column','H1:J2'],['case11-completed','H12:J12'],['case13-conditions','H14:J14'],['case14-conditions','H15:J15'],['case30-conditions','H31:J31'],['case38-conditions','H39:J39']] : second ? [['final-case19','H20:I20'],['final-case4','H5:I5'],['final-case32','H33:I33'],['final-case33','H34:I34'],['final-fix14','E15:K15','修改清单']] : [['final-case28','H29:I29']]) {
    const p=await wb.render({sheetName:sheet||'通用模板UI与交互用例',range,scale:1,format:'png'});
    await fs.writeFile(`${work}/${id}.png`,new Uint8Array(await p.arrayBuffer()));
  }
} else {
  const edits = JSON.parse(await fs.readFile(`${work}/edits.json`,'utf8'));
  for (const edit of edits) {
    wb.worksheets.getItem(edit.sheet).getRange(edit.cell).values=[[edit.value]];
  }
  if (third) {
    const sheet=wb.worksheets.getItem(config.manualColumn.sheet);
    sheet.getRange('J1:J41').copyFrom(sheet.getRange('I1:I41'),'all');
    sheet.getRange('J1').values=[[config.manualColumn.header]];
    sheet.getRange('J2:J41').clear({applyTo:'contents'});
    sheet.getRange('J:J').format.columnWidth=config.manualColumn.width;
    sheet.getRange('J1:J41').format.wrapText=true;
    const oldTable=sheet.tables.items.find(t=>t.name===config.manualColumn.tableName);
    if(!oldTable) throw new Error('Template table missing');
    oldTable.delete();
    const expanded=sheet.tables.add(config.manualColumn.range,true,config.manualColumn.tableName);
    expanded.style='TableStyleMedium2';
  }
  wb.recalculate();
  console.log((await wb.inspect({kind:'table',range:"'通用模板UI与交互用例'!H30:I31",include:'values,formulas',tableMaxRows:2,tableMaxCols:2,maxChars:1600})).ndjson);
  console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:20},summary:'final error scan',maxChars:1000})).ndjson);
  for (const [id,range] of [['new-main','G30:I31'],['new-summary','A3:H7']]) {
    const p=await wb.render({sheetName:id==='new-main'?'通用模板UI与交互用例':'范围与依据',range,scale:1,format:'png'});
    await fs.writeFile(`${work}/${id}.png`,new Uint8Array(await p.arrayBuffer()));
  }
  await (await SpreadsheetFile.exportXlsx(wb)).save(`${work}/artifact-export.xlsx`);
  console.log(JSON.stringify({edits:edits.length,exported:true}));
}
process.exit(0);
