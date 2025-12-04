/**
 * 工具函數
 */

/**
 * 從錯誤物件中提取錯誤訊息字串
 * 確保返回的是字串，避免 React 渲染物件時報錯
 */
export function getErrorMessage(error: any, defaultMessage: string = '操作失敗'): string {
  if (!error) return defaultMessage

  // 如果 error.message 是字串，直接返回
  if (typeof error.message === 'string' && error.message) {
    return error.message
  }

  // 如果 error.error 是字串，返回
  if (typeof error.error === 'string' && error.error) {
    return error.error
  }

  // 如果 error 本身是字串，返回
  if (typeof error === 'string') {
    return error
  }

  // 返回預設訊息
  return defaultMessage
}
