import fs from 'node:fs/promises';
import {Workbook, SpreadsheetFile} from '@oai/artifact-tool';
const workbook=Workbook.create();
const sheet=workbook.worksheets.add('本地演示');
sheet.getRange('A1:D3').values=[
  ['演示编号','品名','数量','用途'],
  ['LOCAL-DEMO-001','测试货物',10,'仅用于本地 UI 演示'],
  ['LOCAL-DEMO-002','测试样品',5,'非真实报关数据'],
];
sheet.getRange('A1:D3').format.font={name:'Microsoft YaHei',size:11};
sheet.getRange('A1:D1').format={fill:'#046EFC',font:{bold:true,color:'#FFFFFF'}};
sheet.getRange('A1:D3').format.columnWidthPx=190;
sheet.getRange('A1:D3').format.rowHeightPx=30;
await fs.mkdir('./pcs-front/public/local-samples',{recursive:true});
const file=await SpreadsheetFile.exportXlsx(workbook);
await file.save('./pcs-front/public/local-samples/declaration.xlsx');
console.log('Local synthetic spreadsheet fixture exported.');
