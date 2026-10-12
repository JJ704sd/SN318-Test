/** 组件展示页：可传递参数说明的行/分组结构。 */

export interface PropDocRow {
  name: string
  type: string
  default?: string
  required?: boolean
  desc: string
}

export interface PropDocGroup {
  title?: string
  note?: string
  rows: PropDocRow[]
}

export const BUTTON_PROP_GROUPS: PropDocGroup[] = [
  {
    title: 'a-button',
    note: '展示页常用参数；完整 API 见 Arco Button。',
    rows: [
      { name: 'type', type: "'primary' | 'secondary' | 'outline' | 'dashed' | 'text'", default: "'secondary'", desc: '按钮类型。主要操作每区域最多 1 个 primary' },
      { name: 'status', type: "'normal' | 'warning' | 'success' | 'danger'", default: "'normal'", desc: '语义状态。危险操作用 danger' },
      { name: 'size', type: "'mini' | 'small' | 'medium' | 'large'", default: "'medium'", desc: '尺寸：mini 24 / medium 32 / large 40' },
      { name: 'disabled', type: 'boolean', default: 'false', desc: '禁用，不可点击' },
      { name: 'loading', type: 'boolean', default: 'false', desc: '加载中，展示 spinner 且不可点' },
      { name: 'long', type: 'boolean', default: 'false', desc: '撑满容器宽度。Mobile 竖排主按钮建议开启' },
      { name: '#icon', type: 'slot', desc: '前置图标。图标+文字按钮用 a-button，纯图标用 ByIconButton' },
      { name: '@click', type: '(ev: MouseEvent) => void', desc: '点击回调' },
    ],
  },
  {
    title: 'ByIconButton',
    note: '纯图标按钮，已内置 Tooltip；tooltip 文案同时作为 aria-label。',
    rows: [
      { name: 'tooltip', type: 'string', required: true, desc: '操作名称。禁用态不弹出 Tooltip，但仍用于无障碍朗读' },
      { name: 'type', type: "'default' | 'primary'", default: "'default'", desc: '视觉类型' },
      { name: 'status', type: "'default' | 'danger'", default: "'default'", desc: '危险操作用 danger' },
      { name: 'size', type: "'default' | 'large' | 'small'", default: "'default'", desc: '点击热区尺寸' },
      { name: 'disabled', type: 'boolean', default: 'false', desc: '禁用。禁用时不显示 Tooltip' },
      { name: 'showTooltip', type: 'boolean', default: 'true', desc: '是否弹出可视 Tooltip；关闭后仍用 tooltip 做 aria-label' },
      { name: 'tooltipProps', type: "{ position?: 'top' | 'bottom' | 'left' | 'right' | ...; mouseEnterDelay?: number; mouseLeaveDelay?: number; mini?: boolean }", default: '{}', desc: '透传 a-tooltip。position 控制方位' },
      { name: '默认插槽', type: 'slot', desc: '图标内容，如 <icon-plus />' },
      { name: '@click', type: '(e: MouseEvent) => void', desc: '点击回调' },
    ],
  },
]

export const INPUT_PROP_GROUPS: PropDocGroup[] = [
  {
    title: 'a-input',
    note: '展示页常用参数；完整 API 见 Arco Input。校验状态挂在外层 a-form-item 上。',
    rows: [
      { name: 'v-model', type: 'string', desc: '输入值双向绑定' },
      { name: 'placeholder', type: 'string', desc: '占位文案，如「请输入」' },
      { name: 'disabled', type: 'boolean', default: 'false', desc: '禁用。文字走次要色且不可输入' },
      { name: 'allow-clear', type: 'boolean', default: 'false', desc: '显示清除按钮' },
      { name: 'max-length', type: 'number', desc: '最大字数' },
      { name: 'size', type: "'mini' | 'small' | 'medium' | 'large'", default: "'medium'", desc: '尺寸' },
    ],
  },
  {
    title: 'a-form-item（校验）',
    rows: [
      { name: 'field', type: 'string', desc: '对应 model 字段名，校验与滚动定位依赖它' },
      { name: 'label', type: 'string', desc: '字段标签' },
      { name: 'required', type: 'boolean', default: 'false', desc: '必填。左侧显示红色 *' },
      { name: 'rules', type: 'FieldRule[]', desc: '校验规则，如 [{ required: true, message: "请输入内容" }]' },
      { name: 'validate-trigger', type: "'change' | 'input' | 'blur' | 'focus' | Array<...>", default: "'change'", desc: '触发时机。输入框常用 [\'input\', \'blur\']' },
      { name: 'validate-status', type: "'success' | 'warning' | 'error' | 'validating'", desc: '手动指定校验态' },
      { name: 'help', type: 'string', desc: '输入框下方提示。错误态用错误色' },
    ],
  },
]

