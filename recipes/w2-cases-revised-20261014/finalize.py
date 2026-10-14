from pathlib import Path
from collections import Counter
import json, zipfile, hashlib, re, posixpath
import xml.etree.ElementTree as E

ROOT=Path('.'); WORK=ROOT/'.work/w2-cases-revised-20261014'
p=json.loads((WORK/'plan.json').read_text(encoding='utf-8'))
OUT=Path(p['out']); DEST=Path(p['destination'])
usage='''# SN318 W2 新版测试用例使用说明

本版整理原用例、既有证据和整改跟进字段，没有新增页面测试。用例141条，逐步骤记录458条。458条包括88条主数据既有执行/范围检查、129条模板历史步骤、241条未执行计划，不能作为本轮执行数量。

## 怎么看

1. 先看“当前用例与补测”顶部汇总。主数据轮次复核31条：4通过、23不通过、4受阻。其他70条业务本轮未复核，40条模板本轮未重跑。
2. 第16行开始为当前用例表。按“主数据轮次覆盖”筛选本轮已复核，按用例ID关联。“最近执行结果”与“原人工复核”独立，不将模型结论代填人工意见。
3. 点击“步骤与补测入口”，跳转到第165行起的步骤明细。每步保留操作、预期、实际、结果、缺条件、规范定位和具体样例要求。历史未执行业务步骤仍为未执行，不能沿用旧缺入口描述推定当前项目状态。
4. “整改跟进”统一列出19条记录：12项已证实差异/缺陷、3项待确认事项、4组条件缺口。其中主数据本轮确认差异6项。其他历史问题尚未在本轮复核。
5. 后四张表是原业务用例、模板用例、范围与依据、修改清单，原样保留供追溯。日常跟进使用前两张表，避免修改历史记录。

## 怎么填写

- 人工二次复核：填写当前用例表K–M列“本轮人工复核、复核人、复核时间”。J列保留原人工内容，新增人工栏均为空。
- 受阻步骤：填写步骤表N–P列“准备责任人、计划复测日、人工步骤意见”。缺条件需由产品/设计确认或开发补齐，不把所有受阻项都归为开发缺陷。
- 整改跟进：填写责任人、计划完成日期、采用/修复版本、复测日期、复测结果和复测证据。确实补齐后更新“缺条件”。具体人员与承诺日期未确认，不预填成已分派。
- 修改跟进状态为“已关闭”后，“关闭核对”会提示未齐的条件、通过复测、版本、日期或证据。资料齐备仍需按验收标准核对实际内容，不能仅凭填完字段认为验收通过。
- 新一轮实测应另存副本，记录实际执行版本/时间/URL/角色/Mock和证据，更新当前跟进区域；原四表及原执行JSON继续保留。用例汇总依当前表D/E列变化，步骤结果与整条结果按失败优先、其次受阻进行核对。

## 证据怎么用

Excel中的蓝色链接可跳转步骤或打开“证据索引.html”。索引区分fd786de主数据轮次和b2efcdb模板历史轮次，提供截图、DOM和量测文件。原证据未重新拍摄，截图与DOM可能顺序采样，以原记录状态说明为准。

通过ZIP交接时先完整解压到同一目录，再打开Excel。保留证据索引、evidence和sources目录结构，单独移动Excel会使相对文件链接失效。没有截图的量测条目打开JSON/TXT查看。

## 本次细化说明

- 20条空态用例的测试词按原实际记录细化为NO_UI_20261014_RECHECK；原步骤文本仍保留。
- UI-W2-56-1把原范围前置单列PRE。按已有D01/D02证据，新增后取消交互为通过；范围采纳条件未齐，整条仍受阻。属于历史证据整理，没有新增执行。
- W2-G03/G04将业务字典范围、费用项长度L及非重复保存失败样例单独登记，属于原受阻条件的拆分，不是新增缺陷。
- UI-M1-022通过只表示重复错误明确、输入保留、按钮解锁。UI-W2-50-2还要求错误关联编码字段，仍不通过。
- 23条失败中20条共用W2-R09空态问题，不能作为23个独立缺陷统计。

## 基线及本周安排

主数据既有执行：2026-10-14 17:19–17:46，dev fd786de，dirty-8cdf1453，主数据URL，本地Mock/demo，1440×900/100%。模板历史执行：同日12:34–14:05，b2efcdb，dirty-5c6bc530。完整HEAD和指纹见原执行JSON。

规范沿用10/14快照：V1.2正文rev5256、相关表rev3138、Review rev680；W2排期10/12–10/16，排期快照rev988。本次未刷新云端规范，也未把UI Review设计状态当作测试结果。来源保留于历史“范围与依据”和sources。

建议10/15先确认判据、范围及样例，条件齐备后安排整改复测；10/16汇总进展和剩余缺口。此为建议节奏，具体责任人和日期需确认后填写。

## 文件检查范围

已检查原四表及原人工内容保留、用例与步骤聚合、公式缓存、337个链接目标、356份引用证据哈希。用Artifact Tool临时改动状态检查汇总联动、检查关闭条件提醒，并恢复后导出。导出文件已重新导入，关键区预览生成后完成目视核对；预览进程在退出阶段出现异常，因此不将进程退出作为验证通过。未完成Microsoft Excel/WPS原生打开与重算；本地Mock结果不覆盖真实接口、角色鉴权和后端持久化。
'''
(OUT/'使用说明.md').write_text(usage,encoding='utf-8')
check=json.loads((OUT/'文件校验.json').read_text(encoding='utf-8'))
check['input_recalculation']=json.loads((WORK/'input-recalculation.json').read_text(encoding='utf-8'))
check['preview_validation']={'saved_workbook_imported':True,'key_views_generated_and_visually_checked':True,'renderer_shutdown_exit_code':-1073740791,'native_excel_or_wps':False}
# Validate the final package in addition to the contents checked during assembly.
NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';REL='http://schemas.openxmlformats.org/package/2006/relationships';CT='http://schemas.openxmlformats.org/package/2006/content-types';Q=lambda s:'{'+NS+'}'+s
with zipfile.ZipFile(DEST) as z:
    names=set(z.namelist())
    types=E.fromstring(z.read('[Content_Types].xml'))
    assert types.tag=='{'+CT+'}Types'
    overrides=[x.attrib['PartName'].lstrip('/') for x in types if x.tag=='{'+CT+'}Override']
    assert len(overrides)==len(set(overrides)) and all(x in names for x in overrides)
    table_names=[];table_ids=[]
    for f in names:
        if re.fullmatch(r'xl/tables/table\d+\.xml',f):
            t=E.fromstring(z.read(f));table_names.append(t.attrib['name']);table_ids.append(t.attrib['id'])
    assert len(table_ids)==9 and len(set(table_ids))==9 and len(set(table_names))==9
    for f in names:
        if f.endswith('.rels'):
            rs=E.fromstring(z.read(f));ids=[r.attrib['Id'] for r in rs];assert len(ids)==len(set(ids))
            base=posixpath.dirname(f).removesuffix('/_rels')
            if f=='_rels/.rels':base=''
            for r in rs:
                if r.attrib.get('TargetMode')=='External':continue
                target=r.attrib['Target'];target=target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join(base,target))
                assert target in names,(f,target)
    first=E.fromstring(z.read('xl/worksheets/sheet5.xml'))
    issue=E.fromstring(z.read('xl/worksheets/sheet6.xml'))
    cells={c.attrib['r']:c for c in first.iter(Q('c'))}
    icells={c.attrib['r']:c for c in issue.iter(Q('c'))}
    assert all(not (icells.get(c+str(r)) is not None and icells[c+str(r)].find(Q('v')) is not None and icells[c+str(r)].find(Q('v')).text) for r in range(11,30) for c in 'NOPQRS')
    assert first.find(Q('sheetViews')).find(Q('sheetView')).find(Q('pane')).attrib['ySplit']=='16'
    assert issue.find(Q('sheetViews')).find(Q('sheetView')).find(Q('pane')).attrib['ySplit']=='10'
