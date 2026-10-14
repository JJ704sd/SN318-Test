/**
 * 可扩展性契约：BIZ_CODE_MAP / HTTP_CODE_MAP / API_HOSTS 均为可变对象（无 as const），
 * 业务项目可在此基础上追加键。每个用例在 afterEach 清理自己写入的键，避免污染全局可变对象。
 */
import { describe, it, expect, afterEach } from 'vitest'
import { BIZ_CODE_MAP, HTTP_CODE_MAP, ERROR_TEXT } from '../errorCode'
import { API_HOSTS } from '../http'

describe('API 可扩展对象', () => {
  afterEach(() => {
    delete BIZ_CODE_MAP[10001]
    delete HTTP_CODE_MAP[418]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (API_HOSTS as any).payment
  })

  it('BIZ_CODE_MAP 可新增键并可赋值', () => {
    BIZ_CODE_MAP[10001] = { kind: 'business', text: '自定义业务错误' }
    expect(BIZ_CODE_MAP[10001]?.text).toBe('自定义业务错误')
  })

  it('HTTP_CODE_MAP 可新增键并可赋值', () => {
    HTTP_CODE_MAP[418] = { kind: 'business', text: "I'm a teapot" }
    expect(HTTP_CODE_MAP[418]?.text).toBe("I'm a teapot")
  })

  it('API_HOSTS 内置 main/file/gateway 三个模块已定义', () => {
    expect(typeof API_HOSTS.main).toBe('string')
    expect(typeof API_HOSTS.file).toBe('string')
    expect(typeof API_HOSTS.gateway).toBe('string')
  })

  it('API_HOSTS 可新增业务模块键（payment）并可赋值', () => {
    API_HOSTS.payment = 'https://payment.example.com'
    expect(API_HOSTS.payment).toBe('https://payment.example.com')
  })

  it('ERROR_TEXT.system 等于系统繁忙文案', () => {
    expect(ERROR_TEXT.system).toBe('系统繁忙，请稍后重试')
  })
})