export const SELECTOR_PROP_GROUPS: PropDocGroup[] = [
  {
    title: 'a-select',
    note: '选项 >10 必须开启 allow-search。完整 API 见 Arco Select。',
    rows: [
      { name: 'v-model', type: 'string | number | Array<string | number>', desc: '选中值。multiple 时为数组' },
      { name: 'options', type: '{ label: string; value: string | number; disabled?: boolean }[]', desc: '选项列表' },
      { name: 'placeholder', type: 'string', desc: '占位文案' },
      { name: 'multiple', type: 'boolean', default: 'false', desc: '多选。选中项以 Tag 展示' },
      { name: 'allow-search', type: 'boolean', default: 'false（多选时 true）', desc: '可搜索。选项超过 10 必须开启' },
      { name: 'allow-clear', type: 'boolean', default: 'false', desc: '允许清空' },
      { name: 'disabled', type: 'boolean', default: 'false', desc: '禁用' },
    ],
  },
  {
    title: 'a-date-picker / a-range-picker / a-time-picker',
    rows: [
      { name: 'v-model', type: 'Date | string | number | Array', desc: '日期或时间值。RangePicker 为起止数组' },
      { name: 'show-time', type: 'boolean', default: 'false', desc: '同时选择时分秒。仅 DatePicker / RangePicker，TimePicker 无此参数' },
      { name: 'disabled-input', type: 'boolean', default: 'false', desc: '禁止键盘输入，只能从面板选择。仅 DatePicker / RangePicker' },
      { name: 'disabled', type: 'boolean', default: 'false', desc: '禁用' },
      { name: 'placeholder', type: 'string | string[]', desc: '占位。RangePicker 可传 [开始, 结束]' },
    ],
  },
  {
    title: 'a-input-number（数值区间用双控件，禁用 Slider）',
    rows: [
      { name: 'v-model', type: 'number', desc: '数值' },
      { name: 'min', type: 'number', desc: '最小值' },
      { name: 'max', type: 'number', desc: '最大值' },
      { name: 'placeholder', type: 'string', desc: '占位文案' },
      { name: 'disabled', type: 'boolean', default: 'false', desc: '禁用' },
      { name: 'precision', type: 'number', desc: '小数位数' },
    ],
  },
]

export const RADIO_PROP_GROUPS: PropDocGroup[] = [
  {
    title: 'a-radio-group',
    note: '2–5 个选项且必有预选；超过 5 个改 Select。完整 API 见 Arco Radio。',
    rows: [
      { name: 'v-model', type: 'string | number | boolean', desc: '当前选中值，须有预选' },
      { name: 'type', type: "'radio' | 'button'", default: "'radio'", desc: '形态。本页规范使用 radio' },
      { name: 'direction', type: "'horizontal' | 'vertical'", default: "'horizontal'", desc: '排列。文字较长或超过 3 个用 vertical' },
      { name: 'disabled', type: 'boolean', default: 'false', desc: '整组禁用' },
      { name: 'size', type: "'mini' | 'small' | 'medium' | 'large'", default: "'medium'", desc: '尺寸' },
    ],
  },
  {
    title: 'a-radio',
    rows: [
      { name: 'value', type: 'string | number | boolean', required: true, desc: '选项值，对应 group 的 v-model' },
      { name: 'disabled', type: 'boolean', default: 'false', desc: '单项禁用' },
      { name: 'model-value', type: 'boolean', desc: '脱离 Group 时的选中态' },
    ],
  },
]

