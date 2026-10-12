import fs from 'node:fs/promises';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const dir='./recipes/w2-week-20261012';
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load('./artifacts/smoke-ui/SN318_冒烟与UI用例_飞书五色及实际页面复核.xlsx'));
console.log((await wb.inspect({kind:'sheet',include:'id,name',maxChars:1800})).ndjson);
for (const [sheetName,range,name] of [['UI检查','A6:C13','before-ui'],['UI走查','A6:G10','before-walk'],['本批提测','A194:H200','before-summary']]){
 const b=await wb.render({sheetName,range,scale:1.5,format:'png'});await fs.writeFile(`${dir}/${name}.png`,new Uint8Array(await b.arrayBuffer()));
}
