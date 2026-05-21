// HTML escape utility — 用于把不可信字符串（玩家输入）安全拼进 innerHTML。
// 覆盖 & < > " ' 五个 HTML 特殊字符。

export function escapeHtml(s: string | number): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