export const CHECKBOX_PROP_GROUPS: PropDocGroup[] = [
  {
    title: 'a-checkbox',
    note: '互斥场景用 Radio。完整 API 见 Arco Checkbox。',
    rows: [
      { name: 'v-model / model-value', type: 'boolean', default: 'false', desc: '是否选中' },
      { name: 'value', type: 'string | number | boolean', desc: '在 CheckboxGroup 内标识该项' },
      { name: 'indeterminate', type: 'boolean', default: 'false', desc: '半选。用于全选「部分已勾」' },
      { name: 'disabled', type: 'boolean', default: 'false', desc: '禁用' },
      { name: '@change', type: '(value: boolean | Array, ev: Event) => void', desc: '变化回调。全选联动读取 boolean' },
    ],
  },
  {
    title: 'a-checkbox-group',
    rows: [
      { name: 'v-model', type: 'Array<string | number | boolean>', desc: '已选值数组' },
      { name: 'direction', type: "'horizontal' | 'vertical'", default: "'horizontal'", desc: '排列方向' },
      { name: 'disabled', type: 'boolean', default: 'false', desc: '整组禁用' },
    ],
  },
]

export const UPLOAD_PROP_GROUPS: PropDocGroup[] = [
  {
    title: 'ByUpload',
    note: '显式提交（非选中即传）。类型与大小上限须提前说明。',
    rows: [
      { name: 'fileList / v-model:file-list', type: 'FileItem[]', required: true, desc: '文件列表。uid / name / status / percent / url / response' },
      { name: 'mode', type: "'button' | 'dragger'", default: "'button'", desc: '触发形态：按钮或拖拽区' },
      { name: 'list-type', type: "'fileList' | 'imageGrid'", default: "'fileList'", desc: '列表形态：文件列表或图片网格' },
      { name: 'accept', type: 'string', desc: '允许的文件类型，如 .pdf,.xlsx,.zip 或 image/*' },
      { name: 'max-size', type: 'number', default: '10', desc: '单文件大小上限，单位 MB' },
      { name: 'max-count', type: 'number', default: '999', desc: '最大文件数' },
      { name: 'upload-handler', type: '(file: File, onProgress: (percent: number) => void) => Promise<UploadResult>', desc: '实际上传函数。成功 resolve({ url })，失败 reject(Error)' },
      { name: 'disabled', type: 'boolean', default: 'false', desc: '禁用选择与拖拽' },
      { name: '@update:fileList', type: '(list: FileItem[]) => void', desc: '列表变化。与 v-model:file-list 配套' },
      { name: '@success', type: '(item: FileItem, response: UploadResult) => void', desc: '单文件上传成功' },
      { name: '@error', type: '(item: FileItem, error: Error) => void', desc: '单文件上传失败' },
      { name: '@remove', type: '(item: FileItem) => void', desc: '移除文件。已提交附件会二次确认' },
    ],
  },
]

export const FORM_PROP_GROUPS: PropDocGroup[] = [
  {
    title: 'ByForm',
    note: '上下布局。双列 ≥1440 自动启用，小于 1440 降为单列。跨列字段加 class="by-form-span-2"。',
    rows: [
      { name: 'model', type: 'Record<string, unknown>', required: true, desc: '表单数据对象，字段与 a-form-item.field 对应' },
      { name: 'cols', type: '1 | 2', default: '1', desc: '列数。2 为双列，窄屏自动降单列' },
      { name: 'max-width', type: 'number | false', default: '720', desc: '表单区最大宽度（px）。false 取消限制' },
      { name: '默认插槽', type: 'slot', desc: '放入 a-form-item 及控件' },
      { name: 'validate()', type: '() => Promise<Record<string, unknown> | undefined>', desc: '校验全部字段；失败滚动到第一项。经 ref 调用' },
      { name: 'validateFields(fields)', type: '(fields: string[]) => Promise<...>', desc: '校验指定字段' },
      { name: 'resetFields()', type: '() => void', desc: '重置为初始值' },
      { name: 'clearValidate()', type: '() => void', desc: '清除校验提示' },
    ],
  },
  {
    title: 'a-form-item',
    rows: [
      { name: 'field', type: 'string', desc: '对应 model 字段名' },
      { name: 'label', type: 'string', desc: '字段标签' },
      { name: 'required', type: 'boolean', default: 'false', desc: '必填，左侧红色 *' },
      { name: 'rules', type: 'FieldRule[]', desc: '校验规则' },
      { name: 'validate-status', type: "'success' | 'warning' | 'error' | 'validating'", desc: '手动校验态' },
      { name: 'help', type: 'string', desc: '下方提示文案' },
      { name: 'class', type: 'string', desc: '双列跨两列时用 by-form-span-2' },
    ],
  },
]

