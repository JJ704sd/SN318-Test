import fs from 'node:fs/promises';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const w=await SpreadsheetFile.importXlsx(await FileBlob.load('./artifacts/checklist/SN318_分批提测检查表_需求重核完善.xlsx'));
console.log((await w.inspect({kind:'workbook,sheet,table',maxChars:1800,tableMaxRows:2,tableMaxCols:4})).ndjson);
for (const [sheetName,range,name] of [['UI检查','J5:L7','before-ui'],['本批提测','A7:H14','before-batch']]){
 const b=await w.render({sheetName,range,scale:1.3});
 await fs.writeFile(`./recipes/sn318-smoke-ui-review/${name}.png`,new Uint8Array(await b.arrayBuffer()));
}