check['native_tables_unique']=table_names
check['package_relationship_targets_valid']=True
check['followup_input_fields_blank']=True
check['source_unchanged_after_all_checks']=hashlib.sha256(Path(p['source']).read_bytes()).hexdigest()==p['source_sha256']
(OUT/'文件校验.json').write_text(json.dumps(check,ensure_ascii=False,indent=2),encoding='utf-8')
manifest=[]
for f in sorted(OUT.rglob('*')):
    if f.is_file() and f.suffix!='.zip' and f.name!='文件清单.json':manifest.append({'path':f.relative_to(OUT).as_posix(),'size':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
(OUT/'文件清单.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
zip_path=OUT/'SN318_W2_新版测试用例与证据_20261014.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for f in sorted(OUT.rglob('*')):
        if f.is_file() and f.suffix!='.zip':z.write(f,f.relative_to(OUT).as_posix())
with zipfile.ZipFile(zip_path) as z:
    assert z.testzip() is None
    for f in manifest:assert hashlib.sha256(z.read(f['path'])).hexdigest()==f['sha256']
print(json.dumps({'workbook':str(DEST),'zip':str(zip_path),'zip_files':len(manifest)+1,'zip_mib':round(zip_path.stat().st_size/1024**2,2),'checks':'passed except native Excel opening/recalculation not performed'},ensure_ascii=False))