export const TABLE_PROP_GROUPS: PropDocGroup[] = [
  {
    title: 'ByTable',
    rows: [
      { name: 'columns', type: 'ByTableColumn[]', required: true, desc: '列定义。见下方 ByTableColumn' },
      { name: 'data', type: 'Row[]', required: true, desc: '行数据' },
      { name: 'loading', type: 'boolean', default: 'false', desc: '加载中，表格区域展示 Spin' },
      { name: 'refreshing', type: 'boolean', default: 'false', desc: '刷新中（保留当前数据）' },
      { name: 'pagination', type: '{ current?: number; pageSize?: number; total?: number } | false', default: '{ current: 1, pageSize: 20, total: 0 }', desc: '分页。false 关闭' },
      { name: 'row-key', type: 'string', default: "'id'", desc: '行主键字段名' },
      { name: 'row-selection', type: 'boolean | TableRowSelection', default: 'false', desc: '行选择。true 为多选 checkbox' },
      { name: 'selected-row-keys', type: 'string[]', desc: '受控选中行' },
      { name: 'scroll-x', type: 'number | true | false', desc: '横向滚动。有冻结列时默认开启；false 关闭' },
      { name: '#[dataIndex]', type: 'slot { record, value }', desc: '按列 dataIndex 自定义单元格，如 #status、#action' },
      { name: '#empty', type: 'slot', desc: '空状态。可放 ByEmpty' },
      { name: '@page-change', type: '(page: number, pageSize: number) => void', desc: '翻页 / 改页大小' },
      { name: '@sort', type: '(sorter: unknown) => void', desc: '排序变化' },
      { name: '@selection-change', type: '(selectedRowKeys: string[], selectedRows: Row[]) => void', desc: '选中行变化' },
    ],
  },
  {
    title: 'ByTableColumn',
    rows: [
      { name: 'title', type: 'string', required: true, desc: '表头文案' },
      { name: 'dataIndex', type: 'string', required: true, desc: '字段名，同时作为自定义插槽名' },
      { name: 'fixed', type: "'left' | 'right'", desc: '冻结列。标识列常 left，操作列 right' },
      { name: 'align', type: "'left' | 'right' | 'center'", desc: '对齐。数字/金额/重量右对齐' },
      { name: 'ellipsis', type: '1 | 2', desc: '超长省略行数' },
      { name: 'width / minWidth', type: 'number', desc: '列宽' },
      { name: 'valueType', type: "'money' | 'weight' | 'count' | 'percent' | 'volume'", desc: '值类型，影响默认对齐与格式' },
    ],
  },
  {
    title: 'ByEmpty（空状态插槽）',
    rows: [
      { name: 'preset', type: "'noData' | 'noResult' | 'noAuth' | 'error'", desc: '预设图标与文案' },
      { name: 'title', type: 'string', desc: '覆盖预设标题' },
      { name: 'description', type: 'string', desc: '覆盖预设说明' },
      { name: 'size', type: "'default' | 'small'", default: "'default'", desc: '尺寸' },
      { name: '#action', type: 'slot', desc: '操作区，如「新增运单」按钮' },
      { name: '#aiSuggestion', type: 'slot', desc: '底部 AI 建议区' },
    ],
  },
]

