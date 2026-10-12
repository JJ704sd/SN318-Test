import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const outputDir = './artifacts/checklist';
const supportDir = './recipes/sn318-checklist';
const inputPath = `${outputDir}/SN318_分批提测检查表_边界异常复核.xlsx`;
const outputPath = `${outputDir}/SN318_分批提测检查表_需求重核完善.xlsx`;
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const batch = workbook.worksheets.getItem('本批提测');
const smoke = workbook.worksheets.getItem('冒烟用例');
const ui = workbook.worksheets.getItem('UI检查');
const designConfig=JSON.parse(await fs.readFile(`${supportDir}/design_rationale.json`,'utf8'));
// Narrow edit mode: append the requested design rationale without rebuilding cases or execution data.
if (process.argv.includes('--design-rationale')) {
  const design = designConfig;
  assert.equal(design.smoke.length, 82);
  assert.equal(design.ui.length, 34);
  const existingSmokeLast=smoke.getRange('A6:A150').values.findLastIndex(r=>Boolean(r[0]))+6;
  const snapshots = [[batch,'A1:H81'],[smoke,`A1:S${existingSmokeLast}`],[ui,'A1:AC39']].map(([sheet,range])=>({sheet,range,values:sheet.getRange(range).values,formulas:sheet.getRange(range).formulas}));
  const sectionTitle='按需求设计用例｜思路补充（测试建议）';
  const existingGuide=batch.getRange('A82:H111').values;
  assert(existingGuide.every(r=>r.every(v=>v==null||v==='')) || existingGuide[0][0]===sectionTitle, 'Preserve unrelated content below the existing guide');
  const backupPath=`${supportDir}/before-design-rationale.xlsx`;
  try { await fs.access(backupPath); } catch { await fs.copyFile(inputPath,backupPath); }
  const smokeRowForId=new Map(smoke.getRange(`A6:A${existingSmokeLast}`).values.map((r,i)=>[r[0],i+6]));
  const decisionRowForId=new Map(batch.getRange('A40:A61').values.map((r,i)=>[r[0],i+40]));
  const decisionFormulaChanges=new Map();
  for(const correction of design.decisionCorrections??[]){
    const r=decisionRowForId.get(correction.id);assert(r,`Existing decision required: ${correction.id}`);
    for(const col of ['B','C']) if(correction[col]) batch.getRange(`${col}${r}`).values=[[correction[col]]];
    batch.getRange(`A${r}:H${r}`).format.rowHeightPx=150;
  }
  for(const correction of design.caseCorrections){
    const r=smokeRowForId.get(correction.id);assert(r,`Existing case required: ${correction.id}`);
    smoke.getRange(`J${r}:K${r}`).values=[[correction.J,correction.K]];
    const height=Math.max(210,...[[correction.J,370],[correction.K,440]].map(([text,width])=>String(text).split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length*11/(width-18))),0)*19+24));
    smoke.getRange(`A${r}:U${r}`).format.rowHeightPx=height;
  }
  let smokeLast=existingSmokeLast;
  const added=[];
  // Seed new effective-result formulas from an existing case without a case-specific decision.
  const seed=smoke.getRange('I11').formulas[0][0];assert(!seed.includes('COUNTIFS'),'New-case seed must not inherit an unrelated DEC');
  for(const entry of design.newCases){
    if(smokeRowForId.has(entry.id)){
      const r=smokeRowForId.get(entry.id);
      smoke.getRange(`J${r}:L${r}`).values=[[`前置：${entry.data}\n操作：${entry.action}`,entry.expected,entry.source]];
      continue;
    }
    const r=++smokeLast;smokeRowForId.set(entry.id,r);added.push(entry.id);
    smoke.getRange(`A${r}:S${r}`).values=[[entry.id,entry.module,entry.check,'待选择',entry.critical,'待确认','未执行',null,null,`前置：${entry.data}\n操作：${entry.action}`,entry.expected,entry.source,null,null,null,entry.stage,null,null,entry.basis??'需求正文']];
    let effective=seed.replace(/\b([A-Z]{1,2})11\b/g,(_,letter)=>`${letter}${r}`);
    const dependencies=(entry.decisions??[]).map(id=>{assert(decisionRowForId.has(id));return `'本批提测'!$H$${decisionRowForId.get(id)}<>"已确认"`;});
    if(dependencies.length) effective=effective.replace(`IF(F${r}<>"已确认",`, `IF(OR(F${r}<>"已确认",${dependencies.join(',')}),`);
    smoke.getRange(`I${r}`).formulas=[[effective]];
    smoke.getRange(`A${r}:U${r}`).format.font={name:'Arial',size:10,color:'#25324A'};
    smoke.getRange(`A${r}:U${r}`).format.wrapText=true;smoke.getRange(`A${r}:U${r}`).format.verticalAlignment='center';
    smoke.getRange(`A${r}:U${r}`).format.rowHeightPx=Math.max(270,...[[`前置：${entry.data}\n操作：${entry.action}`,370],[entry.expected,440]].map(([text,width])=>String(text).split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length*11/(width-18))),0)*19+24));
    smoke.getRange(`D${r}:H${r}`).format.fill='#FFF4D6';smoke.getRange(`M${r}:O${r}`).format.fill='#FFF4D6';smoke.getRange(`Q${r}:R${r}`).format.fill='#FFF4D6';
    smoke.getRange(`D${r}:I${r}`).format.horizontalAlignment='center';
  }
  if(smokeLast>existingSmokeLast){
    const start=existingSmokeLast+1;
    for(const [letter,values] of [['D',['待选择','是','否']],['E',['是','否']],['F',['待确认','已确认']],['G',['未执行','通过','失败','受阻','依据待确认']]]) smoke.getRange(`${letter}${start}:${letter}${smokeLast}`).dataValidation={rule:{type:'list',values}};
    for(const letter of ['G','I']){
      const range=smoke.getRange(`${letter}${start}:${letter}${smokeLast}`);
      range.conditionalFormats.add('containsText',{text:'失败',format:{fill:'#FDE7E9',font:{color:'#A3212E',bold:true}}});
      range.conditionalFormats.add('containsText',{text:'受阻',format:{fill:'#FFF4CE',font:{color:'#8B5B00'}}});
      range.conditionalFormats.add('containsText',{text:'待确认',format:{fill:'#FFF4CE',font:{color:'#8B5B00'}}});
    }
  }
  assert.equal(smokeLast,5+design.smoke.length);
  const extendSmokeRefs=f=>typeof f==='string'?f.replace(new RegExp(`('冒烟用例'![^,()+]*\\$)(?:65|${existingSmokeLast})\\b`,'g'),(_,prefix)=>`${prefix}${smokeLast}`):f;
  const mainFormulas=batch.getRange('A1:H81').formulas;
  for(let r=0;r<mainFormulas.length;r++)for(let c=0;c<mainFormulas[r].length;c++){
    const f=mainFormulas[r][c],updated=extendSmokeRefs(f);
    if(f&&updated!==f) batch.getRange(`${String.fromCharCode(65+c)}${r+1}`).formulas=[[updated]];
  }
  const parseIds=text=>[...String(text).matchAll(/(SM|UI)(\d+)(?:[—–-](?:SM|UI)?(\d+))?/g)].flatMap(m=>Array.from({length:Number(m[3]??m[2])-Number(m[2])+1},(_,i)=>`${m[1]}${String(Number(m[2])+i).padStart(2,'0')}`));
  // Rebuild only changed decision-scope dependencies; retain user decision inputs.
  for(const correction of design.decisionCorrections??[]){
    const r=decisionRowForId.get(correction.id), links=parseIds(batch.getRange(`C${r}`).values[0][0]);
    const linked=links.map(id=>`COUNTIFS('${id.startsWith('UI')?'UI检查':'冒烟用例'}'!$A$6:$A$${id.startsWith('UI')?39:smokeLast},"${id}",'${id.startsWith('UI')?'UI检查':'冒烟用例'}'!$D$6:$D$${id.startsWith('UI')?39:smokeLast},"是")`).join('+')||'0';
    const adopted=`IF(AND(F${r}="已确认",LEN(TRIM(G${r}))>0),"已确认",IF(AND(F${r}="已记录后置",LEN(TRIM(G${r}))>0),"核心依据不可后置","待确认"))`;
    const formula=`=IF(AND((${linked})>0,D${r}="否"),"范围矛盾",IF(OR(D${r}="是",(${linked})>0),${adopted},IF(D${r}="否","不涉及","库内待选择")))`;
    batch.getRange(`H${r}`).formulas=[[formula]];decisionFormulaChanges.set(`H${r}`,formula);
  }
  const counts=[];
  for(const [sheet,key,oldLastCol,newCols,last,tableName] of [[smoke,'smoke','S',['T','U'],smokeLast,'SmokeCases'],[ui,'ui','AC',['AD','AE'],39,'UiCases']]) {
    const ids=sheet.getRange(`A6:A${last}`).values.map(r=>r[0]);
    const entries=new Map(design[key].map(r=>[r[0],r.slice(1)]));
    assert.equal(entries.size,ids.length,'Unique rationale per case');
    assert.deepEqual([...entries.keys()].sort(),[...ids].sort(),'Rationale must match current stable case IDs');
    assert(design[key].every(r=>r.length===3&&r.slice(1).every(v=>typeof v==='string'&&v.length>=25)), 'Each case needs substantive rationale and data/evidence');
    sheet.getRange(`${newCols[0]}5:${newCols[1]}5`).values=[['设计思路／测试方法（建议）','数据选择／核对证据（建议）']];
    sheet.getRange(`${newCols[0]}6:${newCols[1]}${last}`).values=ids.map(id=>entries.get(id));
    const existingTable=sheet.tables.items.find(t=>t.name===tableName), tableStyle=existingTable.style;
    existingTable.delete();
    const table=sheet.tables.add(`A5:${newCols[1]}${last}`,true,tableName);
    table.style=tableStyle;table.showFilterButton=true;
    const body=sheet.getRange(`${newCols[0]}6:${newCols[1]}${last}`);
    body.format.font={name:'Arial',size:10,color:'#25324A'};
    body.format.wrapText=true;body.format.verticalAlignment='center';
    sheet.getRange(`${newCols[0]}1:${newCols[1]}${last}`).format.columnWidthPx=550;
    const header=sheet.getRange(`${newCols[0]}5:${newCols[1]}5`);
    header.format.fill='#213B62';header.format.font={name:'Arial',size:10,bold:true,color:'#FFFFFF'};
    header.format.horizontalAlignment='center';header.format.verticalAlignment='center';header.format.wrapText=true;
    // Existing case rows have at least 84px. The new concise cells fit that height without changing user layout.
    counts.push({sheet:sheet.name,cases:ids.length,columns:newCols});
  }
  batch.getRange('A82:H111').format.font={name:'Arial',size:10,color:'#25324A'};
  batch.getRange('A82:H111').format.verticalAlignment='center';
  batch.getRange('A82:H111').format.wrapText=true;
  batch.getRange('A82:H82').merge();batch.getRange('A82').values=[[sectionTitle]];
  batch.getRange('A82:H82').format.fill='#213B62';batch.getRange('A82:H82').format.font={name:'Arial',size:12,bold:true,color:'#FFFFFF'};
  batch.getRange('A82:H82').format.rowHeightPx=38;
  batch.getRange('A83:H83').merge();batch.getRange('A83').values=[[design.summaryText]];
  batch.getRange('A83:H83').format.rowHeightPx=36;
  design.guide.forEach(([topic,text],i)=>{
    const r=85+i;batch.getRange(`A${r}`).values=[[`${i+1}. ${topic}`]];
    batch.getRange(`B${r}:H${r}`).merge();batch.getRange(`B${r}`).values=[[text]];
    batch.getRange(`A${r}:H${r}`).format.rowHeightPx=66;
    batch.getRange(`A${r}`).format.font={name:'Arial',size:10,bold:true,color:'#213B62'};
    batch.getRange(`A${r}:H${r}`).format.fill=i%2===0?'#F0F5FB':'#FFFFFF';
  });
  batch.getRange('A92:H92').merge();batch.getRange('A92').values=[['模块风险与方法对照｜按本批范围选用，不等于新增验收规则']];
  batch.getRange('A92:H92').format.font={name:'Arial',size:12,bold:true,color:'#213B62'};
  batch.getRange('A92:H92').format.rowHeightPx=38;
  batch.getRange('A94:H94').values=[['模块／主题','对应现有用例','需求依据','主要风险','设计方法（建议）','测试数据选择','判定与证据','适用条件／待决策']];
  batch.getRange('A94:H94').format.fill='#213B62';batch.getRange('A94:H94').format.font={name:'Arial',size:10,bold:true,color:'#FFFFFF'};
  batch.getRange('A94:H94').format.horizontalAlignment='center';batch.getRange('A94:H94').format.rowHeightPx=42;
  batch.getRange('A95:H105').values=design.moduleMatrix;
  for(let r=95;r<=105;r++){batch.getRange(`A${r}:H${r}`).format.rowHeightPx=122;batch.getRange(`A${r}:H${r}`).format.fill=r%2?'#F0F5FB':'#FFFFFF';}
  batch.getRange('A107:H107').merge();batch.getRange('A107').values=[[`设计依据：${design.source.version}；本轮核对日期${design.source.verifiedOn}。完整PRD链接见本页REQ来源。`]];
  batch.getRange('A107:H107').format.rowHeightPx=38;
  batch.getRange('A108:H108').merge();batch.getRange('A108').values=[[design.source.verificationScope]];batch.getRange('A108:H108').format.rowHeightPx=48;
  batch.getRange('A109:H109').merge();batch.getRange('A109').values=[[design.source.boundary]];batch.getRange('A109:H109').format.rowHeightPx=48;
  batch.getRange('A108:H109').format.font={name:'Arial',size:10,color:'#64748B'};
  batch.getRange('A110:H110').merge();batch.getRange('A110').values=[[design.auditNote]];
  batch.getRange('A110:H110').format.rowHeightPx=50;
  const trace=workbook.worksheets.items.find(s=>s.name==='需求对照')??workbook.worksheets.add('需求对照');
  assert(trace.getRange('A2').values[0][0]==null||trace.getRange('A2').values[0][0]==='SN318 需求条款与用例覆盖复核','Preserve unrelated audit sheet');
  const traceLast=5+design.traceability.length;
  trace.getRange(`A1:H${traceLast}`).format.font={name:'Arial',size:10,color:'#25324A'};
  trace.getRange(`A1:H${traceLast}`).format.wrapText=true;trace.getRange(`A1:H${traceLast}`).format.verticalAlignment='center';
  trace.getRange('A2:H2').merge();trace.getRange('A2').values=[['SN318 需求条款与用例覆盖复核']];trace.getRange('A2:H2').format.font={name:'Arial',size:16,bold:true,color:'#213B62'};trace.getRange('A2:H2').format.rowHeightPx=44;
  trace.getRange('A3:H3').merge();trace.getRange('A3').values=[['核对日期2026-10-10｜按可独立检查的条款组逐行映射；“覆盖”是设计状态，全部用例未执行。交付范围、批准基线及逐分支证据决定本批验收。']];trace.getRange('A3:H3').format.rowHeightPx=46;
  trace.getRange('A4:H4').merge();trace.getRange('A4').values=[['先筛E列“本轮补充／本轮修正”和G列待决项；F列区分正文、建议、待决清单条目。划线删除／外部接入分期见各行及本批提测A108。该表供复核，不驱动提测结论。']];trace.getRange('A4:H4').format.rowHeightPx=46;
  trace.getRange('A5:H5').values=[['条款组ID','需求条款／出处','对应检查ID','边界／异常核对点','本轮处理','依据属性','未决口径／适用条件','需求原文链接']];
  trace.getRange(`A6:H${traceLast}`).values=design.traceability;
  trace.getRange('A5:H5').format.fill='#213B62';trace.getRange('A5:H5').format.font={name:'Arial',size:10,bold:true,color:'#FFFFFF'};trace.getRange('A5:H5').format.rowHeightPx=42;
  [78,360,250,350,100,180,310,320].forEach((width,i)=>trace.getRange(`${String.fromCharCode(65+i)}1:${String.fromCharCode(65+i)}${traceLast}`).format.columnWidthPx=width);
  for(let r=6;r<=traceLast;r++){trace.getRange(`A${r}:H${r}`).format.rowHeightPx=r>=106?168:108;trace.getRange(`A${r}:H${r}`).format.fill=r%2?'#F0F5FB':'#FFFFFF';}
  const existingTraceTable=trace.tables.items.find(t=>t.name==='RequirementTrace');if(existingTraceTable)existingTraceTable.delete();
  trace.tables.add(`A5:H${traceLast}`,true,'RequirementTrace').showFilterButton=true;trace.freezePanes.freezeRows(5);trace.freezePanes.freezeColumns(2);trace.tabColor='#64748B';
  for(const snapshot of snapshots){
    const values=snapshot.sheet.getRange(snapshot.range).values,formulas=snapshot.sheet.getRange(snapshot.range).formulas;
    for(let r=0;r<snapshot.values.length;r++)for(let c=0;c<snapshot.values[r].length;c++){
      const beforeFormula=snapshot.formulas[r][c];
      const address=`${String.fromCharCode(65+c)}${r+1}`;
      assert.equal(formulas[r][c]||null,(snapshot.sheet===batch?(decisionFormulaChanges.get(address)??extendSmokeRefs(beforeFormula)):beforeFormula)||null,`Preserve formula ${snapshot.sheet.name}!${r+1}/${c+1}`);
      if(beforeFormula) continue;
      const correction=snapshot.sheet===smoke?design.caseCorrections.find(x=>x.id===snapshot.values[r][0]):null;
      const addedEntry=snapshot.sheet===smoke?design.newCases.find(x=>x.id===snapshot.values[r][0]):null;
      const decisionCorrection=snapshot.sheet===batch?design.decisionCorrections?.find(x=>x.id===snapshot.values[r][0]):null;
      const expected=decisionCorrection&&[1,2].includes(c)&&decisionCorrection[String.fromCharCode(65+c)]?decisionCorrection[String.fromCharCode(65+c)]:correction&&c===9?correction.J:correction&&c===10?correction.K:addedEntry&&c===9?`前置：${addedEntry.data}\n操作：${addedEntry.action}`:addedEntry&&c===10?addedEntry.expected:addedEntry&&c===11?addedEntry.source:snapshot.values[r][c];
      assert.deepEqual(values[r][c],expected,`Unexpected edit ${snapshot.sheet.name}!${r+1}/${c+1}`);
    }
  }
  workbook.recalculate();
  // Verify the added rows participate in scope counts and retain evidence/baseline gates.
  const rationaleGateAssertions=[];
  const expectCell=(sheet,address,expected,label)=>{assert.equal(sheet.getRange(address).values[0][0],expected,label);rationaleGateAssertions.push(label);};
  const reaudit=process.argv.includes('--requirement-reaudit');
  const auditCases=reaudit?[]:design.newCases.filter(c=>design.auditAddedIds.includes(c.id));
  expectCell(batch,'H26',51,'Regression library includes the 20 boundary checks');
  const fixtureMetadata=['B8','B10','B11'].map(address=>[address,batch.getRange(address).values[0][0]]);
  const fixtureCells=[];
  for(const entry of auditCases) for(const letter of ['D','F','G','H','M','O','Q','R']){
    const id=entry.id;
    const address=`${letter}${smokeRowForId.get(id)}`;fixtureCells.push([address,smoke.getRange(address).values[0][0]]);
  }
  const missingMappings=batch.getRange('H30').values[0][0];
  const fixtureDecisionIds=[...new Set(auditCases.flatMap(c=>c.decisions??[]))];
  const fixtureDecisions=fixtureDecisionIds.flatMap(id=>['D','F','G'].map(letter=>{const address=`${letter}${decisionRowForId.get(id)}`;return [address,batch.getRange(address).values[0][0]];}));
  for(const entry of auditCases)smoke.getRange(`D${smokeRowForId.get(entry.id)}`).values=[['是']];workbook.recalculate();
  expectCell(batch,'H20',auditCases.length,'Selected fixture checks enter the batch');
  expectCell(batch,'H30',missingMappings+auditCases.length,'Selected fixture checks require delivery mapping');
  for(const id of fixtureDecisionIds){
    expectCell(batch,`H${decisionRowForId.get(id)}`,'待确认',`${id} is automatically in scope through its new check`);
    batch.getRange(`F${decisionRowForId.get(id)}`).values=[['已确认']];batch.getRange(`G${decisionRowForId.get(id)}`).values=[['fixture-decision-evidence']];
  }
  batch.getRange('B8').values=[['fixture-design-build']];batch.getRange('B10').values=[['fixture-design-req']];batch.getRange('B11').values=[['fixture-design-ui']];workbook.recalculate();
  const fixtureBasis=batch.getRange('B18').values[0][0];
  for(const entry of auditCases){
    const id=entry.id;
    const r=smokeRowForId.get(id);
    for(const [letter,value] of [['D','是'],['F','已确认'],['G','通过'],['H','fixture-design-build'],['R',fixtureBasis]]) smoke.getRange(`${letter}${r}`).values=[[value]];
    workbook.recalculate();expectCell(smoke,`I${r}`,'交付未映射',`${id} cannot pass without delivery mapping`);
    smoke.getRange(`Q${r}`).values=[['fixture-delivery']];workbook.recalculate();expectCell(smoke,`I${r}`,'缺少证据',`${id} cannot pass without evidence`);
    smoke.getRange(`M${r}`).values=[['fixture-evidence']];workbook.recalculate();expectCell(smoke,`I${r}`,'缺少执行人',`${id} cannot pass without an executor`);
    smoke.getRange(`O${r}`).values=[['fixture-tester']];workbook.recalculate();expectCell(smoke,`I${r}`,'通过',`${id} accepts a complete matching case record`);
    for(const decisionId of entry.decisions??[]){
      const dr=decisionRowForId.get(decisionId);
      batch.getRange(`F${dr}`).values=[['待确认']];workbook.recalculate();expectCell(smoke,`I${r}`,'依据待确认',`${id} cannot bypass pending ${decisionId}`);
      batch.getRange(`F${dr}`).values=[['已记录后置']];workbook.recalculate();expectCell(smoke,`I${r}`,'依据待确认',`${id} cannot postpone core ${decisionId}`);
      batch.getRange(`F${dr}`).values=[['已确认']];batch.getRange(`G${dr}`).values=[[null]];workbook.recalculate();expectCell(smoke,`I${r}`,'依据待确认',`${id} requires approval evidence for ${decisionId}`);
      batch.getRange(`G${dr}`).values=[['fixture-decision-evidence']];batch.getRange(`D${dr}`).values=[['否']];workbook.recalculate();expectCell(smoke,`I${r}`,'依据待确认',`${id} cannot bypass contradictory scope for ${decisionId}`);
      batch.getRange(`D${dr}`).values=[['待选择']];workbook.recalculate();expectCell(smoke,`I${r}`,'通过',`${id} accepts resolved ${decisionId}`);
    }
    smoke.getRange(`R${r}`).values=[['fixture-obsolete-basis']];workbook.recalculate();expectCell(smoke,`I${r}`,'基线已变，需复测',`${id} invalidates an obsolete baseline`);
    smoke.getRange(`R${r}`).values=[[fixtureBasis]];smoke.getRange(`G${r}`).values=[['受阻']];workbook.recalculate();expectCell(smoke,`I${r}`,'受阻',`${id} preserves blocked status`);
    smoke.getRange(`D${r}`).values=[['否']];workbook.recalculate();expectCell(smoke,`I${r}`,'不适用',`${id} excludes an out-of-scope case`);
  }
  for(const [address,value] of fixtureMetadata) batch.getRange(address).values=[[value??null]];
  for(const [address,value] of fixtureCells) smoke.getRange(address).values=[[value??null]];
  for(const [address,value] of fixtureDecisions) batch.getRange(address).values=[[value??null]];
  workbook.recalculate();expectCell(batch,'H20',0,'Fixture scope restored');expectCell(batch,'H30',missingMappings,'Fixture mappings restored');
  const errors=await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:60},summary:'Formula error scan after rationale edit',maxChars:3000});
  const previews=reaudit?[['冒烟用例','J30:K30','reaudit_cost_ledger_preview.png'],['冒烟用例','J55:K56','reaudit_entry_state_preview.png'],['冒烟用例','J84:L84','reaudit_fuel_exception_preview.png'],['冒烟用例','T84:U85','reaudit_specific_methods_preview.png'],['需求对照','A106:D107','reaudit_reference_left_preview.png'],['需求对照','E106:H107','reaudit_reference_right_preview.png'],['本批提测','A107:H110','reaudit_source_boundary_preview.png']]:[['本批提测','A82:H90','design_guide_preview.png'],['本批提测','A94:H100','design_matrix_preview.png'],['冒烟用例','J52:L52','strict_delete_boundary_preview.png'],['冒烟用例','J34:L34','unit_boundary_audit_preview.png'],['冒烟用例','J71:L72','reference_failure_boundary_preview.png'],['冒烟用例','J74:L75','card_numeric_boundary_preview.png'],['冒烟用例','J78:L79','product_boundary_preview.png'],['冒烟用例','J83:L85','simulation_boundary_preview.png'],['需求对照','A5:D12','clause_trace_left_preview.png'],['需求对照','E5:H12','clause_trace_right_preview.png'],['UI检查','AD5:AE10','design_ui_preview.png']];
  for(const [sheetName,range,name] of previews){
    const preview=await workbook.render({sheetName,range,scale:1,format:'png'});
    await fs.writeFile(`${supportDir}/${name}`,new Uint8Array(await preview.arrayBuffer()));
  }
  const xlsx=await SpreadsheetFile.exportXlsx(workbook);await xlsx.save(outputPath);
  const report={path:outputPath,operation:reaudit?'requirement and cited-reference reaudit':'clause-by-clause boundary and exception audit',caseCounts:counts,totalCases:116,clauseGroups:design.traceability.length,moduleThemes:design.moduleMatrix.length,guideSteps:design.guide.length,correctedCasesThisAudit:reaudit?design.reauditCorrectedIds:design.auditCorrectedIds,correctedCases:design.caseCorrections.map(c=>c.id),addedCases:design.newCases.map(c=>c.id),addedDuringThisRun:added,rationaleGateAssertions,decisionFormulaChanges:Object.fromEntries(decisionFormulaChanges),unrelatedContentAndFormulasPreserved:true,source:design.source,formulaScan:errors.ndjson,execution:'All 116 checks remain unexecuted; no business-environment test was run'};
  await fs.writeFile(`${supportDir}/design_rationale_verification.json`,JSON.stringify(report,null,2),'utf8');
  console.log(JSON.stringify(report));
} else {
// This supplied template has no execution records. Stop rather than erase user work.
for (const [sheet,mapping,basis] of [[smoke,'Q','R'],[ui,'U','V']]) {
  const last=sheet.getRange('A6:A150').values.findLastIndex(r=>Boolean(r[0]))+6;
  assert(sheet.getRange(`G6:G${last}`).values.every(r=>r[0]==='未执行'), 'Existing execution records require a targeted merge');
  assert(sheet.getRange(`F6:F${last}`).values.every(r=>r[0]==='待确认'), 'Preserve confirmed acceptance bases');
  assert(sheet.getRange(`D6:D${last}`).values.every((r,i)=>r[0]===(sheet===smoke&&i<5?'是':'待选择')), 'Preserve selected batch scope');
  assert(sheet.getRange(`H6:H${last}`).values.every(r=>!r[0]));
  assert(sheet.getRange(`M6:O${last}`).values.every(r=>r.every(v=>!v)));
  assert(sheet.getRange(`${mapping}6:${basis}${last}`).values.every(r=>r.every(v=>!v)), 'Preserve existing batch mappings');
}
for(const address of ['B7','B8','B9','B10','B11','B15','B16','B34','B35','B36']) assert(!batch.getRange(address).values[0][0], 'A filled batch must be preserved');
assert(batch.getRange('B33').values[0][0]==='待评审');
assert(batch.getRange('B12').values[0][0]==='待确认'&&batch.getRange('B17').values[0][0]==='待确认');
const existingDecisionLast=batch.getRange('A40:A61').values.findLastIndex(r=>/^DEC/.test(r[0]??''))+40;
assert(batch.getRange(`D40:D${existingDecisionLast}`).values.every(r=>r[0]==='待选择'));
assert(batch.getRange(`F40:F${existingDecisionLast}`).values.every(r=>r[0]==='待确认'));
assert(batch.getRange(`G40:G${existingDecisionLast}`).values.every(r=>!r[0]), 'Preserve existing decisions');
try { await fs.access(`${supportDir}/before-recheck.xlsx`); } catch { await fs.copyFile(outputPath, `${supportDir}/before-recheck.xlsx`); }
try { await fs.access(`${supportDir}/before-second-recheck.xlsx`); } catch { await fs.copyFile(outputPath, `${supportDir}/before-second-recheck.xlsx`); }
try { await fs.access(`${supportDir}/before-review-details.xlsx`); } catch { await fs.copyFile(outputPath, `${supportDir}/before-review-details.xlsx`); }
const reviewSnapshot=JSON.parse(await fs.readFile(`${supportDir}/review_source_snapshot.json`,'utf8'));
assert.equal(reviewSnapshot.records.length,18);
assert.equal(new Set(reviewSnapshot.records.map(r=>r.recordId)).size,18);
const reviewSource=new Map(reviewSnapshot.records.map(r=>[r.caseId,r]));
const font = 'Arial';
const ink = '#25324A';
const navy = '#213B62';
const muted = '#64748B';
const amber = '#FFF4D6';
const smokeCases = [
  ['SM01','通用','账号身份与登录返回','准备本批有权限的测试账号，记录账号别名。','从航司页链接进入，完成登录后核对账号、角色、目标页面。','身份正确；登录后进入原目标页面，字典分类保持 airline。','建议共通检查；登录入口已观察','是','是'],
  ['SM02','通用','页面与接口权限','准备授权账号及受限账号，权限边界由本批确认。','分别打开本批页面并尝试同一业务操作；核查对应请求的权限结果。','授权账号可完成操作；受限账号被拒绝，无越权数据或写入。','建议共通检查；权限规则待本批确认','是','是'],
  ['SM03','通用','菜单、分类与深链接','明确本批页面及分类标识。','从菜单进入、直接打开链接、切换分类，再检查 URL 和内容。','菜单高亮、分类、标题、URL 和列表内容一致。','建议共通检查；REQ §6.5','是','是'],
  ['SM04','通用','刷新与返回上下文','进入本批页面并设置已约定需保留的状态。','刷新页面，再执行浏览器返回和前进。','保持当前路由；必要状态按确认规则保留，无意外跳转。','REVIEW 第17项；状态范围需确认','是','是'],
  ['SM05','通用','成功、加载与失败反馈','使用可观察的正常请求和可控失败条件。','执行一次查询或保存；检查加载、完成及失败反馈。','反馈对应真实结果；加载能结束；保存成功可通过重新查询核实。','建议共通检查；SPEC §7','是','是'],
  ['SM06','业务字典','已有数据与空结果','准备已知存在的选项及不会命中的查询词。','查询已知选项，再查询无结果条件。','已有数据正确；无结果显示空态，未残留上一轮数据。','REQ §6.5；空态检查为建议补充','待选择','是'],
  ['SM07','业务字典','查询与重置','本批先确认字典搜索字段、触发方式及默认条件。','输入支持的查询条件，执行查询后重置。','结果匹配规则；重置恢复默认；列表有刷新反馈。','REVIEW 第9项；航司搜索规则待确认','待选择','是'],
  ['SM08','业务字典','分页与总数','准备超过一页的数据；本批确认是否提供分页。','翻页、调整每页条数并检查总数。','页码、条数、总数和数据一致；翻页不串分类。','REVIEW 第11项；仅适用有分页页面','待选择','是'],
  ['SM09','业务字典','普通字典必填','本批交付普通字典；准备专用测试选项。','不填选项值保存，再填写有效值保存。','选项值必填；提示对应字段；有效数据可保存。','REQ §6.5 普通字典','待选择','是'],
  ['SM10','业务字典','带编码字典必填','本批确认航司是否采用带编码字典，以及编码格式。','分别缺少编码、缺少显示名称，再完整填写保存。','编码及显示名称均必填；格式按本批确认规则校验。','REQ §6.5；航司类型与格式待确认','待选择','是'],
  ['SM11','业务字典','新增保存与持久化','准备符合确认规则的专用测试数据。','新增并保存，重新查询，再刷新页面。','新增项可查到且值正确；刷新后仍存在。','REQ §6.5；增加持久化读回检查','待选择','是'],
  ['SM12','业务字典','编辑回显与保存','使用专用测试项，记录修改前内容。','打开编辑检查回显；修改后保存，重新查询。','回显完整；保存后仅目标项发生预期变更。','REQ §6.5','待选择','是'],
  ['SM13','业务字典','取消编辑不写入','使用专用测试项，记录原值。','编辑内容后取消或关闭，再重新打开。','取消操作未保存修改；原值保持。','建议补充；关闭和未保存提示规则待确认','待选择','是'],
  ['SM14','业务字典','取消删除','使用明确可清理的专用测试项。','点击删除，在确认提示中取消，重新查询。','出现确认提示；取消后选项仍存在。','REQ §6.5','待选择','是'],
  ['SM15','业务字典','删除与历史引用','使用可清理测试项及引用它的历史测试单据。','确认删除，再检查新建、编辑表单的选项及历史单据。','选项不再出现在新建或编辑表单；历史单据不受影响。','REQ §6.5；只操作专用测试数据','待选择','是'],
  ['SM16','业务字典','重复编码处理','产品先确认唯一性范围及重复处理方式。','在约定范围内提交重复编码，并核查结果。','按照已确认规则拒绝、提示或处理，不自行假定编码唯一。','建议补充；关联 DEC06','待选择','是'],
  ['SM17','业务字典','字典分类管理范围','本批明确是否交付分类新增、改名和删除。','按交付范围检查分类操作及对选项、业务引用的影响。','已交付操作符合确认方案；未交付内容明确列出。','REQ 评论提出范围缺口；关联 DEC07','待选择','是'],
  ['SM18','业务字典','业务表单选项联动','确认本批字典被哪些业务表单使用。','维护测试选项后进入引用表单，选择并保存。','下拉、搜索或勾选展示正确；保存的编码与显示名称对应。','REQ §6.5；联动范围需本批确认','待选择','是'],
  ['SM19','地点与邮编','地点校验与版本','准备专用地点数据及已有重复地点 ID。','检查必填、ISO2、重复 ID；新增后编辑保存。','必填校验正确；ISO2 为两位；ID 不重复；新增 V1，编辑版本递增。','REQ §6.5 地点与邮编','待选择','是'],
  ['SM20','地点与邮编','邮编作为匹配属性','准备精确邮编、前缀和区间，如文档示例。','新增或编辑地点，逐行填写邮编条件并保存读回。','支持约定的三类表达；邮编随地点维护和生成版本，不成为独立地点类型。','REQ §6.5 地点与邮编','待选择','是'],
  ['SM21','服务单元','创建与成本价卡','准备服务商及符合规则的专用服务单元。','创建服务单元，查询服务单元及绑定成本价卡。','服务单元可查到；创建时同步生成成本价卡，关联正确。','REQ §6.2','待选择','是'],
  ['SM22','服务单元','禁用编排与历史链路','准备测试服务单元及已引用的测试产品。','禁用编排，检查新产品选用列表及已有产品历史链路。','停用后不可用于新编排；历史链路保留；列表不提供删除操作。','REQ §6.2','待选择','是'],
  ['SM23','成本价卡','有效规则与状态选择','确认本批价卡规则、有效期和测试时间。','配置一组可人工核算的数据，检查生效及失效场景。','状态与实际可用性一致；计算选用符合约定的有效价卡。','REQ §6.1、§6.3；具体细则待确认','待选择','是'],
  ['SM24','产品编排','最短产品建档链路','本批确认服务单元、服务组合及产品的交付范围。','选用有效测试资源，完成编排及本批交付的保存或启用操作。','资源关联正确，结果持久化；本期不进入审批流。','REQ §6.1；具体编排校验待确认','待选择','是'],
  ['SM25','计算模拟','人工可核算的成本基准','产品提供一组输入及人工核算的预期成本明细。','提交试算，比较总额、构成和使用的规则版本。','计算结果符合批准的核算口径；缺少规则时明确说明原因。','REQ §6.1；核算数据需产品提供','待选择','是'],
  ['SM26','计费历史','重新计费不覆盖历史','准备有原成本快照的测试订单，确认当前有效规则。','重新计费，核查原参数、差异结果、历史快照和结算状态。','使用原订单参数及当前规则；不覆盖原快照、不自动改变结算或 OMS 历史成本。','REQ §6.4 后续计费历史说明','待选择','是'],
  ['SM27','AI 建档','解析、校验与保存','使用经授权的测试材料，确认本批解析字段和流程。','上传并解析，核对原文与字段，再确认并保存读回。','用户能核对结果；失败有反馈；保存后数据正确，不能只凭解析成功提示判通过。','REQ §6.1；REVIEW 第16项；细则待确认','待选择','是'],
  ['SM28','批量操作','选择范围与执行对象','产品确认全选、跨页、筛选变化后的选择规则。','勾选测试记录，翻页或变更筛选后执行本批支持的批量操作。','选中数量和实际操作对象一致；选择范围按确认规则处理。','REVIEW 第12、13项；关联 DEC08','待选择','是'],
];

// Source review priorities and confirmation states are preserved separately
// from batch-specific acceptance decisions and execution results.
const reviewRows = [
  ['UI01','基础配置','分类层级与新增入口','切换主数据和计价底座，再切换子项，检查当前列表新增入口。','按本批确认设计使用页头一级 Tab；子项位于内容区；新增入口关联当前列表。','P0','无法覆盖','UI','是','第1项；关联 DEC01'],
  ['UI02','左侧菜单','跨分类与手动展开','跨一级分类选择子菜单；手动展开多个分类，再检查当前选中项。','按确认方案保留多级折叠；跨分类选中时收起其他分类；手动允许多个展开；当前路径可见。','P1','无法覆盖','UI','是','第2项；关联 DEC02'],
  ['UI03','服务单元','下单规则选择反馈','打开下单规则，勾选及取消多个选项。','采纳 Review 后，仅保留列表 Checkbox 的选择反馈，移除重复 Tag 和底部数量汇总。','P0','调整后复用','UI、产品','否','第3项；需确认采纳方案'],
  ['UI04','服务单元','禁用编排风险提示','触发禁用编排确认，检查图标、文案、确认和取消。','风险语义与 Warning 警告图标一致；操作反馈符合确认方案。','P1','调整后复用','UI','是','第4项'],
  ['UI05','全局','原型说明文案清理','逐页核对辅助说明、功能解释和必要业务提示。','只保留产品确认的操作说明、业务规则和必要提示，删除原型过程性文案。','P0','业务信息待明确','产品','否','第5项'],
  ['UI06','左侧菜单','菜单视觉与图标','核对缩进、字重、选中态、展开箭头、间距及一级菜单图标。','复用现有通用框架，不另造视觉样式。','P2','直接复用','开发','否','第6项'],
  ['UI07','顶部导航','导航结构与无功能入口','检查导航、页面标题以及搜索和消息等入口。','复用框架；多余标题按确认方案处理；无功能入口按方案隐藏。','P2','直接复用','开发','否','第7项'],
  ['UI08','所有页头','面包屑与操作对齐','检查面包屑、标题、副标题和操作按钮位置。','复用框架结构；避免重复表达；副标题保留与否由产品确认。','P1','直接复用','产品','否','第8项'],
  ['UI09','所有查询区','筛选布局与刷新反馈','检查控件、字段排列、下拉样式；执行查询和重置。','复用控件尺寸和栅格；按业务保留字段；查询与重置有刷新反馈。','P2','直接复用','开发','是','第9项；地点即时查询见 DEC09'],
  ['UI10','所有列表','列表容器与列适配','检查容器留白、行高、列宽、长文本及必要操作。','复用 Table 框架；保留规定 Padding；长文本、固定列和操作区按真实数据适配。','P2','直接复用','开发','否','第10项'],
  ['UI11','所有列表','分页组件与能力','切换页码及条数，检查总数和布局。','沿用框架分页组件；条数和跳转能力按业务配置。','P1','直接复用','开发','是','第11项'],
  ['UI12','所有列表','横向滚动固定列','使用足够多列及长内容，向左右滚动并勾选记录。','有勾选列时固定勾选列和核心识别字段；操作列固定；分隔和阴影遵循框架。','P1','直接复用','开发','是','第12项'],
  ['UI13','所有列表','批量操作栏位置','勾选、取消选择，再执行本批支持的批量操作。','Table 顶部显示批量操作栏，取消选择后恢复；无底部悬浮条遮挡。','P1','直接复用','开发','是','第13项；范围规则见 DEC08'],
  ['UI14','所有列表','行级选中态与固定区','勾选行后横向滚动，比较主体区与固定列背景。','默认行、Checkbox、Tag 沿用框架；选中底色覆盖整行和固定列。','P2','直接复用','开发','否','第14项'],
  ['UI15','所有列表','编码链接的真实行为','点击蓝色编码，检查详情入口和返回上下文。','承担详情入口时提供完整点击行为；无跳转能力则使用普通文本。','P0','直接复用','产品','是','第15项；关联 DEC04'],
  ['UI16','AI 建档','建档页面承载','按本批确认流程检查上传资料、解析结果、步骤导航和确认操作。','采纳 Review 后使用独立表单页；步骤、内容及操作区清晰；主体左右留白 24px。','P0','直接复用','产品','是','第16项；关联 DEC05'],
  ['UI17','全局','刷新保持页面','在本批各页面刷新，检查 URL、菜单和必要上下文。','刷新保持当前页面及约定的必要状态，特殊跳转需产品确认。','P1','直接复用','开发','是','第17项；可复用 SM04 证据'],
  ['UI18','服务单元','详情 Drawer 与滚动','打开详情、滚动长内容、连续查看多条，再进入编辑。','采纳 Review 后使用右侧 Drawer；按信息分组；内容滚动；标题和操作区固定；不用 emoji 图标。','P0','直接复用','开发','是','第18项；关联 DEC03'],
];
// Detailed actions are derived from every clause of the 18 live Feishu records.
const detailRevisions={
 UI01:{steps:'前置：取得本批专项设计稿并确认DEC01。\n1.切换主数据／计价底座。\n2.分别切换内容区子项并核对列表。\n3.从右侧列表顶部点击新增选项，核对弹出表单所属分类。',expected:'1.主数据／计价底座位于页头一级Tab；子项独立位于内容区，选中态、分类与列表一致。\n2.新增选项位于右侧当前列表顶部，创建目标属于当前分类。\n3.层级承载依专项稿；Tabs样式与交互另见UI33/34，不能把子项强制做成同层嵌套Tabs。',change:'补齐新增入口归属、父子分类内容一致；专项稿修改中不等于采用；子项承载由设计确定。'},
 UI02:{steps:'前置：确认DEC02专项稿；至少2个一级分类含子菜单。\n1.跨一级分类选择子菜单。\n2.手动连续展开多个一级分类再收起非当前分类。\n3.核对当前子菜单及其父分类。',expected:'1.恢复可展开／收起的多级菜单；跨分类选择子菜单时，收起此前展开的其他一级分类。\n2.手动展开时允许多个分类同时展开，不强制只能展开一个。\n3.当前子菜单持续高亮，其所属一级分类保持展开，路径清晰；当前父分类与手动收起的边界按专项稿。',change:'拆分跨分类选择与手动展开两种规则；新增当前子菜单高亮、父分类展开；不以框架默认手风琴替代。'},
 UI03:{steps:'前置：DEC22明确原正文数量提示与Review去冗余的取舍。\n1.勾选／取消多个规则，观察Checkbox、搜索框下已选Tag和右下角数量。\n2.搜索、翻页再返回原规则，核对跨页勾选及实际保存对象。',expected:'采纳Review后，选中状态仅由列表Checkbox反馈，删除顶部重复已选Tag及底部数量汇总；勾选／取消均准确。跨页选择、搜索后保留已选及保存对象不因视觉精简丢失。未采纳时按批准现行方案验收，不能同时强制保留和删除数量汇总。',change:'记录组合复用与开发组合实现/UI补布局；补跨页数据保护；正文与Review数量提示冲突交DEC22。'},
 UI04:{steps:'1.在服务单元列表触发禁用编排确认。\n2.核对图标类型及语义色与本批风险组件。\n3.取消确认并检查页面；实际禁用的状态结果复用SM22证据。',expected:'采纳后使用Warning警告图标及匹配的风险语义色，符合禁用编排风险；不用普通信息图标代替。确认文案与业务影响一致；取消不触发禁用。图标具体颜色取本批规范，Review未提供独立色值。',change:'补齐后续处理要求的语义色，图标与业务结果分别核对；不凭“警告”猜固定颜色。'},
 UI05:{steps:'前置：产品提供已批准的保留／删除文案清单。\n1.逐页核对辅助说明、功能解释、过程性和重复文字。\n2.复查操作说明、业务规则、必填错误、风险及必要提示是否仍可读。',expected:'只保留与用户操作、业务规则及必要提示相关的已批准内容；删除原型过程性说明和重复文字。不得为精简而删除业务规则或关键错误提示；未定文案交产品确认，不自行将“所有说明文字”判为多余。',change:'以产品文案清单验收；补留存业务必要提示的保护，保留原始信息待明确状态。'},
 UI06:{steps:'1.对照本批通用框架检查一级菜单及各级子菜单。\n2.逐项核对缩进、字号、字重、选中态尺寸、展开箭头和菜单间距。\n3.检查一级菜单左侧图标及选中／展开状态。',expected:'上述视觉项复用通用框架，一级菜单有对应左侧图标；层级和状态使用已批准框架样式，不新增独立尺寸、字重或图标体系。各尺寸从本批框架/规范取值；Review未定义具体像素值。',change:'补齐原问题明确指出的选中态尺寸、字号与一级菜单左侧图标。'},
 UI07:{steps:'1.对照框架检查顶部导航与页面内容页头。\n2.核对多余页面标题是否按本批方案移除。\n3.检查搜索、消息等入口的实际功能及本批隐藏清单。',expected:'顶部导航复用通用框架；多余标题按采用方案处理。搜索、消息等尚无功能的板块可按批准方案暂时隐藏；有已交付功能的入口应保留可用，不能据该建议一律隐藏。',change:'保留“可先暂时隐藏”的限定，避免一刀切隐藏有功能的搜索/消息入口。'},
 UI08:{steps:'1.检查面包屑落位与页面标题、按钮对齐。\n2.对照产品文案稿核对副标题是否必要；保留时核对带副标题页头规范。\n3.核对说明中的「」是否按已采纳文案建议调整。',expected:'面包屑及操作按钮使用本批框架页头结构，修正原型将面包屑置于顶部导航及与标题重复表达的问题。副标题非完全必要可删除；保留时按对应页头规范。去除「」为“最好不要”的建议，只按产品批准文案验收，不作为全站禁止引号的硬规则。',change:'补面包屑原始落位问题、按钮对齐、保留副标题的条件及「」建议性质。'},
 UI09:{steps:'1.按实际交付字段检查尺寸、栅格间距、顺序、按钮和下拉样式。\n2.3字段场景核对依次排列、右侧查询/重置和剩余空白。\n3.查询、重置后观察刷新；地点/Zone另检查即时查询。',expected:'字段数量按业务保留，不强行匹配框架示例列数。控件、栅格和下拉复用框架；当前3字段建议依次排列，右侧为标准查询/重置，余白无需拉伸字段填满。查询和重置均有列表刷新反馈。即时查询正文要求保留，按钮组合语义先确认DEC09。',change:'完整覆盖5条建议；3字段只是原场景，不升为全站固定3列；补“不拉伸填满”。'},
 UI10:{steps:'1.核对Table容器、表头/行高、行背景、列宽、固定列和操作区。\n2.分别查看本批有/无顶部操作按钮的列表。\n3.用长文本、宽字段及多操作记录检查适配。',expected:'整体直接复用现有Table框架；业务仅保留字段、数据及必要状态差异。顶部操作可按业务隐藏，但仍保留框架规定容器Padding。长文本、固定列和操作项按实际数据适配；具体表格数值见UI20/21/26。',change:'补“隐藏顶部操作仍保留Padding”，避免按钮隐藏导致容器留白丢失。'},
 UI11:{steps:'前置：确认本批页条数选项及是否提供跳页。\n1.检查总数、页码、每页条数组件与布局。\n2.切换页码、条数并核对实际记录。\n3.仅已交付跳页时检查有效/无效页码；无跳页时核对采用方案。',expected:'总数、页码切换、每页条数等基础能力和布局复用框架，展示与实际数据一致。具体条数及是否展示页码跳转按业务配置；不能从框架示例强制要求全站10/50/100或必须跳页，已有模块明确要求另按正文。',change:'明确基础能力必须核对；条数/跳页是业务配置，不把示例作为通用要求。'},
 UI12:{steps:'前置：本批实际提供横向滚动及勾选功能。\n1.滚动至左右两端并连续勾选多行。\n2.核对左右固定区域、普通业务字段滚动及分隔/阴影。\n3.核对中间字段仍有有效展示空间。',expected:'有勾选时左侧至少固定勾选列+核心识别字段（如名称/编号），右侧操作列固定；其余业务字段随横向滚动。分隔/阴影复用框架；不建议冻结过多字段。具体核心字段按本批确认，不机械同时固定所有名称/编码字段；无勾选功能不强加Checkbox。',change:'补普通字段滚动、中间展示空间及核心字段条件，避免固定列过度冻结。'},
 UI13:{steps:'1.记录未选中时Table顶部默认工具栏。\n2.勾选1行及多行，核对顶部批量按钮与整行选中态。\n3.取消部分选择，再取消全部选择。\n4.检查页面底部及末行是否被浮层遮挡。',expected:'至少选中1行后在Table顶部展示批量操作按钮，选中行使用框架标准选中态；取消全部选择后恢复默认工具栏。采用方案不新增底部悬浮操作条，表格内容不被遮挡。实际操作对象、跨页范围仍按SM28/DEC08的模块规则。',change:'补从无选择到多选再清空的完整状态链路，恢复默认工具栏不能只隐藏按钮。'},
 UI14:{steps:'1.比较默认/hover/选中行的主区与左右固定区。\n2.逐项检查行高、字体层级、Checkbox和Tag。\n3.取消选择，核对全行及固定区恢复。',expected:'复用框架标准行高、字体层级、Checkbox和Tag；默认行背景统一。勾选后整行标准选中底色同步覆盖主体及固定列，取消后同步恢复；不新增独立行背景、字重或选中样式。数值按UI20及本批基线，不以主观“信息密度低”作独立阈值。',change:'补默认/hover/选中/恢复和两侧固定区；原问题不等于可自行增加密度阈值。'},
 UI15:{steps:'前置：DEC04确认各模块编码是否承担详情入口，服务单元编码需产品决策。\n1.点击应可跳转编码并核对目标对象/返回路径。\n2.检查不承担跳转的编码是否为普通文本。\n3.对已有正文要求的组合编码详情链接单独核对。',expected:'承担详情入口的编码提供完整点击交互并打开正确对象；无跳转能力且不需承担入口时改普通文本，不保留错误蓝色链接暗示。不得以Review“可改普通文本”取消正文已要求的服务组合编码详情入口。',change:'补链接/纯文本双分支与正确对象；区分服务单元待决策和已定义编码入口。'},
 UI16:{steps:'前置：DEC05批准独立页承载及DEC17确认本批流程字段。\n1.进入独立表单页，贯穿上传资料、解析结果和人工确认状态。\n2.核对步骤导航、内容区及底部操作区。\n3.测量主体左右Padding，滚动长内容核对可持续查看。',expected:'采纳后以独立表单页面承载完整建档流程，清晰保留步骤导航、内容区、底部操作区；资料、AI结果和确认状态可持续查看；主体左右各24px Padding。避免用大弹窗承载该长流程；不将此建议推成全站禁止弹窗或推导材料10MB限制。',change:'补完整建档链路与资料/结果/确认持续可见；24px是主体两侧，不是所有内部容器。'},
 UI17:{steps:'1.在本批列表、详情及独立页记录当前URL、选中菜单和批准需保留的状态。\n2.执行浏览器刷新，对比页面、路由和状态。\n3.存在特殊跳转时核对产品批准场景及目标。',expected:'刷新保持当前页面/路由及必要状态，无非预期跳转；特殊跳转须产品确认。必要状态按本批方案，不据Review默认要求所有筛选、页码或未保存字段持久化；可复用SM04证据。',change:'补路由前后比对、特殊跳转及必要状态边界，避免过度要求所有UI状态保留。'},
 UI18:{steps:'前置：DEC03决定正文弹窗与Review Drawer承载。\n1.带筛选/分页上下文打开服务单元详情。\n2.核对基础信息、关联关系和规则配置分组，滚动长内容。\n3.关闭后连续查看其他对象并核对列表上下文及对象内容；检查图标。',expected:'采纳后用右侧详情Drawer并保留当前列表上下文；信息按模块分组；内容区纵向滚动而顶部标题、底部操作区固定。连续查看时对象内容正确，长内容可完整查看，图标不用emoji。源表未定义编辑权限/保存逻辑，不以“进入编辑”作为本条固有步骤。',change:'补关闭后上下文与连续查看对象正确；删除本条无来源的固定进入编辑步骤。'}
};
for(const r of reviewRows){
  const source=reviewSource.get(r[0]),revision=detailRevisions[r[0]];
  assert(source&&revision,`Missing source or detail revision for ${r[0]}`);
  r[1]=source.module;r[3]=revision.steps;r[4]=revision.expected;r[5]=source.priority;r[6]=source.adaptation;r[7]=source.roles;
  r[9]=`记录 ${source.recordId}；${['UI01','UI02','UI03','UI15','UI16','UI18'].includes(r[0])?'须先确认关联决策':'建议须按本批批准基线采纳'}；2026-10-10逐字段读取`;
}
const specRows = [
  ['UI19','通用字体','字体数值与字重','用计算样式核对页头、模块标题、正文、辅助文字和标签。','Windows 使用约定字族；H1 20px、H2 16px、H3/正文 14px、辅助 13px、标签 12px；字重依规范为 400/500，不使用 600/700。','SPEC §3.2；数值来自规范表','否'],
  ['UI20','桌面表格','表格基础规格','在约定桌面视口查看行高、表头、分割线和行状态。','桌面行高 48px；表头背景 #F7F7F7、字重 500；底部分割线 1px solid #EBEBEB。','SPEC §5.8；数值来自规范表','否'],
  ['UI21','表格操作','操作位置与间距','横向滚动后检查操作列，测量文字按钮间距。','操作列位于最右并固定；采用文字按钮；操作间距 16px。','SPEC §5.8；数值来自规范表','是'],
  ['UI22','金额字段','金额右对齐与精度','检查本批价格、成本及计费页面的金额展示。','金额右对齐，展示两位小数；计算精度和四舍五入口径仍按产品确认规则。','REQ 待确认事项第7项已解决','否'],
  ['UI23','状态反馈','默认、加载、空态与错误','按同一页面检查有数据、无数据、无匹配结果、请求失败和加载。','使用确认后的状态组件和文案；各状态能辨认且可恢复，不残留错误数据。','SPEC §7；状态矩阵为建议补充','是'],
  ['UI24','响应式','本批支持视口','按本批支持范围检查桌面基准及边界；支持平板或手机时补对应断点。','桌面设计基准 1440px、范围 ≥1280px；平板 768–1279px；手机 <768px；支持范围需本批确认，无关键操作被截断。','SPEC §4.5；移动支持按项目确认','是'],
  ['UI25','表单交互','可操作的控件状态','检查必填、错误、禁用、加载及键盘焦点等本批适用状态。','状态与可操作性一致；错误对应字段；关键按钮可见、可达；具体样式采用确认基线。','SPEC §5.7、§7；操作矩阵为建议补充','是'],
  ['UI26','长内容','长文本与内容滚动','使用长名称、多行规则及较多记录，检查列表、弹窗和抽屉。','内容可读、可滚动；关键操作不被遮挡；缩略文本按确认方案提供查看方式。','REVIEW 第10、18项；建议补边界数据','是'],
];
const decisions = [
  ['DEC01','基础配置一级 Tab、子项及新增入口位置','UI01','待选择','UI、产品','待确认',''],
  ['DEC02','左侧菜单跨分类收起与手动多分类展开','UI02','待选择','UI、产品','待确认',''],
  ['DEC03','服务单元详情：需求弹窗与 Review Drawer 的选择','UI18','待选择','产品、UI','待确认',''],
  ['DEC04','编码是否承担详情入口，或采用普通文本','UI15','待选择','产品','待确认',''],
  ['DEC05','AI 建档独立页面、步骤及确认流程','UI16、SM27','待选择','产品、UI','待确认',''],
  ['DEC06','航司字典类型、编码格式、唯一性及重复处理','SM10、SM16','待选择','产品','待确认',''],
  ['DEC07','字典分类自身的新增、改名和删除是否交付','SM17','待选择','产品','待确认',''],
  ['DEC08','全选、跨页和筛选变化后的批量选择范围','SM28、UI13','待选择','产品','待确认',''],
  ['DEC09','地点关键词即时刷新与标准查询按钮的组合行为','SM07、UI09','待选择','产品、UI','待确认',''],
];

// Recheck against the rendered PRD, including strikethroughs and comments (2026-10-10).
// Deleted Sheet-name and product-base effective-time clauses are intentionally omitted.
function reviseSmoke(id, patch) { const r=smokeCases.find(x=>x[0]===id); for(const [k,v] of Object.entries(patch)) r[Number(k)]=v; }
reviseSmoke('SM01',{4:'从本批交付页面的深链接进入，完成登录后核对账号、角色和目标页面；仅航司批次核对 resource=airline。',5:'使用本批正确身份；登录返回本批目标页及约定分类，不把航司页写成所有批次的固定入口。'});
reviseSmoke('SM23',{2:'成本价卡保存、启用与到期',3:'绑定启用服务单元；设未来开始时间和晚于开始的结束时间，准备不改系统时钟的可控报价时点。',4:'保存静态价卡，启用；按开始前、有效期内、结束后分别查询或试算。',5:'创建为待生效；启用且在生效期内为生效中；手动停用或到期为停用。待生效不参与新成本计算，历史快照不变。端点含闭口径按 DEC19。',6:'REQ §6.3 成本价卡列表／版本规则；本期无审批态'});
reviseSmoke('SM24',{2:'编排保存与提交发布',3:'本批提供可选服务单元／组合、唯一产品编码和有效价卡；保存态名称先决策 DEC11。',4:'选择覆盖本批范围的节点，填写必填项；保存后继续编排，再提交并从产品库读回。',5:'链路和必填项校验；继续编排不清空；提交直接发布、不创建工单。保存态按 DEC11，不能同时把草稿与待生效作为两个业务态。',6:'REQ §6.4 阶段1—3／底部按钮；列表已将待生效划线改为草稿，按钮说明尚未同步'});
reviseSmoke('SM25',{2:'单票成本试算最短闭环',3:'准备已发布未停用产品及本批完整人工成本算例；核实产品业务改价与试算取值 DEC19。',4:'输入该产品实际覆盖范围所需参数及报价时间，执行计算，对比费用、汇率、燃油和总成本。',5:'只输出公司最终成本，不展示销售价／市场价／成交价／毛利；结果可追溯实际价卡及规则版本。不能只凭计算成功提示判通过。',6:'REQ §6.4 计算模拟：页面定位／计算逻辑／结果；金额核算基准由本批确认'});
reviseSmoke('SM27',{6:'REQ §6.1 仅列 AI 建档需求点；REVIEW 第16项为待确认承载建议；字段、文件限制和失败处理见 DEC17，不能套用规范示例10MB'});
reviseSmoke('SM28',{3:'按实际模块准备测试记录；服务组合表头全选当前页，翻页／改筛选清空不可见勾选；产品批量须同状态；服务单元下单规则明确支持跨页。',4:'分别在交付模块勾选、翻页、改筛选和执行已交付的批量操作，核对对象与返回结果。',5:'按模块规则验收，不能统一套成“全站跨页保留”或“全站清空”；未定义模块在 DEC08 确认。',6:'REQ §6.2 服务单元表单／服务组合批量；§6.4 产品库；REVIEW 第13项只约束批量栏位置'});
const addSmoke=(id,module,check,data,action,expected,source)=>smokeCases.push([id,module,check,data,action,expected,source,'待选择','是']);
addSmoke('SM29','服务单元','必填、只读编码与抛比换算','准备启用供应商和三个文本段名称；抛比6000；多范围编码及小数展示按 DEC15。','缺项保存，再完整保存并编辑读回；尝试修改编码；核对 KG/CBM。','名称、覆盖范围、供应商、抛比必填；编码由系统生成且不可改；KG/CBM=1,000,000÷抛比；历史名称未改动时免新格式校验。','REQ §6.2 新增服务单元／保存校验；零值、取整和多范围前缀未定义');
addSmoke('SM30','服务单元','编辑已引用单元的业务影响','准备已发布产品引用的测试单元和历史订单快照。','修改单元实际配置并保存，查询已绑定产品及历史订单。','允许保存，无重新审批／发布弹窗；产品仍已发布；历史订单快照不变。当前配置版本及价卡同步边界按 DEC13。','REQ §6.2 编辑影响／版本的生成与使用；不是停用后继续可执行');
addSmoke('SM31','服务组合','创建、编辑与版本闭环','准备可用服务单元及可执行普通策略。','新建组合，再改优先级保存，查看历史版本；再无修改保存并启停。','至少1成员；新增默认启用、V1；配置改变生成V2并归档；无变化和单纯启停不增配置版本；已绑定产品读取当前配置；历史只读。','REQ §6.2 新增服务组合／版本的生成与使用');
addSmoke('SM32','服务组合','成员、角色、容量与重复校验','准备主用／后备成员、重复优先级、停用成员及已保存配置。','检查重复加入、嵌套组合、无成员、重复优先级、多主用；搜索再取消候选。','不嵌套、不重复编码；仅1主用，优先级全局不重复且为正整数；容量只读KG；搜索不丢已选；编辑保留停用成员并标识。供应商跨范围组合口径见 DEC14。','REQ §6.2 新增服务组合／容量与角色');
addSmoke('SM33','服务组合','停用、引用保护及批量结果','使用有引用及无引用测试组合，混合启停状态。','停用后发起新选路；对有引用组合尝试删除；执行混合状态批量启停／删除。','停用保留关系但不参加后续选路，不回退旧版；有产品／画布引用阻断删除；批量逐项跳过不符条件项并报成功、跳过数及原因。','REQ §6.2 服务组合列表／操作及批量；只对专用可清理数据执行删除');
addSmoke('SM34','选路策略','优先级选路与无可用成员','按 PRD Case P-01：A主用1、B后备2、C后备3；本批确认建议策略口径。','全可用、A不准入、A/B不准入、全不可用分别选路。','依次选择A、B、C；全部不可用返回各自原因，不伪造成功。该段标为建议规则，需 DEC14 批准。','REQ §6.2 策略配置／Case P-01；建议规则');
addSmoke('SM35','选路策略','容量使用实重和静态阈值','Case P-03：A500KG、B800KG；空容量和0容量成员；确认 DEC14。','实重600、800、801KG分别请求；再重复两笔600KG。','600／800可选B，801无可用；空容量不视为无限，0不承接正重量；不拆单、不加总容量、不扣累计量。','REQ §6.2 策略配置／Case P-03；建议规则');
addSmoke('SM36','选路策略','最低完整成本而非最低单价','Case P-04：10KG；A8元/KG+50固定费，B10元/KG无附加费。','比较两者；再让B无有效价卡并重算。','完整成本A130、B100，选B；B缺卡不能按0元胜出；只剩A可报价时选A，并固定比较使用的价卡／规则版本。','REQ §6.2 最低成本／Case P-04；同币种同口径');
addSmoke('SM37','选路策略','抛比匹配、同分和缺参数','Case P-02A：V110000cm³、W20KG；成员D5000、6000、5500；DR-01口径先确认。','计算R及差值，移除5500成员再检查同分；删除体积数据。','R5500；差值500／500／0选5500成员；同分按确认角色优先级；缺参数不能代0。该算法不是最低计费重或最低价。','REQ §6.2 抛比匹配／Case P-02A；仍有DR-01待确认标识，见 DEC14');
addSmoke('SM38','选路策略','最快预计完成时间','Case P-05相同时区、连续自然日；A过周一14点截单下次周二9点+1天，B周一15点+1.5天。','选择最快策略，比较完成时间；再移除服务安排或价卡时效。','选周三03点完成的B，非周三09点的A；缺必要时间／时效有原因；工作日、节假日和时区按 DEC14，不将1.5天视为默认值。','REQ §6.2 最快时效／Case P-05；取时效上限为建议');
addSmoke('SM39','成本价卡','唯一标识、绑定与只读字段','准备启用和停用服务单元、重复编码／同单元同名价卡。','创建并读回，尝试重复编码／重复绑定、修改创建后的编码和单元。','只绑定1个启用单元；编码唯一；同单元价卡名称不重复；创建后编码及绑定单元只读。服务单元自动生成价卡后的新增入口按 DEC13。','REQ §6.3 新增／编辑价卡基本信息及保存校验');
addSmoke('SM40','成本价卡','生效价卡编辑不覆盖旧快照','准备生效价卡V1及引用V1的历史订单。','编辑生成新版本，启用前后分别试算，再查看历史版本与订单。','未启用新版本不参与计算；启用后成为当前版、原版归档；历史订单继续用下单时版本和价格快照。','REQ §6.3 版本规则');
addSmoke('SM41','成本价卡','静态明细核心保存校验','准备零／负价格、重叠区间、首重缺续重、无明细、均摊方式。','逐个提交非法组，再提交不重叠且首续重成组的有效组。','价格和要素边界非负，终点大于起点；同费用、分区、条件区间不重叠；首续重成组；至少1有效明细；均摊要素条件必填，无均摊时整列隐藏。','REQ §6.3 价卡明细／保存校验；区间开闭端点见 DEC19');
addSmoke('SM42','成本价卡','动态调用分支承载与校验','本批交付动态价卡；供应商API配置和运行失败策略须先确认。','切换静态／动态，检查价格行与API区；提交没有价格行的动态卡。','动态卡隐藏明细、显示API配置与说明；静态“至少1明细”是否对动态例外，须按 DEC12 决策；缺定义时记依据待确认。','REQ §6.3 动态调用说明与统一保存校验存在分支缺口；不调用未授权供应商API');
addSmoke('SM43','Zone','地点引用、版本与启用命中','准备地点邮编、包含／排除国家、启用／待生效Zone。','创建、编辑、启停Zone并进入价卡范围选择；更新地点邮编读回。','编码、名称、方案、国家范围必填且编码／名称不重复；同国家不能同时包含排除；V1后递增；仅启用参与命中；邮编引用地点，不在Zone重复维护。','REQ §6.3 Zone维护');
addSmoke('SM44','燃油规则','两类基数、优先级与区间','运费100、可另计附加费20；运费比例10%、附加费5%；同对象全局／供应商／渠道规则。','核对10+1的燃油构成，再依次停用高层级规则；提交同基数同对象重叠生效期。','两类独立、互不覆盖；只对相应另计行收费；渠道>供应商>全局；同层按最新开始时间；同基数范围对象有效期不能重叠。','REQ §6.3 燃油计算及命中；100/20为根据文档公式设计的测试数据');
addSmoke('SM45','燃油规则','动态失败与删除状态保护','准备已有有效比例的动态规则和启用／停用规则。','模拟抓取失败，再尝试删除启用规则、停用并删除规则。','动态失败保留上一有效比例并提示人工；只有停用规则可删；停用、删除二次确认；历史快照保留；混合批量删除跳过非法项。','REQ §6.3 燃油状态／操作逻辑；失败可用受控桩，不擅自发外部调用');
addSmoke('SM46','产品编排','范围占位和画布双向同步','准备覆盖A/F的有效单元或组合及停用候选。','各范围选择1对象，移除画布节点，拖动排序；取消和确认清空。','每范围仅1占位；候选覆盖相应范围且非停用；选择和移除双向同步；顺序／数量正确；清空需确认，取消不清空。','REQ §6.4 编排阶段1／2；不把待生效候选一概排除');
addSmoke('SM47','产品编排','默认与非默认业务价卡','准备默认卡及两个非默认卡、过期与未过期卡。','切换页签编辑；新增、复制、恢复来源；尝试删默认／未过期／过期非默认卡。','默认全时生效不可删；新增带初始明细，复制名称附副本且清时间；非默认起止必填、结束晚于开始、同产品非默认卡不重叠；只删过期非默认且确认，删除回默认；逐卡校验定位失败卡。','REQ §6.4 产品业务成本价卡；默认卡与非默认覆盖例外须 DEC19 明确');
addSmoke('SM48','产品编排','产品业务改价与来源隔离','准备源单元价卡和已编排产品，记录来源原价。','编辑产品费用或矩阵价格、保存版本，读回源价卡并恢复来源。','矩阵和明细同步；改价仅随产品版本记录，不回写服务单元成本价卡，不生成销售价版本；恢复来源区分新增来源与复制来源。','REQ §6.4 费用明细／恢复来源；试算是否取产品改价存在表述缺口，见 DEC19');
addSmoke('SM49','产品库','编码、业务版本与历史只读','准备已发布产品V1及历史订单。','尝试改编码；实际改配置提交；无变化保存；再启停并查看历史。','编码创建后不可变；首次保存V1，已发布改配置提交先归档再V2；无变化及单纯状态变化不增业务版本；列表仅当前、历史只读、旧订单快照不变。','REQ §6.4 产品库／产品版本规则');
addSmoke('SM50','产品库','停用、同状态批量与删除边界','准备草稿、已发布和已停用产品；删除范围先确认 DEC16。','停用／恢复发布，尝试混状态批量，检查已发布删除入口。','已发布可停用、停用可恢复；已发布不直接删除；同批仅选同状态。草稿与已停用的最终删除条件按 DEC16，已划线的历史引用条款不能作验收依据。','REQ §6.4 产品库；“无计费历史引用时可删除”已划线删除');
addSmoke('SM51','计算模拟','实际覆盖范围生成必填参数','准备只覆盖D、只覆盖F及覆盖A/C的已发布产品。','分别切换产品，检查参数和缺项校验；尝试未发布／停用产品。','只生成实际覆盖卡；D机场必填，F邮编和DOC/WPX必填，A起点必填，C页数>0；不强制所有产品填终点；仅已发布未停用可选；无产品／范围不能算。','REQ §6.4 计算模拟／固定、动态字段及校验');
addSmoke('SM52','计算模拟','产品抛比与重量算例','测试数据：产品抛比6000，实重8KG，尺寸60×50×40cm，订单进位1KG；无其他费用。','比较体积重、原始计费重、订单计费重；再不填尺寸及输入负数。','体积重20KG，原始计费重20，按已确认1KG规则进位为20；用产品最终抛比；无尺寸体积重0按实重；重量>0，负尺寸／货值及非数拦截。','REQ §6.4 计算模拟／计算逻辑；6000及进位1为测试配置，不是默认值');
addSmoke('SM53','计算模拟','缺卡、拒收、转人工和无燃油','准备缺有效卡、拒收规则、转人工规则、无命中燃油的4组条件。','逐组执行试算，检查原因、警告与结果。','缺卡中止并指引补齐；拒收中止或明确拒单；转人工可出成本并警告，不创建工单；燃油未命中按0并提示，不阻断。','REQ §6.4 计算模拟／校验及计算逻辑；不能把全部警告都当失败');
addSmoke('SM54','服务组合','同时编辑的覆盖保护','两会话读取同一组合版本V1。','会话A保存V2后，会话B基于V1保存；重查当前及历史。','陈旧版本保存被阻断并提示重载；当前V2及输入保留；配置、历史、当前指针完整一致，不出现半保存。','REQ §6.2 保存逻辑6／补充实现约束；专项并发回归');
addSmoke('SM55','批量操作','导出真实文件及选中范围','确认交付模块导出字段、格式、权限和范围；用专用记录。','选择记录并导出，打开下载文件，核对行数、编码、中文内容及选择对象。','实际文件可打开且仅含约定范围；提示成功或原型演示不算通过；具体格式按 DEC08。','REQ §6.2 服务组合导出正文和评论；文件内容核对为测试建议');
addSmoke('SM56','产品库','列表最近价卡生效时间','按文档2026-10-09时点：默认空时间、单过期、单未来、过去+未来、两个未来。','核对列表列值，再前移报价时点重新读取。','默认独占显示—；有非默认时按最近适用例展示；过去+未来选最近未来，两个未来取最近；不可要求取已划线的产品基础时间字段。','REQ §6.4 产品库生效时间7个示例；具体等时边界见 DEC19');
addSmoke('SM57','业务字典','下单限制规则的两类结果','本批交付下单限制；准备拒收与转人工规则，并确认表达式。','新增规则并关联服务单元，进入编排聚合与试算核对。','规则可搜索多选；编排聚合只读，同名同表达式去重；拒收与转人工分别按 SM53 返回。表达式判定数据按本批批准。','REQ §6.5 下单限制；§6.2 服务单元；§6.4 编排及模拟');
addSmoke('SM58','地点与邮编','关键词即时查询与版本属性','准备地点中英文名、ID、代码及邮编，类型包含国家／省州／城市／区县／机场／港口／仓库。','输入关键词、不点按钮观察刷新；按国家和类型筛选；编辑邮编再读回版本。','输入即时刷新；默认全部类型／国家；邮编是地点属性，不新增邮编地点类型；版本与属性对应；按钮存在时语义按 DEC09。','REQ §6.5 地点与邮编；即时查询是正文要求，不能只按 Review 改成按钮触发');

// Second source audit: history is OMS-backed, and its phase is unresolved in the PRD.
reviseSmoke('SM26',{3:'仅本批明确交付计费历史且OMS接入／测试回传可用时纳入；准备原成本快照及当前有效规则，分期见DEC21。',4:'保持原订单重量、尺寸、件数、目的国家、邮编、货型和货值，重新计费；逐项改价卡／单价／燃油／分区／规则对比；再测试产品停用、卡失效或缺必要规则。',5:'读取当前有效版本，只生成成本差异及原因；原快照、结算状态和OMS历史成本不变。无效产品、价卡或必要规则时停止并说明原因；不得把试算记录当OMS订单历史。',6:'REQ §6.4 计费历史：重新计费与差异说明；§6.1 P0与§6.4可放P1冲突，见DEC21'});
reviseSmoke('SM30',{5:'允许保存，无重新审批／发布弹窗；产品仍已发布；真实配置变化生成新单元配置版本并更新当前指针，无变化／仅启停不增配置版本；不连带增加组合版本；历史订单快照不变。价卡同步边界按DEC13。'});
reviseSmoke('SM56',{3:'在可控测试“当前日期”2026-10-09，按正文7组：仅默认、单未来、单过去、默认+非默认、过去+未来、两未来、全部过去。',4:'逐组核对产品库列值；通过批准的测试时钟／日期依赖改变当前日期后复查，不修改订单报价时间或系统时钟。',5:'仅默认显示—；单非默认显示该卡时段；默认+非默认显示非默认；过去+未来取未来；两未来取最近未来；全过去取最近过去。以当前日期判断，不能拿试算报价时间驱动此列表。',6:'REQ §6.4 产品库生效时间7例；等时端点见DEC19；可控时钟为测试建议'});
addSmoke('SM59','计费历史','OMS历史列表、筛选与合计','本批明确交付历史且OMS测试回传可用，DEC21已决；准备至少2产品、多个订单及新旧价卡版本的已知快照。','查看默认排序、产品名称下拉和关键词；切换产品／订单号查询；核对当前查询结果合计，再修改当前价卡后重新查历史。','产品选项来自已有历史记录，默认全部；订单号／产品名模糊搜索；下单时间倒序且精确到秒。订单号、产品名、kg计费重、成本价、实际价卡编码·版本和待结算／已结算来自OMS／订单快照，非当前价卡；合计随查询重算。多币种合计见DEC21。','REQ §6.4 计费历史搜索／字段／展示逻辑；外部接入不自动视为本批范围，见DEC21');
addSmoke('SM60','计费历史','逐费用版本、快照与合计一致','仅本批历史交付；准备同订单不同明细来自不同卡／版本的已知OMS快照，DEC21已决。','打开详情，核对每笔费用来源和版本、明细合计；验证保存的原始请求、产品／单元／价卡版本、计费重规则、分区区间、方式要素和汇率版本；关闭后重新查。','每条明细独立保留实际价格版本，允许同订单多卡多版本；明细合计等于订单成本。完整历史快照不随现行配置改变；关闭只读弹窗不修改历史。页面未展示的快照通过批准的只读接口／数据证据验证。','REQ §6.4 计费历史详情／完成计费后快照；只读数据核查为测试方法，分期见DEC21');

reviewRows.find(r=>r[0]==='UI04')[7]='UI、产品';
reviewRows.find(r=>r[0]==='UI08')[7]='产品、开发';
reviewRows.find(r=>r[0]==='UI18')[7]='开发、产品';
reviewRows.find(r=>r[0]==='UI03')[6]='组合复用';
const money=specRows.find(r=>r[0]==='UI22');
money[4]='项目要求金额右对齐、两位小数；通用规范§9.2要求金额四位小数、千分位及货币符号。先以 DEC10 确认项目例外与展示口径，再验收；不自行定两位或四位。'; money[5]='REQ 七第7项已解决／§6.2最低成本；SPEC §5.8、§9.2 冲突，见 DEC10';
specRows.find(r=>r[0]==='UI23')[4]='初始化用Skeleton，局部刷新用区内Spin，按钮操作loading且禁用，上传／长任务展示进度。整页403/404/500与局部操作失败分别提供适用恢复入口；无结果和无数据按已确认空态区分。';
specRows.find(r=>r[0]==='UI23')[5]='SPEC §7.1—7.3 已核对；场景触发矩阵为测试建议';
specRows.find(r=>r[0]==='UI26')[4]='表格长文本单行省略且hover Tooltip显示完整；详情文字最多3行，超出折叠并可展开；容器可滚动，关键操作不遮挡。';
specRows.find(r=>r[0]==='UI26')[5]='SPEC §9.4；REVIEW 第10、18项；长内容数据为测试建议';
specRows.find(r=>r[0]==='UI19')[4]='Windows用Microsoft YaHei、macOS用PingFang SC；H1 20px/500/1.4、H2 16px/500/1.5、H3 14px/500/1.6、正文14px/400/1.6、辅助13px/400/1.5、标签12px/400/1.4（末项为行高倍数）；禁止600/700字重及超过H3的层级。';
specRows.find(r=>r[0]==='UI20')[4]='桌面行高48px；表头#F7F7F7、字重500；仅底部1px solid #EBEBEB。标识／名称／状态／目的地、时间和操作列左对齐；数字／金额／重量右对齐。默认白、hover #EBF3FD、勾选行#D1E4FB；固定区与主区一致。';
specRows.find(r=>r[0]==='UI20')[5]='SPEC §5.8基础规格／列对齐／行状态；金额位数仍见DEC10';
specRows.push(
 ['UI27','通用间距','间距Token与页面留白','测量图标文字、表单、模块及页面内边距，并记录CSS像素。','基础单位4px；Token4/8/16/24/32/48px；图标文字4px、页面内容及模块间距24px；组件专用值优先使用对应章节。','SPEC §3.3；项目例外须确认','否'],
 ['UI28','按钮','主次、危险和状态语义','检查一个区域内主按钮数量、颜色和提交中重复点击。','区域最多1主按钮；主色#046EFC、危险#E24B4A；表格行内文字按钮；实际交互状态沿用规范，提交中禁止重复触发。','SPEC §5.1.1／§7.1；业务成功须读回','否'],
 ['UI29','数据展示','缺失值与真实零值','分别展示无值、0、件数和重量字段。','无值用—，不能以0替代；真实0正常显示；金额口径见 DEC10，重量保留3位小数并带单位；件数整数与千分位。','SPEC §9.1—9.2；REQ §6.2 服务组合列表','否'],
 ['UI30','时间展示','日期、分钟与秒格式','检查列表和详情同一时间列，区分日期和需要秒的记录。','默认YYYY-MM-DD HH:mm；需秒用HH:mm:ss；日期YYYY-MM-DD；不使用斜线和12小时制；同列格式一致；时区由业务基线确认。','SPEC §9.3；时区不能凭截图猜测','否'],
 ['UI31','表单布局','字段上下排与宽度','在确认视口检查新增／编辑表单及双列表单。','字段名在上、输入框在下；表单区域最大720px；字段名到输入框8px，表单项24px；≥1440px双列内部仍上下排，列间24px，长字段可跨列。','SPEC §5.7；仅适用所选表单模板','否'],
 ['UI32','比对方法','可复现的UI证据','同URL、账号角色、数据、视口、缩放、字体和状态截图；记录规范／设计版本；必要时读取computed style。','证据能复现；动态时间等仅按批准遮罩；逐项量值和交互判定。未批准像素容差／截图差异阈值时，不自行以像素相似度作为提测门槛。','测试方法建议；规范无统一整页拟合百分比，见 DEC18','否'],
 ['UI33','页签Tabs','适用范围、结构与密度','仅页面采用Tabs时，核对同级视图、数量、页头／列表变体、hover与选中态；核对Review基础配置层级方案。','同一上下文单选，通常2—5项且最多7；非跨模块导航或多步流程；禁止同层Tabs嵌套。页头48px/14px500/间距24px，列表40px/14px400/间距16px；指示条2px无圆角#046EFC；hover只变文字。列表40px与触达≥44px的适配口径须DEC18确认后验收。','SPEC V1.2 §5.17；REVIEW第1项采纳见DEC01；密度与触达矛盾见DEC18','否'],
 ['UI34','页签Tabs','内容切换、键盘与响应式','点击、Tab进入、左右键及Home/End；缩窄已确认支持的视口，并观察加载中的选中状态和长标签。','单选状态、aria-selected与实际内容同步；role为tablist/tab/tabpanel；支持规定键盘操作。空间不足自动换行、组件无横向滚动，不整页刷新；加载保留当前Tab和骨架；999以上数量显示999+。触达高度和支持端按DEC18确认。','SPEC V1.2 §5.17交互／响应式／禁止项；采纳范围及触达见DEC18','否']
);
decisions[7][1]='未定义模块跨页选择及导出字段／格式；组合当前页、产品同状态、单元规则跨页已有正文要求';
decisions[8][1]='地点／Zone即时查询必须保留；如同时有查询按钮，明确按钮与重置语义';
decisions[8][2]='SM43、SM58、UI09';
decisions.push(
 ['DEC10','金额显示冲突：项目两位与规范V1.2四位；明确项目例外','UI22、UI29','待选择','产品、UI','待确认',''],
 ['DEC11','产品保存态：按钮描述待生效，列表已划线改为草稿；统一状态与接口含义','SM24、SM50','待选择','产品、开发','待确认',''],
 ['DEC12','动态价卡不预置价格行与统一至少1明细校验如何分支；API失败与重试口径','SM42','待选择','产品、开发','待确认',''],
 ['DEC13','单元自动生成价卡的初始内容、重复新增入口、修改同步与生效版归档边界','SM21、SM30、SM39、SM40','待选择','产品、开发','待确认',''],
 ['DEC14','选路建议规则、DR-01抛比、同分、时间日历与供应商跨范围组合约束','SM32、SM34—38','待选择','产品、算法','待确认',''],
 ['DEC15','单元多范围编码前缀、抛比零负边界及换算精度；接单时间正文日期与评论纯时间','SM29','待选择','产品','待确认',''],
 ['DEC16','已停用产品删除条件：历史引用条款已划线删除，不能继续照旧判定','SM50','待选择','产品','待确认',''],
 ['DEC17','AI本批交付字段、来源对照、材料格式大小、失败恢复与保存流程','SM27、UI16','待选择','产品、算法','待确认',''],
 ['DEC18','UI批准稿／规范版本、支持设备、量值容差及遮罩；Tabs列表40px与触达≥44px口径','UI19—34','待选择','UI、产品','待确认',''],
 ['DEC19','计费区间及生效时间端点、舍入／汇率精度；产品改价试算取值；默认卡与非默认卡覆盖例外','SM23、SM25、SM41、SM47、SM48、SM52、SM56','待选择','产品、开发','待确认',''],
 ['DEC20','本批交付清单逐项覆盖：新增／修改项、受影响链路、执行层次及未纳入理由；由B17签认','全部检查','待选择','开发、测试、产品','待确认',''],
 ['DEC21','计费历史分期：§6.1 P0与§6.4可放P1冲突；OMS接入／测试回传、快照样例及多币种合计口径','SM26、SM59、SM60','待选择','产品、开发、测试','待确认',''],
 ['DEC22','下单规则反馈：正文显示已选数量与Review删除Tag/数量汇总如何取舍；跨页选择与保存不丢失','UI03','待选择','产品、UI、开发','待确认','']
);
const regressionIds=new Set(['SM08','SM13','SM16','SM17','SM19','SM20','SM28','SM29','SM32','SM34','SM35','SM36','SM37','SM38','SM41','SM42','SM43','SM44','SM45','SM47','SM48','SM49','SM50','SM54','SM55','SM56','SM57','SM58','SM60']);
const recommendationIds=new Set(['SM02','SM05','SM06','SM07','SM08','SM13','SM16','SM17','SM28','SM55']);
function col(n) { let s=''; while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);} return s; }
function baseStyle(sheet, endRow, endCol) {
  sheet.showGridLines=false;
  sheet.getRange(`A1:${col(endCol)}${endRow}`).format.font={name:font,size:10,color:ink};
  sheet.getRange(`A1:${col(endCol)}${endRow}`).format.verticalAlignment='center';
  sheet.getRange(`A1:${col(endCol)}${endRow}`).format.rowHeightPx=28;
  sheet.getRange('A2').format.font={name:font,size:15,bold:true,color:navy};
  sheet.getRange(`A3:${col(endCol)}3`).format.borders={bottom:{style:'thin',color:'#CBD5E1'}};
}
function styleHeader(sheet, row, endCol) {
  const range=sheet.getRange(`A${row}:${col(endCol)}${row}`);
  range.format.fill=navy;
  range.format.font={name:font,size:10,bold:true,color:'#FFFFFF'};
  range.format.horizontalAlignment='center';
  range.format.verticalAlignment='center';
  range.format.wrapText=true;
  range.format.rowHeightPx=38;
}
const headers=['编号','模块／页面','检查点','本批适用','关键项','本批依据确认','测试结果','执行版本','本批有效结果','步骤与测试数据','预期结果','来源与适用说明','实际结果／证据','缺陷／未纳入原因','执行人'];
const resultValues=['未执行','通过','失败','受阻','依据待确认'];
function linkedIds(text){
  const ids=[];
  for(const m of text.matchAll(/(SM|UI)(\d+)(?:[—–-](?:SM|UI)?(\d+))?/g)){
    for(let n=Number(m[2]);n<=Number(m[3]??m[2]);n++) ids.push(`${m[1]}${String(n).padStart(2,'0')}`);
  }
  return ids;
}
const decisionLinks=decisions.map(d=>({id:d[0],checks:linkedIds(d[2])}));
const layoutPostponements=new Set(['DEC01','DEC02','DEC03']);
function decisionCount(id,status){return `COUNTIFS('本批提测'!$A$40:$A$61,"${id}",'本批提测'!$H$40:$H$61,"${status}")`;}
function effectiveFormula(r,isUi) {
  const mapping=isUi?'U':'Q', executionBasis=isUi?'V':'R';
  const id=(isUi?uiRows:smokeRows)[r-6].id;
  const related=decisionLinks.filter(d=>d.checks.includes(id));
  const unresolved=related.map(d=>`(${decisionCount(d.id,'已确认')}+${decisionCount(d.id,'已记录后置')}=0)`);
  const pending=unresolved.length?`OR(F${r}<>"已确认",${unresolved.join(',')})`:`F${r}<>"已确认"`;
  return `=IF(D${r}="否","不适用",IF(D${r}<>"是","未纳入本批",IF('本批提测'!$B$8="","版本待填写",IF(OR(H${r}<>'本批提测'!$B$8,G${r}="",G${r}="未执行"),"未执行",IF(${executionBasis}${r}<>'本批提测'!$B$18,"基线已变，需复测",IF(${mapping}${r}="","交付未映射",IF(${pending},"依据待确认",IF(AND(OR(G${r}="通过",G${r}="失败"),LEN(TRIM(M${r}))=0),"缺少证据",IF(AND(OR(G${r}="通过",G${r}="失败"),LEN(TRIM(O${r}))=0),"缺少执行人",IF(OR(G${r}="通过",G${r}="失败",G${r}="受阻",G${r}="依据待确认"),G${r},"结果待填写"))))))))))`;
}
function setupCases(sheet, rows, title, isUi=false) {
  const extra=['测试层次','交付项ID／影响点','执行基线ID','依据类型'];
  const allHeaders=isUi?[...headers,'原型评审优先级','原型确认状态','框架适配判断','原处理角色',...extra,'原Review类型','原型问题摘录','原Review建议摘录','原后续处理建议','飞书记录ID','本轮用例修正说明']:[...headers,...extra];
  const last=5+rows.length;
  baseStyle(sheet,last,allHeaders.length);
  sheet.getRange('A2').values=[[title]];
  sheet.getRange('A4').values=[['按交付清单将执行项设为“是”并填写交付项ID；关联待决策事项自动纳入，未决不能计通过。须填写Build、执行基线ID、执行人和证据。']];
  sheet.getRange('A4').format.font={name:font,size:10,color:muted,italic:true};
  sheet.getRange(`A5:${col(allHeaders.length)}5`).values=[allHeaders];
  const grid=rows.map(r=>{const s=isUi?reviewSource.get(r.id):null;return [r.id,r.module,r.check,r.app,r.critical,'待确认','未执行','',null,r.steps,r.expected,r.source,'','','',...(isUi?[r.priority,r.originalState,r.adaptation,r.owner]:[]),r.stage,'','',r.basisType,...(isUi?[s?.types??null,s?.issue??null,s?.suggestion??null,s?.next??null,s?.recordId??null,s?detailRevisions[r.id].change:null]:[])];});
  sheet.getRange(`A6:${col(allHeaders.length)}${last}`).values=grid.map(row=>row.map(v=>v===''?null:v));
  sheet.getRange(`I6:I${last}`).formulas=rows.map((r,i)=>[effectiveFormula(i+6,isUi)]);
  const existing=sheet.tables.items.find(t=>t.name===(isUi?'UiCases':'SmokeCases'));
  const tableStyle=existing.style; existing.delete();
  const table=sheet.tables.add(`A5:${col(allHeaders.length)}${last}`,true,isUi?'UiCases':'SmokeCases'); table.style=tableStyle;table.showFilterButton=true;
  styleHeader(sheet,5,allHeaders.length);
  const widths=[80,130,215,90,75,100,90,150,170,370,440,270,290,230,100,...(isUi?[120,115,135,130]:[]),115,200,280,190,...(isUi?[190,380,480,260,200,360]:[])];
  widths.slice(0,allHeaders.length).forEach((w,i)=>sheet.getRange(`${col(i+1)}1:${col(i+1)}${last}`).format.columnWidthPx=w);
  sheet.getRange(`A6:${col(allHeaders.length)}${last}`).format.wrapText=true;
  sheet.getRange(`D6:H${last}`).format.fill=amber;
  sheet.getRange(`M6:O${last}`).format.fill=amber;
  const mapCol=isUi?'U':'Q',basisCol=isUi?'V':'R';
  sheet.getRange(`${mapCol}6:${basisCol}${last}`).format.fill=amber;
  sheet.getRange(`D6:I${last}`).format.horizontalAlignment='center';
  if(isUi){sheet.getRange(`P6:S${last}`).format.font={name:font,size:10,color:muted};}
  if(isUi){sheet.getRange(`X6:AC${last}`).format.font={name:font,size:10,color:muted};}
  for(let i=0;i<grid.length;i++){
    const longCells=[2,9,10,11,12,13,...(isUi?[23,24,25,26,28]:[])];
    const lines=Math.max(...longCells.map(c=>String(grid[i][c]??'').split('\n').reduce((n,l)=>n+Math.max(1,Math.ceil(l.length*12/(widths[c]-18))),0)));
    sheet.getRange(`A${i+6}:${col(allHeaders.length)}${i+6}`).format.rowHeightPx=Math.max(84,lines*19+18);
  }
  sheet.freezePanes.freezeRows(5);
  sheet.freezePanes.freezeColumns(3);
  sheet.getRange(`D6:D${last}`).dataValidation={rule:{type:'list',values:['待选择','是','否']}};
  sheet.getRange(`E6:E${last}`).dataValidation={rule:{type:'list',values:['是','否']}};
  sheet.getRange(`F6:F${last}`).dataValidation={rule:{type:'list',values:['待确认','已确认']}};
  sheet.getRange(`G6:G${last}`).dataValidation={rule:{type:'list',values:resultValues}};
  for(const letter of ['G','I']){
    const range=sheet.getRange(`${letter}6:${letter}${last}`);
    range.conditionalFormats.deleteAll();
    range.conditionalFormats.add('containsText',{text:'失败',format:{fill:'#FDE7E9',font:{color:'#A3212E',bold:true}}});
    range.conditionalFormats.add('containsText',{text:'受阻',format:{fill:'#FFF4CE',font:{color:'#8B5B00'}}});
    range.conditionalFormats.add('containsText',{text:'待确认',format:{fill:'#FFF4CE',font:{color:'#8B5B00'}}});
  }
  return {last,rows};
}
const smokeRows=smokeCases.map(([id,module,check,data,action,expected,source,app,critical])=>({id,module,check,steps:`前置：${data}\n操作：${action}`,expected,source,app,critical,stage:regressionIds.has(id)?'专项回归':'冒烟',basisType:recommendationIds.has(id)?'测试建议／条件需求':(/DEC|待确认|建议规则/.test([source,expected,data].join(' '))?'正文＋待决策':'需求正文')}));
const uiRows=[...reviewRows.map(([id,module,check,steps,expected,priority,adaptation,owner,critical,source])=>({id,module,check,steps,expected,priority,adaptation,owner,critical,source:`REVIEW ${source}`,app:'待选择',originalState:reviewSource.get(id).state,stage:'UI核对',basisType:'未批准Review建议'})),...specRows.map(([id,module,check,steps,expected,source,critical])=>({id,module,check,steps,expected,source,critical,app:'待选择',priority:'不适用',originalState:'不适用',adaptation:'规范／检查建议',owner:'按本批分工',stage:'UI核对',basisType:id==='UI22'?'正文与规范冲突':id==='UI32'?'测试方法建议':'规范正文／适用条件'}))];
for (const r of uiRows) if(['UI01','UI02','UI04','UI12','UI13','UI16','UI18','UI21','UI24'].includes(r.id)) r.critical='否';
for(const [sheet,rows] of [[smoke,smokeRows],[ui,uiRows]]){
  const expected=new Map(rows.map(r=>[r.id,r.critical]));
  for(const r of sheet.getRange('A6:E150').values) if(r[0]) assert.equal(r[4],expected.get(r[0]), 'Preserve user-adjusted criticality');
}
const smokeInfo=setupCases(smoke,smokeRows,'SN318 分批冒烟用例');
const uiInfo=setupCases(ui,uiRows,'SN318 UI 检查与原型 Review 对照',true);
smoke.tabColor='#385E91'; ui.tabColor='#6B7280'; batch.tabColor=navy;

