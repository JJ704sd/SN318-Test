import json, hashlib, zipfile
from pathlib import Path
base=Path('./artifacts/weekly-ui')
ev=base/'evidence/template-execution-20261013'
book=base/'SN318_W2_UI与交互测试用例_按工单用例风格重写.xlsx'
report=base/'SN318_通用模板40条_UI交互实测报告_20261013.html'
readme=base/'本次40条实测文件说明.txt'
summary=json.loads((ev/'execution-summary.json').read_text('utf8'))
audit=json.loads((ev/'norm-full-audit-review.json').read_text('utf8'))
readme.write_text('2026-10-13 PCS通用模板UI与交互实测\n\n'
    '全面复核后40条：12通过、10不通过、18受阻。129个子步骤中64通过、11不通过、54受阻。\n'
    '本轮核对正文rev5256、内嵌表格rev3138；完整取得185张工作表，仅采用当前正文引用的124张。40条及原20条受阻均逐条复核，保留明确条款、证据与边界。\n'
    '修正说明：005漏计操作列居中，改不通过M03；032补默认32px高/8px圆角，实测四类均2px，改不通过M01。012保留合法默认值，将前置及名称改为可触发字段错误呈现/纠错，原3步证据通过；未构造业务类型空组合，不宣称原全部必填组合通过。022/037上轮已改不通过，本轮维持。\n'
    '011抽屉640、030精度、034无筛选空态、036弹窗宽度、023纳入Mobile后44px已有规范，不再等额外批准稿；状态/数据/响应样例仍缺的逐条保留。032删除无明确依据的加载宽度不变要求。\n'
    '1. 工作簿：通用模板用例A/C/D/E/G按复核修订，H/I为判定与原执行证据。范围与依据142行起为40条复核索引。修改清单含7项规范差异、3项可用性建议、1项口径修订、18条整条条件缺口、3条失败用例子步骤缺口。业务76条仍未执行；按当前安排修订前置/备注中的准入说明，原名称、步骤、预期、等级及实际结果保留。\n'
    '2. HTML报告：解压整个证据包后打开，可筛选状态、展开每条原步骤/预期/实际并查看截图。保持evidence目录相对位置。\n'
    '3. evidence/template-execution-20261013：应用截图92张、规范参考截图10张，含量测JSON、健康记录及规范附件。\n'
    '4. E078/E079是错误目标标签的Mobile视口尝试，未用于Mobile判定；正确窄屏证据为E080/E081。短加载截图如已加载完成，不作为加载态证明。\n'
    '5. 当前dev使用Mock认证/数据。403/500展示路由仅验证展示与返回，实际异常响应缺样例的逐条受阻。\n'
    '6. 本轮基于原证据重判，未新增页面执行或重新健康检查；环境记录属于原实测快照。未修改应用源码；修改清单的建议尚未实施或复测。\n'
    '当前安排补充：今天先输出UI规范审查和修改清单；本周对38项UI/开实际交付页面全面介入UI与交互。通用规范明确步骤可先查，专项缺口逐步受阻，功能测试按原分工。本次安排修订未新增页面执行。\n'
    '7. norm-full-audit-body.txt为当前正文提取，norm-full-audit-sources.json为当前124张引用表完整快照，norm-full-audit-review.json为本轮40条复核。norm-followup-review.json保留上轮局部复核历史，其12/8/20不是当前结果。\n','utf8')
files=[book,report,readme]+sorted(p for p in ev.rglob('*') if p.is_file())
manifest=[{'path':p.relative_to(base).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
manifestpath=base/'本次40条实测交付索引.json'
manifestpath.write_text(json.dumps({'cases':40,'caseCounts':summary['caseCounts'],'stepCounts':summary['stepCounts'],'reviewedCases':40,'originalBlockedCases':20,'currentReferencedTables':124,'auditAt':audit['checkedAt'],'newPageExecution':False,'arrangementRevision':True,'files':manifest},ensure_ascii=False,indent=2),'utf8')
archive=base/'SN318_通用模板40条_UI交互实测证据包_20261013.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in files+[manifestpath]:z.write(p,p.relative_to(base).as_posix())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert len(z.namelist())==len(files)+1
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'files':len(files)+1,'validation':'PASS'},ensure_ascii=False))