export const CARD_PROP_GROUPS: PropDocGroup[] = [
  {
    title: 'ByCard',
    rows: [
      { name: 'title', type: 'string', desc: '标题。与 #header 二选一，#header 优先' },
      { name: 'variant', type: "'default' | 'outlined' | 'interactive'", default: "'default'", desc: 'default 仅白底；outlined 加描边无 hover；interactive 才有 hover/选中' },
      { name: 'interactive', type: 'boolean', default: 'false', desc: '兼容旧调用，true 等同 variant="interactive"' },
      { name: 'selected', type: 'boolean', default: 'false', desc: '选中态，仅 interactive 生效：主色描边 + 外圈' },
      { name: 'body-padding', type: 'boolean', default: 'true', desc: '内容区内边距。false 时去掉 padding' },
      { name: '#header', type: 'slot', desc: '自定义标题区' },
      { name: '#extra', type: 'slot', desc: '标题右侧操作' },
      { name: '默认插槽', type: 'slot', desc: '卡片内容' },
      { name: '#footer', type: 'slot', desc: '底部栏' },
      { name: '@click', type: '(ev: MouseEvent) => void', desc: '根节点原生点击（未单独 emit）。interactive 卡片作入口时使用' },
    ],
  },
]

export const MODAL_PROP_GROUPS: PropDocGroup[] = [
  {
    title: 'ByModal',
    note: '仅取消/确认两个按钮。手机端 default 为底部 Sheet，large 全屏。',
    rows: [
      { name: 'visible / v-model:visible', type: 'boolean', required: true, desc: '是否显示' },
      { name: 'title', type: 'string', desc: '标题' },
      { name: 'mode', type: "'confirm' | 'form-single' | 'form-double'", default: "'confirm'", desc: '形态。form-double 自动用大尺寸 640' },
      { name: 'size', type: "'default' | 'large'", desc: '宽度 default=480 / large=640。不传时由 mode 推断' },
      { name: 'danger', type: 'boolean', default: 'false', desc: '危险确认：确认按钮用危险色，默认文案「确认删除」' },
      { name: 'confirm-loading', type: 'boolean', default: 'false', desc: '提交中。确认按钮 loading，遮罩/ESC/关闭均不可关' },
      { name: 'mask-closable', type: 'boolean', default: 'false', desc: '点击遮罩是否关闭。确认类默认不可关，避免误触' },
      { name: 'ok-text', type: 'string', desc: '确认文案。默认：确认类「确认」/ 危险「确认删除」/ 表单「保存」' },
      { name: 'cancel-text', type: 'string', default: "'取消'", desc: '取消文案' },
      { name: '默认插槽', type: 'slot', desc: '弹窗内容' },
      { name: '@confirm', type: '() => void', desc: '点击确认。需自行关闭 visible' },
      { name: '@cancel', type: '() => void', desc: '取消或关闭' },
      { name: '@update:visible', type: '(v: boolean) => void', desc: '显示状态变化' },
    ],
  },
]

export const DRAWER_PROP_GROUPS: PropDocGroup[] = [
  {
    title: 'ByDrawer',
    note: '默认右侧滑出。Mobile 全屏。底部操作放 #footer。',
    rows: [
      { name: 'visible / v-model:visible', type: 'boolean', required: true, desc: '是否显示' },
      { name: 'title', type: 'string', default: "''", desc: '标题。bare 时不渲染头部' },
      { name: 'size', type: "'default' | 'large'", default: "'default'", desc: '宽度 default=480 / large=640（非 Mobile）' },
      { name: 'width', type: 'number | string', desc: '显式宽度，覆盖 size，且不套用 Mobile 全屏（如侧栏 280）' },
      { name: 'placement', type: "'left' | 'right'", default: "'right'", desc: '滑出方向' },
      { name: 'mask-closable', type: 'boolean', default: 'true', desc: '点击遮罩关闭' },
      { name: 'loading', type: 'boolean', default: 'false', desc: '内容区骨架屏，标题与关闭仍可用' },
      { name: 'bare', type: 'boolean', default: 'false', desc: '裸内容：无头部、body 零内边距' },
      { name: '默认插槽', type: 'slot', desc: '抽屉内容' },
      { name: '#footer', type: 'slot', desc: '底部固定操作栏。有 slot 才渲染 footer' },
      { name: '@close', type: '() => void', desc: '关闭' },
      { name: '@update:visible', type: '(v: boolean) => void', desc: '显示状态变化' },
    ],
  },
]