batch.tables.items.find(t=>t.name==='BaselineDecisions').delete();
batch.getRange('A38:H84').clear({applyTo:'all'});
baseStyle(batch,84,8);
const batchWidths=[155,420,130,100,195,280,320,320];
batchWidths.forEach((w,i)=>batch.getRange(`${col(i+1)}1:${col(i+1)}84`).format.columnWidthPx=w);
batch.getRange('A2').values=[['SN318 分批提测检查表']];
batch.getRange('A4').values=[['当前检查提示']];
batch.getRange('A4').format.font={name:font,size:10,bold:true,color:navy};
batch.getRange('B4').format.wrapText=true;
batch.getRange('B4').format.rowHeightPx=50;
batch.getRange('B4').format.font={name:font,size:11,bold:true,color:navy};
const metadata=[
  ['批次名称',''],
  ['开发版本／Build',''],
  ['本次交付清单',''],
  ['需求基线／决策版本',''],
  ['UI 基线／采纳项版本',''],
  ['范围与基线确认','待确认'],
  ['浏览器与缩放','Edge 或 Chrome；缩放 100%'],
  ['视口／支持设备','按本批确认范围填写'],
  ['测试账号别名',''],
  ['执行日期',null],
];
batch.getRange('A7:B16').values=metadata;
batch.getRange('B7:B16').format.fill=amber;
batch.getRange('B7:B16').format.wrapText=true;
batch.getRange('A7:A16').format.font={name:font,size:10,bold:true,color:ink};
batch.getRange('A9:B11').format.rowHeightPx=44;
batch.getRange('B12').dataValidation={rule:{type:'list',values:['待确认','已确认']}};
batch.getRange('B16').setNumberFormat('yyyy-mm-dd');
batch.getRange('A17:B17').values=[['交付清单覆盖核对','待确认']];
batch.getRange('B17').dataValidation={rule:{type:'list',values:['待确认','已核对']}};
batch.getRange('B17').format.fill=amber;
batch.getRange('A18').values=[['本批验收基线ID']];
batch.getRange('B18').formulas=[['=IF(OR(B10="",B11=""),"待填写需求及UI基线",B10&" | "&B11)']];
batch.getRange('B18').format.wrapText=true; batch.getRange('A18:B18').format.rowHeightPx=46;
const instructions=[
  ['填写顺序','先把交付项对应到本批“是”的用例及影响链路，填写交付项ID；核对覆盖后执行。库内其余待选择不阻塞本批。'],
  ['数据与账号','使用账号别名，不填密码或 Token。新增、编辑和删除使用专用测试数据。'],
  ['跨批使用','每批复制文件。Build或验收基线ID变化后，旧结果自动失效；复测完成后更新执行版本与执行基线。'],
  ['记录方式','结果、Build、执行基线ID、执行人、证据一起填写；未确认依据不能计通过。关联决策自动纳入，须附确认方案证据。'],
  ['关键项','预置关键项为建议分类，可按影响调整；原型 P0/P1/P2 独立保留，不直接作为缺陷等级。'],
  ['未纳入项','库内未涉及保持待选择；交付项明确延期或不适用设否并注明原因。不能通过不选择用例掩盖交付项漏测。'],
  ['结论要求','自动提示只汇总记录。最终提测结论由团队评审；一般差异带项提测需记录接受意见和修复安排。'],
  ['环境观察','资料读取时，当前会话访问航司页跳回登录；未执行该环境的业务和 UI 测试。'],
];
batch.getRange('E7:F14').values=instructions;
batch.getRange('E7:E14').format.font={name:font,size:10,bold:true,color:ink};
batch.getRange('F7:F14').format.wrapText=true;
batch.getRange('E7:F14').format.rowHeightPx=64;
batch.getRange('E16').values=[['模板生成日期']];
batch.getRange('F16').values=[[new Date('2026-10-10T00:00:00Z')]];
batch.getRange('F16').setNumberFormat('yyyy-mm-dd');
batch.getRange('E16:F16').format.font={name:font,size:10,color:muted};
batch.getRange('G7:H14').values=[
 ['本批执行方式','开发按交付清单自查，测试复核核心闭环；UI复核采用的规范和专项稿。用例库不等于本批必测全集。'],
 ['冒烟最小集合','每个交付模块：入口与权限、1条有效主链路、1条关键失败／状态保护、保存后读回；受影响上下游补1条联动。'],
 ['专项回归','必填边界、区间、版本、算法、并发、导出等按本批改动风险选取。与冒烟单独统计，选入计划后需执行。'],
 ['UI判定依据','功能看有效需求正文；视觉看本批批准规范／设计稿；Review2项修改中、16项待确认，采纳后才成为本批预期。'],
 ['UI符合率','仅统计本批已确认检查点通过率。它不代表全页像素相似度；未执行、待确认和延期需同时披露。'],
 ['差异记录','记录URL、Build、基线、角色、视口／缩放、状态、截图、应有／实有及影响；规范条款与产品决策分别引用。'],
 ['带项规则','普通视觉差异可记录负责人、期限和接受意见后评审。关键操作不可达、错价／数据损坏及核心规则未定建议退回。'],
 ['基线签名','将B18的完整验收基线ID填入执行基线列。版本名称应含日期或版本号，避免同名修改导致旧证据仍被接受。']
];
batch.getRange('G7:G14').format.font={name:font,size:10,bold:true,color:ink};
batch.getRange('H7:H14').format.wrapText=true;

