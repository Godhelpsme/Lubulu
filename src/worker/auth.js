/**
 * 极简认证: 基于 Cookie 的匿名 UUID
 */

const USER_ID_COOKIE = 'lubulu_uid';

/**
 * 从请求中获取用户 ID
 * 优先级: Header > Cookie
 */
export function getUserId(request) {
  // 1. 尝试从 Header 获取
  const headerUserId = request.headers.get('X-User-ID');
  if (headerUserId) {
    return headerUserId;
  }

  // 2. 尝试从 Cookie 获取
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  return cookies[USER_ID_COOKIE] || null;
}

/**
 * 生成新的用户 ID (UUID v4)
 */
export function generateUserId() {
  return crypto.randomUUID();
}

/**
 * 设置用户 ID Cookie
 */
export function setUserIdCookie(userId) {
  return `${USER_ID_COOKIE}=${userId}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

/**
 * 解析 Cookie 字符串
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      cookies[key] = value;
    }
  });
  return cookies;
}