export const ALERT_PROP_GROUPS: PropDocGroup[] = [
  {
    title: 'a-alert',
    note: '页面级持续提示。一句话反馈用 Toast，异步标题+正文用 Notification。完整 API 见 Arco Alert。',
    rows: [
      { name: 'type', type: "'info' | 'success' | 'warning' | 'error'", default: "'info'", desc: '语义类型' },
      { name: 'title', type: 'string', desc: '标题。有标题时默认插槽作为正文' },
      { name: 'show-icon', type: 'boolean', default: 'true', desc: '显示左侧语义图标。Arco 默认开启' },
      { name: 'closable', type: 'boolean', default: 'false', desc: '显示关闭按钮' },
      { name: 'banner', type: 'boolean', default: 'false', desc: '顶部通栏样式' },
      { name: '默认插槽', type: 'slot', desc: '提示内容' },
      { name: '@close', type: '(ev: MouseEvent) => void', desc: '点击关闭' },
    ],
  },
]

export const TAG_BADGE_PROP_GROUPS: PropDocGroup[] = [
  {
    title: 'ByStatusTag',
    rows: [
      { name: 'status', type: "'default' | 'processing' | 'success' | 'warning' | 'error'", required: true, desc: '语义状态。浅底 + 深字 + 描边' },
      { name: 'text', type: 'string', default: "''", desc: '展示文案。与默认插槽二选一，插槽优先' },
      { name: 'size', type: "'default' | 'small'", default: "'default'", desc: 'default 高 22 / small 高 18' },
      { name: '默认插槽', type: 'slot', desc: '自定义内容，覆盖 text' },
    ],
  },
  {
    title: 'ByBizTag',
    rows: [
      { name: 'type', type: "'express' | 'air' | 'fba' | 'line' | 'sea' | 'pickup' | 'inquiry'", required: true, desc: '业务类型。默认文案：快递 / 空运 / FBA / 国际专线 / 海运整柜 / 上门取件 / 在线询盘' },
      { name: 'label', type: 'string', desc: '覆盖默认文字。优先级：插槽 > label > type 默认文案' },
      { name: 'size', type: "'default' | 'small'", default: "'default'", desc: '尺寸' },
      { name: 'color', type: 'string', desc: '自定义文字色（非法值回落 type 预设）' },
      { name: 'background-color', type: 'string', desc: '自定义底色（非法值回落 type 预设）' },
      { name: '默认插槽', type: 'slot', desc: '自定义内容' },
    ],
  },
  {
    title: 'a-badge',
    note: '仅用错误红。完整 API 见 Arco Badge。',
    rows: [
      { name: 'count', type: 'number', desc: '数字角标。0 时默认不显示' },
      { name: 'text', type: 'string', desc: '文字角标，与 count 二选一' },
      { name: 'max-count', type: 'number', default: '99', desc: '封顶。超过显示「99+」' },
      { name: 'dot', type: 'boolean', default: 'false', desc: '红点模式，不显示数字' },
      { name: 'offset', type: '[number, number]', desc: '相对目标的偏移 [x, y]' },
      { name: '默认插槽', type: 'slot', desc: '被包裹的目标，如按钮' },
    ],
  },
]