const metrics=[
  ['适用检查数','total'],['其中关键项','critical'],['当前版本通过','pass'],['当前版本失败','fail'],['未完成／受阻','open'],['依据待确认','basis'],['范围待选择','scope'],['关键失败','criticalFail'],['关键未完成','criticalOpen'],['已确认项通过率','rate']
];
batch.getRange('A19:B19').values=[['冒烟统计','当前记录']];
batch.getRange('E19:F19').values=[['UI 统计','当前记录']];
for(const range of ['A19:B19','E19:F19']){batch.getRange(range).format.fill=navy;batch.getRange(range).format.font={name:font,size:10,bold:true,color:'#FFFFFF'};}
function count(sheetName,last,...criteria){return `COUNTIFS(${criteria.flatMap(([c,v])=>[`'${sheetName}'!$${c}$6:$${c}$${last}`,`"${v}"`]).join(',')})`;}
function formulasFor(sheetName,last,stage=null){
  const applicable=[['D','是'],...(stage?[['P',stage]]:[])];
  const total=count(sheetName,last,...applicable);
  const pass=count(sheetName,last,...applicable,['I','通过']);
  const confirmed=count(sheetName,last,...applicable,['F','已确认']);
  return {
    total:`=${total}`,critical:`=${count(sheetName,last,...applicable,['E','是'])}`,
    pass:`=${pass}`,fail:`=${count(sheetName,last,...applicable,['I','失败'])}`,
    open:`=${total}-${pass}-${count(sheetName,last,...applicable,['I','失败'])}`,
    basis:`=${total}-${confirmed}+${count(sheetName,last,...applicable,['F','已确认'],['I','依据待确认'])}`,
    scope:`=${count(sheetName,last,['D','待选择'],...(stage?[['P',stage]]:[]))}`,
    criticalFail:`=${count(sheetName,last,...applicable,['E','是'],['I','失败'])}`,
    criticalOpen:`=${count(sheetName,last,...applicable,['E','是'])}-${count(sheetName,last,...applicable,['E','是'],['I','通过'])}-${count(sheetName,last,...applicable,['E','是'],['I','失败'])}`,
    rate:`=IF(${confirmed}=0,"无已确认项",${count(sheetName,last,...applicable,['F','已确认'],['I','通过'])}/${confirmed})`,
  };
}
const sf=formulasFor(smoke.name,smokeInfo.last,'冒烟'),uf=formulasFor(ui.name,uiInfo.last),rf=formulasFor(smoke.name,smokeInfo.last,'专项回归');
batch.getRange('G19:H19').values=[['专项回归统计','当前记录']];
batch.getRange('G19:H19').format.fill=navy; batch.getRange('G19:H19').format.font={name:font,size:10,bold:true,color:'#FFFFFF'};
metrics.forEach(([label,key],i)=>{
  const r=20+i;
  const revisedLabel=key==='scope'?'库内待筛选（提示）':label;
  batch.getRange(`A${r}`).values=[[revisedLabel]]; batch.getRange(`B${r}`).formulas=[[sf[key]]];
  batch.getRange(`E${r}`).values=[[revisedLabel]]; batch.getRange(`F${r}`).formulas=[[uf[key]]];
  batch.getRange(`G${r}`).values=[[revisedLabel]]; batch.getRange(`H${r}`).formulas=[[rf[key]]];
});
batch.getRange('B20:B28').setNumberFormat('#,##0'); batch.getRange('F20:F28').setNumberFormat('#,##0');
batch.getRange('B29').setNumberFormat('0.0%'); batch.getRange('F29').setNumberFormat('0.0%');
batch.getRange('B20:B29').format.horizontalAlignment='right'; batch.getRange('F20:F29').format.horizontalAlignment='right';
batch.getRange('H20:H28').setNumberFormat('#,##0');batch.getRange('H29').setNumberFormat('0.0%');batch.getRange('H20:H29').format.horizontalAlignment='right';
// Pending basis and pending execution are independent measures and must not be added as a unique-record count.
batch.getRange('A30').values=[['统计口径']];
batch.getRange('B30').values=[['仅“是”进入计划；冒烟／回归分开。通过须依据确认、交付映射、Build与基线ID一致、有证据和执行人。库内待筛选仅提示；覆盖由B17签认。']];
batch.getRange('B30').format.wrapText=true; batch.getRange('A30:B30').format.rowHeightPx=60;
batch.getRange('E30').values=[['涉及且未决事项']];
batch.getRange('F30').formulas=[['=COUNTIFS($H$40:$H$61,"待确认")+COUNTIFS($H$40:$H$61,"范围矛盾")+COUNTIFS($H$40:$H$61,"核心依据不可后置")']];
batch.getRange('E31').values=[['事项范围待选择']];
batch.getRange('F31').formulas=[['=COUNTIFS($H$40:$H$61,"库内待选择")']];
batch.getRange('E31').values=[['库内事项待筛选（提示）']];
batch.getRange('G30').values=[['纳入项交付映射缺失']];
batch.getRange('H30').formulas=[[`=COUNTIFS('冒烟用例'!$D$6:$D$${smokeInfo.last},"是")-COUNTIFS('冒烟用例'!$D$6:$D$${smokeInfo.last},"是",'冒烟用例'!$Q$6:$Q$${smokeInfo.last},"<>")+COUNTIFS('UI检查'!$D$6:$D$${uiInfo.last},"是")-COUNTIFS('UI检查'!$D$6:$D$${uiInfo.last},"是",'UI检查'!$U$6:$U$${uiInfo.last},"<>")`]];
batch.getRange('G31').values=[['涉及事项已记录后置']];
batch.getRange('H31').formulas=[['=COUNTIFS($H$40:$H$61,"已记录后置")']];

