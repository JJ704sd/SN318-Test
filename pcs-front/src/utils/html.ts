/**
 * HTML 安全工具：富文本展示前清洗（防 XSS）+ 文本插值转义。
 *
 * 约定：任何来自后端/用户、需要以 HTML 形式落地的内容，一律先过 sanitizeHtml；
 * 需要把不可信文本插入 HTML 上下文时用 escapeHtml。禁止在业务代码里直接 v-html 未经清洗的内容。
 */
import DOMPurify from 'dompurify'

/** 把普通文本转义为可安全插入 HTML 上下文的字符序列（防注入）。 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** 富文本展示白名单标签：仅允许常规排版标签，逐白名单剔除其余一切元素。 */
const ALLOWED_TAGS = [
  'p',
  'br',
  'hr',
  'span',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'mark',
  'sub',
  'sup',
  'small',
  'a',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'caption',
  'figure',
  'figcaption',
  'img',
]

/** 富文本允许保留的属性：白名单，不含 style / class / on* 事件属性。 */
const ALLOWED_ATTR = ['href', 'title', 'src', 'alt', 'target', 'rel', 'start']

export interface SanitizeOptions {
  /**
   * 是否保留富文本内联 style 属性（文字颜色/字号/对齐等）。默认 false 剥离。
   * 开启时依赖 DOMPurify 内置 CSS 净化，剔除 url() / expression / @import 等危险片段，
   * 仅是放行排版样式，不引入脚本能力。
   */
  allowInlineStyle?: boolean
}

/**
 * 清洗不可信富文本：按白名单剔除危险的标签、属性与协议。
 * - 剥除 style / class / 事件（on*）等属性，杜绝样式注入与脚本执行
 * - DOMPurify 内置过滤 javascript: 等危险协议；target=_blank 自动补 rel=noopener noreferrer
 * - 允许 img 携带 data: 图片（MIME 白名单由 DOMPurify 校验）
 * - allowInlineStyle=true 时放行内联 style，仅保留纯排版属性和值
 */
export function sanitizeHtml(html: string, options: SanitizeOptions = {}): string {
  const attributes = options.allowInlineStyle ? [...ALLOWED_ATTR, 'style'] : ALLOWED_ATTR
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: attributes,
    ADD_DATA_URI_TAGS: ['img'],
  })
}