export const MESSAGE_PROP_GROUPS: PropDocGroup[] = [
  {
    title: 'Toast · successMsg / warningMsg / errorMsg / infoMsg',
    note: '一句话反馈。顶部居中，3 秒消失。',
    rows: [
      { name: 'content', type: 'string', required: true, desc: '提示文案。调用：successMsg(\'保存成功\')' },
    ],
  },
  {
    title: 'notify(options)',
    note: '异步消息：标题 + 正文 + 可选操作。右上角滑入，默认 4.5 秒。',
    rows: [
      { name: 'type', type: "'success' | 'warning' | 'error' | 'info'", required: true, desc: '语义类型' },
      { name: 'title', type: 'string', required: true, desc: '标题' },
      { name: 'content', type: 'string', required: true, desc: '正文' },
      { name: 'actions', type: '{ label: string; onClick: () => void }[]', desc: '底部操作。第一项为主按钮' },
      { name: 'duration', type: 'number', default: '4500', desc: '自动关闭毫秒。0 表示不自动关' },
    ],
  },
  {
    title: 'confirmAction(options)',
    note: '不可逆操作二次确认。返回 Promise<boolean>。',
    rows: [
      { name: 'title', type: 'string', required: true, desc: '标题' },
      { name: 'content', type: 'string', required: true, desc: '说明文字' },
      { name: 'danger', type: 'boolean', default: 'false', desc: '危险确认：红色图标，默认 okText 为「确认删除」' },
      { name: 'okText', type: 'string', desc: '确认文案。默认危险「确认删除」，否则「确认」' },
      { name: 'cancelText', type: 'string', default: "'取消'", desc: '取消文案' },
    ],
  },
]

export const TOOLTIP_PROP_GROUPS: PropDocGroup[] = [
  {
    title: 'a-tooltip',
    note: '内容最多 3 行，更多改 Popover。Mobile 禁用 Tooltip。完整 API 见 Arco Tooltip。',
    rows: [
      { name: 'content', type: 'string', desc: '提示文字' },
      { name: 'position', type: "'top' | 'tl' | 'tr' | 'bottom' | 'bl' | 'br' | 'left' | 'lt' | 'lb' | 'right' | 'rt' | 'rb'", default: "'top'", desc: '弹出方位' },
      { name: 'disabled', type: 'boolean', default: 'false', desc: '禁用弹出' },
      { name: 'mini', type: 'boolean', default: 'false', desc: '迷你尺寸' },
      { name: '默认插槽', type: 'slot', desc: '触发元素' },
    ],
  },
  {
    title: 'ByIconButton（内置 Tooltip）',
    rows: [
      { name: 'tooltip', type: 'string', required: true, desc: '图标按钮必配，作为 Tooltip 文案与 aria-label' },
      { name: 'tooltip-props', type: '{ position?: ...; mouseEnterDelay?: number; mouseLeaveDelay?: number; mini?: boolean }', default: '{}', desc: '透传 a-tooltip，常用来指定 position' },
      { name: 'show-tooltip', type: 'boolean', default: 'true', desc: '关闭可视 Tooltip 时仍保留 aria-label' },
      { name: 'disabled', type: 'boolean', default: 'false', desc: '禁用时规范不显示 Tooltip' },
    ],
  },
]

export const POPOVER_PROP_GROUPS: PropDocGroup[] = [
  {
    title: 'a-popover',
    note: '点击触发，承载可交互内容。同时仅 1 个打开。完整 API 见 Arco Popover。',
    rows: [
      { name: 'title', type: 'string', desc: '标题' },
      { name: 'trigger', type: "'click' | 'hover' | 'focus' | 'contextMenu'", default: "'hover'", desc: '触发方式。规范使用 click' },
      { name: 'position', type: "'top' | 'tl' | 'tr' | 'bottom' | 'bl' | 'br' | 'left' | 'lt' | 'lb' | 'right' | 'rt' | 'rb'", default: "'top'", desc: '弹出方位' },
      { name: 'popup-visible / v-model:popup-visible', type: 'boolean', desc: '受控显示。用于内部按钮关闭气泡' },
      { name: 'content', type: 'string', desc: '简易文字内容。复杂内容用 #content' },
      { name: '默认插槽', type: 'slot', desc: '触发元素' },
      { name: '#content', type: 'slot', desc: '气泡内容：按钮、表单、链接等' },
    ],
  },
]

export const RICH_TEXT_PROP_GROUPS: PropDocGroup[] = [
  {
    title: 'RichText',
    note: '渲染前经 sanitizeHtml 白名单清洗，剥离脚本、事件与危险协议。',
    rows: [
      { name: 'content', type: 'string', default: "''", desc: 'HTML 字符串。默认剥离内联 style' },
      { name: 'allow-inline-style', type: 'boolean', default: 'false', desc: '放行颜色/字号/对齐等内联样式，仍剔除脚本与危险 CSS' },
    ],
  },
]