batch.getRange('A33:B36').values=[['人工提测结论','待评审'],['评审人',''],['带项意见／修复安排',''],['评审证据链接','']];
batch.getRange('B33:B36').format.fill=amber;
batch.getRange('B33').dataValidation={rule:{type:'list',values:['待评审','退回整改','同意提测','允许带项提测']}};
batch.getRange('B35:B36').format.wrapText=true; batch.getRange('A35:B36').format.rowHeightPx=60;
batch.getRange('E33').values=[['建议退回的情况']];
batch.getRange('F33').values=[['关键项失败、关键操作受阻或核心依据未确定。一般视觉差异可由团队评审是否带项提测。']];
batch.getRange('F33').format.wrapText=true;batch.getRange('E33:F33').format.rowHeightPx=85;
batch.getRange('E35').values=[['评审记录检查']];
batch.getRange('F35').formulas=[['=IF(B33="待评审","待人工评审",IF(OR(B34="",B36=""),"请补齐评审人与证据",IF(B33="退回整改","已记录退回整改",IF(B33="同意提测",IF(B4="本批检查已完成，待人工评审","已记录同意提测","检查前提未满足，不能标记同意"),IF(B33="允许带项提测",IF(AND(OR(B4="本批检查已完成，待人工评审",B4="存在一般失败或后置项，需评审带项意见"),B35<>""),"已记录带项提测","需满足检查前提并补齐带项意见"),"请填写有效评审结论")))))']];
batch.getRange('F35').format.wrapText=true;

