/** 上传相关按钮文案 */
export const BUTTON_TEXT = {
  delete: '删除',
} as const

/** 上传组件文案（规范 §05 上传 Upload）*/
export const UPLOAD_TEXT = {
  button: '上传文件',
  addThumb: '上传',
  draggerClick: '点击',
  draggerRest: '或拖拽文件到此处上传',
  draggerDrop: '松开鼠标即可上传',
  draggerHelp: (acceptLabel: string, maxSize: number) =>
    `支持 ${acceptLabel}，单个文件不超过 ${maxSize}MB`,
  draggerHelpShort: (acceptLabel: string) => `支持 ${acceptLabel}`,
  acceptAny: '任意格式',
  cancelUpload: '取消上传',
  retry: '重试',
  preview: '预览',
  uploadFailTitle: '上传失败',
  uploadFailRetry: '点击重试',
  failDefault: '上传失败，请重试',
  deleteTitle: '删除文件',
  deleteConfirm: (name: string) => `确认删除「${name}」？删除后不可恢复`,
  typeError: (accept: string) => `不支持该文件类型，请上传 ${accept}`,
  sizeError: (maxSize: number) => `文件大小超过 ${maxSize}MB 限制`,
  countError: (maxCount: number) => `最多上传 ${maxCount} 个文件`,
} as const