batch.getRange('A38').values=[['本批验收待确认事项']];
batch.getRange('A38').format.font={name:font,size:11,bold:true,color:navy};
batch.getRange('A39:H39').values=[['编号','需要明确的事项','关联检查','本批涉及','建议负责角色','确认状态','确认方案／版本／证据','本批有效决策']];
batch.getRange('A40:G61').values=decisions.map(row=>row.map(v=>v===''?null:v));
for(let i=0;i<decisions.length;i++){
  const r=40+i,d=decisions[i],links=decisionLinks[i].checks;
  const linked=links.map(id=>`COUNTIFS('${id.startsWith('UI')?'UI检查':'冒烟用例'}'!$A$6:$A$${id.startsWith('UI')?uiInfo.last:smokeInfo.last},"${id}",'${id.startsWith('UI')?'UI检查':'冒烟用例'}'!$D$6:$D$${id.startsWith('UI')?uiInfo.last:smokeInfo.last},"是")`).join('+')||'0';
  const adopted=`IF(AND(F${r}="已确认",LEN(TRIM(G${r}))>0),"已确认",IF(AND(F${r}="已记录后置",LEN(TRIM(G${r}))>0),"${layoutPostponements.has(d[0])?'已记录后置':'核心依据不可后置'}","待确认"))`;
  batch.getRange(`H${r}`).formulas=[[d[0]==='DEC20'?`=IF(AND($B$17="已核对",LEN(TRIM($B$9))>0),"已确认",IF($B$20+$F$20+$H$20>0,"待确认","库内待选择"))`:`=IF(AND((${linked})>0,D${r}="否"),"范围矛盾",IF(OR(D${r}="是",(${linked})>0),${adopted},IF(D${r}="否","不涉及","库内待选择")))`]];
}
batch.tables.add('A39:H61',true,'BaselineDecisions').showFilterButton=true;styleHeader(batch,39,8);
batch.getRange('A40:H61').format.wrapText=true;batch.getRange('A40:H61').format.rowHeightPx=110;
batch.getRange('C40:C61').format.font={name:font,size:9,color:muted};
batch.getRange('D40:D61').dataValidation={rule:{type:'list',values:['待选择','是','否']}};
batch.getRange('F40:F61').dataValidation={rule:{type:'list',values:['待确认','已确认','已记录后置']}};
batch.getRange('D40:D61').format.fill=amber;batch.getRange('F40:G61').format.fill=amber;
batch.getRange('A64').values=[['参考资料与读取快照']];batch.getRange('A64').format.font={name:font,size:11,bold:true,color:navy};
batch.getRange('A65').values=[['来源 ID']];batch.getRange('B65').values=[['资料／观察范围']];batch.getRange('G65').values=[['来源链接']];
const sources=[
  ['REQ','V1.0评审稿；2026-10-10再次读取§6.1／§6.4完整计费历史／§6.5配置。历史P0/P1分期冲突见DEC21。此前核对§6.2—6.4其他正文及删除线。','https://example.invalid/source/662ffe8557'],
  ['REVIEW','2026-10-10逐条打开18个唯一记录详情，核对问题/建议/后续处理、类型、优先级、适配、角色及状态。原始文字摘录和稳定记录ID见UI检查X:AC；2修改中、16待确认，采纳须单独确认。','https://example.invalid/source/e04459bb0b'],
  ['SPEC','V1.2（2026-10-09更新）；本轮再读§5.8对齐／行状态与§5.17 Tabs；列表40px与触达≥44px适配口径待确认。此前核对字体等基础规范。','https://example.invalid/source/05cc32fecc'],
  ['TEST','航司字典页；当前会话跳回登录，尚未验证业务实现','https://localhost/pcs/system-config/master-data?group=dictionary&resource=airline'],
];
sources.forEach(([id,title,url],i)=>{
  const r=66+i;batch.getRange(`A${r}`).values=[[id]];batch.getRange(`B${r}`).values=[[title]];batch.getRange(`G${r}`).values=[[url]];
  batch.getRange(`A${r}:G${r}`).format.rowHeightPx=72;batch.getRange(`B${r}`).format.wrapText=true;batch.getRange(`G${r}`).format.wrapText=true;
});
batch.getRange('A71').values=[['使用约定']];
batch.getRange('B71').values=[['所有用例未执行；该环境会话此前回到登录。写入、删除仅用专用测试数据；外部调用按本批授权执行。功能冒烟、UI核对均不是上线验收。']];
batch.getRange('B71').format.wrapText=true;batch.getRange('A71:B71').format.rowHeightPx=85;
batch.getRange('A73').values=[['原型 Review 快照']];
batch.getRange('B73').values=[['18条详情本轮逐字段复核：P0 6、P1 7、P2 5；2修改中、16待确认。适配：直接复用13、组合复用1、调整后复用1、无法覆盖2、业务交互/信息待明确1。以记录ID追溯，不依赖分组后的行号。来源状态不等于本批采纳。']];
batch.getRange('B73').format.wrapText=true;batch.getRange('A73:B73').format.rowHeightPx=105;
batch.getRange('A75').values=[['本次用例修订']];
batch.getRange('B75').values=[['18条Review逐项改写步骤与预期；补查询5点、分页配置条件、固定字段/普通字段滚动、多选到清空恢复、导航/文案限定、独立AI流程及Drawer连续查看。UI检查X:AC保留来源摘录和修正说明；不把建议升为未批准硬要求。']];
batch.getRange('B75').format.wrapText=true;batch.getRange('A75:B75').format.rowHeightPx=120;
batch.getRange('A77').values=[['重点冲突']];
batch.getRange('B77').values=[['DEC10金额两位/四位；DEC11保存态；DEC12动态卡校验；DEC19试算来源及精度；DEC21历史分期；新增DEC22下单规则数量提示与Review删除汇总的冲突。保持待决，不能宣称已验证落地。']];
batch.getRange('B77').format.wrapText=true;batch.getRange('A77:B77').format.rowHeightPx=105;
batch.getRange('A79').values=[['决策联动规则']];
batch.getRange('B79').values=[['关联用例设为是后，决策自动纳入；手填否会显示范围矛盾。确认须有采用方案、日期／版本和证据，空白字符不算证据。仅DEC01/02/03的承载布局方案可记录后置，并需负责人、日期、影响、接受证据及本批可测的现行方案；核心规则不能用后置代替确认。DEC20由交付清单及B17签认。此逻辑为测试流程建议，最终仍由团队评审。']];
batch.getRange('B79').format.wrapText=true;batch.getRange('A79:B79').format.rowHeightPx=170;

batch.getRange('B4').formulas=[[
  '=IF(OR(B7="",B8="",B9="",B10="",B11="",B15="",B16="",B12<>"已确认",B17<>"已核对"),"请补齐本批信息并核对交付覆盖与基线",IF(H30>0,"请填写纳入项的交付映射",IF(B20+F20+H20=0,"本批没有适用检查项",IF(B25+F25+H25+F30>0,"请明确适用项的验收依据",IF(B27+F27+H27>0,"关键项失败，建议退回整改",IF(B24+F24+H24>0,"存在未完成或受阻检查",IF(B23+F23+H23+H31>0,"存在一般失败或后置项，需评审带项意见","本批检查已完成，待人工评审")))))))'
]];

function value(sheet,address){return sheet.getRange(address).values[0][0];}
const assertions=[];
function equal(sheet,address,expected,label){assert.equal(value(sheet,address),expected,label);assertions.push({label,actual:value(sheet,address)});}
// Exercise the workflow in-place, restore every edit before export.
const originalMeta=batch.getRange('B7:B17').values;
const originalDecisions=batch.getRange('D40:G61').values;
const originalSmoke=smoke.getRange(`D6:H${smokeInfo.last}`).values;
const originalUi=ui.getRange(`D6:H${uiInfo.last}`).values;
const originalSmokeEvidence=smoke.getRange(`M6:R${smokeInfo.last}`).values;
const originalUiEvidence=ui.getRange(`M6:V${uiInfo.last}`).values;
const originalReview=batch.getRange('B33:B36').values;
equal(batch,'B4','请补齐本批信息并核对交付覆盖与基线','Missing batch inputs cannot imply readiness');
equal(batch,'B20',5,'Five common smoke cases are selected');
equal(batch,'B22',0,'No environment tests are pre-marked passed');
equal(batch,'F22',0,'No UI tests are pre-marked passed');
batch.getRange('B7:B12').values=[['fixture-batch'],['build-fixture-1'],['共通检查'],['REQ-fixture'],['UI-fixture'],['已确认']];
batch.getRange('B15').values=[['fixture-account']];
batch.getRange('B16').values=[[new Date('2026-10-10T00:00:00Z')]];
batch.getRange('B17').values=[['已核对']];
equal(batch,'B4','请填写纳入项的交付映射','Selected checks require delivery mapping');
smoke.getRange('Q6:Q10').values=[['fixture-delivery']];
smoke.getRange('F6:F10').values=[['已确认']];smoke.getRange('G6:G10').values=[['通过']];smoke.getRange('H6:H10').values=[['old-build']];
smoke.getRange('M6:M10').values=[['synthetic fixture evidence']];
smoke.getRange('O6:O10').values=[['fixture-tester']];
smoke.getRange('R6:R10').values=[[value(batch,'B18')]];
equal(batch,'B22',0,'Old-build passes do not count');
equal(batch,'B4','存在未完成或受阻检查','Stale passes remain incomplete');
smoke.getRange('H6:H10').values=[['build-fixture-1']];
equal(batch,'B22',5,'Matching-build passes count');
equal(batch,'B4','本批检查已完成，待人工评审','Completion still requires human review');
equal(batch,'B26',26,'Unselected smoke-library cases remain visible without blocking this batch');
equal(batch,'H26',29,'Unselected regression cases do not inflate smoke totals');
equal(batch,'F31',21,'Unselected design-decision library does not block the batch');
batch.getRange('B11').values=[['UI-fixture-v2']];
equal(batch,'B22',0,'Same-build passes become stale after UI baseline changes');
equal(smoke,'I6','基线已变，需复测','The row explains baseline invalidation');
smoke.getRange('R6:R10').values=[[value(batch,'B18')]];
smoke.getRange('F10').values=[['待确认']];
equal(batch,'B22',4,'Unconfirmed basis cannot count as a pass');
equal(batch,'B4','请明确适用项的验收依据','Pending acceptance basis stays visible');
smoke.getRange('F10').values=[['已确认']];
smoke.getRange('M10').values=[['']];
equal(batch,'B4','存在未完成或受阻检查','A passing result without evidence stays incomplete');
smoke.getRange('M10').values=[['synthetic fixture evidence']];
smoke.getRange('O10').values=[['']];
equal(smoke,'I10','缺少执行人','A pass needs an attributable execution record');
smoke.getRange('O10').values=[['fixture-tester']];
smoke.getRange('M10').values=[['   ']];
equal(smoke,'I10','缺少证据','Whitespace is not evidence');
smoke.getRange('M10').values=[['synthetic fixture evidence']];
smoke.getRange('G10').values=[['未执行']];
equal(batch,'B4','存在未完成或受阻检查','One remaining prerequisite stays visible');
smoke.getRange('G10').values=[['受阻']];equal(batch,'B24',1,'Blocked execution is counted as incomplete');
smoke.getRange('G10').values=[['通过']];
ui.getRange('D6').values=[['是']];ui.getRange('G6').values=[['通过']];ui.getRange('H6').values=[['build-fixture-1']];
ui.getRange('M6').values=[['synthetic fixture evidence']];
ui.getRange('O6').values=[['fixture-tester']];ui.getRange('U6').values=[['fixture-delivery']];ui.getRange('V6').values=[[value(batch,'B18')]];
equal(batch,'F22',0,'Review source remains pending until batch adoption is confirmed');
equal(batch,'B4','请明确适用项的验收依据','A pass cannot resolve pending UI acceptance basis');
ui.getRange('F6').values=[['已确认']];
equal(batch,'F22',0,'A case cannot bypass its unresolved linked decision');
equal(batch,'H40','待确认','A selected UI case automatically brings its decision into scope');
batch.getRange('D40').values=[['否']];
equal(batch,'H40','范围矛盾','An applicable linked case cannot exclude its own decision');
batch.getRange('D40').values=[['待选择']];
batch.getRange('F40').values=[['已确认']];batch.getRange('G40').values=[['   ']];
equal(batch,'H40','待确认','Whitespace is not decision evidence');
batch.getRange('G40').values=[['fixture-scheme-evidence']];
equal(batch,'F22',1,'A documented linked decision allows a confirmed case to count');
ui.getRange('F6').values=[['已确认']];ui.getRange('G6').values=[['失败']];ui.getRange('E6').values=[['是']];
equal(batch,'B4','关键项失败，建议退回整改','Critical failure is surfaced');
batch.getRange('B33').values=[['同意提测']];
equal(batch,'F35','请补齐评审人与证据','An approval record needs reviewer and evidence');
batch.getRange('B34').values=[['fixture-reviewer']];batch.getRange('B36').values=[['fixture-review-evidence']];
equal(batch,'F35','检查前提未满足，不能标记同意','Manual approval cannot hide a failed prerequisite');
ui.getRange('E6').values=[['否']];
equal(batch,'B4','存在一般失败或后置项，需评审带项意见','Noncritical failure needs a documented decision');
ui.getRange('G6').values=[['通过']];
equal(batch,'F29',1,'UI rate reflects confirmed applicable passing items');
batch.getRange('D40').values=[['是']];
batch.getRange('F40').values=[['待确认']];batch.getRange('G40').values=[[null]];
equal(batch,'B4','请明确适用项的验收依据','A pending in-scope design decision stays visible');
batch.getRange('F40').values=[['已确认']];
equal(batch,'F30',1,'A confirmed decision without scheme evidence is still unresolved');
batch.getRange('G40').values=[['fixture-scheme-evidence']];
equal(batch,'B4','本批检查已完成，待人工评审','A documented batch decision resolves the issue');
batch.getRange('F40').values=[['已记录后置']];
equal(batch,'B4','存在一般失败或后置项，需评审带项意见','Postponed adoption requires exception review');
equal(batch,'F35','检查前提未满足，不能标记同意','Ordinary approval cannot hide postponed items');
batch.getRange('B33').values=[['允许带项提测']];
equal(batch,'F35','需满足检查前提并补齐带项意见','Exception approval needs documented acceptance');
batch.getRange('B35').values=[['fixture-owner-deadline-impact-acceptance']];
equal(batch,'F35','已记录带项提测','Documented noncritical exception can be reviewed');
batch.getRange('D40').values=[['待选择']];
// Core calculation/state decisions are not resolved by recording postponement.
batch.getRange('D50').values=[['是']];batch.getRange('F50').values=[['已记录后置']];batch.getRange('G50').values=[['fixture-core-postponement']];
equal(batch,'H50','核心依据不可后置','A core product-state ambiguity cannot be treated as a layout exception');
equal(batch,'B4','请明确适用项的验收依据','A core unresolved rule blocks conditional readiness');
equal(batch,'F35','需满足检查前提并补齐带项意见','Exception approval cannot bypass a core rule');
batch.getRange('D50:G50').values=[['待选择','产品、开发','待确认',null]];
smoke.getRange('D24').values=[['是']]; // SM19: selected专项回归
smoke.getRange('Q24').values=[['fixture-regression-delivery']];
equal(batch,'B20',5,'Selecting a regression does not inflate smoke denominator');
equal(batch,'H20',1,'Selected regression is shown separately');
equal(batch,'B4','请明确适用项的验收依据','A selected regression requires its own basis');
smoke.getRange('F24').values=[['已确认']];smoke.getRange('G24').values=[['通过']];smoke.getRange('H24').values=[['build-fixture-1']];
smoke.getRange('M24').values=[['synthetic fixture evidence']];smoke.getRange('O24').values=[['fixture-tester']];smoke.getRange('R24').values=[[value(batch,'B18')]];
equal(batch,'H22',1,'A verified regression is counted in its own stage');
smoke.getRange('D64').values=[['是']]; // SM59: OMS history
smoke.getRange('Q64').values=[['fixture-history-delivery']];
equal(batch,'H60','待确认','Selecting OMS history automatically requires the phase/interface decision');
batch.getRange('F60').values=[['已确认']];batch.getRange('G60').values=[['fixture-OMS-snapshot-and-phase-evidence']];
equal(batch,'H60','已确认','OMS scope is resolved with a documented decision');
smoke.getRange('F64:H64').values=[['已确认','通过','build-fixture-1']];smoke.getRange('M64').values=[['synthetic fixture evidence']];smoke.getRange('O64').values=[['fixture-tester']];smoke.getRange('R64').values=[[value(batch,'B18')]];
equal(batch,'B22',6,'A confirmed in-scope OMS-history smoke case counts separately from regression');
smoke.getRange('O64').values=[['   ']];
equal(smoke,'I64','缺少执行人','Whitespace is not an executor');
ui.getRange('D8:H8').values=[['是','否','已确认','通过','build-fixture-1']];
ui.getRange('M8').values=[['synthetic fixture evidence']];ui.getRange('O8').values=[['fixture-tester']];ui.getRange('U8').values=[['fixture-rule-feedback-delivery']];ui.getRange('V8').values=[[value(batch,'B18')]];
equal(batch,'H61','待确认','Selecting rule-feedback UI automatically brings the PRD/Review conflict into scope');
equal(ui,'I8','依据待确认','Rule-feedback UI cannot pass while its conflict is unresolved');
batch.getRange('F61').values=[['已确认']];batch.getRange('G61').values=[['fixture-approved-cross-page-feedback-scheme']];
equal(ui,'I8','通过','A documented feedback decision allows the adopted UI case to pass');
batch.getRange('D61').values=[['否']];
equal(ui,'I8','依据待确认','Excluding a decision cannot bypass a selected feedback case');
batch.getRange('B7:B17').values=originalMeta;
batch.getRange('D40:G61').values=originalDecisions;
smoke.getRange(`D6:H${smokeInfo.last}`).values=originalSmoke;
ui.getRange(`D6:H${uiInfo.last}`).values=originalUi;
smoke.getRange(`M6:R${smokeInfo.last}`).values=originalSmokeEvidence;
ui.getRange(`M6:V${uiInfo.last}`).values=originalUiEvidence;
batch.getRange('B33:B36').values=originalReview;
equal(batch,'B4','请补齐本批信息并核对交付覆盖与基线','Original empty template restored');
equal(batch,'B22',0,'Restored smoke passes are zero');
equal(batch,'F22',0,'Restored UI passes are zero');
assert.equal(smokeRows.length,60);assert.equal(uiRows.length,34);assert.equal(reviewRows.length,18);assert.equal(decisions.length,22);
assert.deepEqual(Object.fromEntries(['P0','P1','P2'].map(p=>[p,reviewRows.filter(r=>r[5]===p).length])),{P0:6,P1:7,P2:5});
const coverageAudit=[];
for(const source of reviewSnapshot.records){
  const row=6+uiRows.findIndex(r=>r.id===source.caseId),actual=ui.getRange(`P${row}:AC${row}`).values[0];
  assert.deepEqual(actual.slice(0,4),[source.priority,source.state,source.adaptation,source.roles],`Source metadata mismatch for ${source.caseId}`);
  assert.deepEqual(actual.slice(8,13),[source.types,source.issue,source.suggestion,source.next,source.recordId],`Source detail mismatch for ${source.caseId}`);
  assert.equal(actual[13],detailRevisions[source.caseId].change);
  assert.equal(value(ui,`J${row}`),detailRevisions[source.caseId].steps);
  assert.equal(value(ui,`K${row}`),detailRevisions[source.caseId].expected);
  coverageAudit.push({caseId:source.caseId,recordId:source.recordId,sourceFieldsPreserved:true,revision:detailRevisions[source.caseId].change});
}
// Clause-specific checks guard against the former generalized or overbroad wording.
const clauseChecks={UI01:['右侧当前列表顶部','子项'],UI02:['手动','所属一级分类保持展开'],UI03:['数量汇总','跨页','未采纳'],UI04:['语义色','普通信息图标'],UI05:['必要提示','不得'],UI06:['选中态尺寸','一级菜单','左侧图标'],UI07:['可','暂时隐藏','有已交付功能'],UI08:['保留','「」','建议'],UI09:['不强行','3字段','无需拉伸','重置均有'],UI10:['顶部操作可按业务隐藏','仍保留','Padding'],UI11:['总数','页码切换','每页条数','按业务配置'],UI12:['其余业务字段随横向滚动','不建议冻结过多','无勾选'],UI13:['取消全部选择','恢复默认工具栏','底部悬浮'],UI14:['整行','固定列','取消后同步恢复'],UI15:['正确对象','普通文本','服务组合'],UI16:['资料','确认状态','24px','主体左右各'],UI17:['必要状态','特殊跳转','未保存字段'],UI18:['当前列表上下文','纵向滚动','顶部标题','底部操作区固定','emoji']};
for(const [id,tokens] of Object.entries(clauseChecks)){
  const row=uiRows.find(r=>r.id===id),text=`${row.steps}\n${row.expected}`;
  for(const token of tokens) assert(text.includes(token),`Missing source clause ${id}: ${token}`);
}
assert(!uiRows.find(r=>r.id==='UI18').steps.includes('进入编辑'));
assert.equal(coverageAudit.length,18);

workbook.recalculate();
const finalInspect=await workbook.inspect({kind:'table',range:'本批提测!A19:H31',include:'values,formulas',tableMaxRows:13,tableMaxCols:8,maxChars:7500});
const errors=await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:60},summary:'Formula error scan',maxChars:3000});
await fs.mkdir(outputDir,{recursive:true});
await fs.writeFile(`${supportDir}/verification.json`,JSON.stringify({counts:{functionalLibrary:60,smoke:31,regression:29,ui:34,reviewSource:18,decisions:22},assertions,reviewCoverageAudit:coverageAudit,inspection:finalInspect.ndjson,formulaScan:errors.ndjson},null,2),'utf8');
const previews=[
  ['本批提测','A2:H31','batch_preview.png'],
  ['本批提测','A38:H43','decision_preview.png'],
  ['冒烟用例','A2:I10','smoke_controls_preview.png'],
  ['冒烟用例','J5:O10','smoke_details_preview.png'],
  ['UI检查','A2:I10','ui_controls_preview.png'],
  ['UI检查','J5:S10','ui_details_preview.png'],
  ['UI检查','J23:S31','ui_norms_preview.png'],
  ['冒烟用例','J44:S47','cost_preview.png'],
  ['冒烟用例','J56:S58','calculation_preview.png'],
  ['UI检查','J27:W28','money_conflict_preview.png'],
  ['UI检查','J32:W39','new_ui_preview.png'],
  ['冒烟用例','J64:S65','history_preview.png'],
  ['本批提测','A58:H60','history_decision_preview.png'],
  ['UI检查','J11:L16','review_middle_preview.png'],
  ['UI检查','J17:L23','review_late_preview.png'],
  ['UI检查','X5:AC10','review_source_preview.png'],
];
for(const [sheetName,range,name] of previews){
  const preview=await workbook.render({sheetName,range,scale:1,format:'png'});
  await fs.writeFile(`${supportDir}/${name}`,new Uint8Array(await preview.arrayBuffer()));
}
const xlsx=await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(JSON.stringify({path:outputPath,counts:{functionalLibrary:60,smoke:31,regression:29,ui:34,originalReview:18,pendingDecisions:22},workflowAssertions:assertions.length,reviewRecordsVerified:coverageAudit.length,formulaErrors:errors.ndjson,previewCount:previews.length}));
}
