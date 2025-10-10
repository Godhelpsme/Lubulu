/**
 * 认证工具函数
 * 提供密码哈希、JWT生成和验证
 */

/**
 * 生成密码哈希
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 验证密码
 */
export async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

/**
 * 生成JWT令牌
 */
export async function generateToken(userId, username, secret) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const payload = {
    userId,
    username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30天过期
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(`${encodedHeader}.${encodedPayload}`, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * 验证JWT令牌
 */
export async function validateToken(token, secret) {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.');

    // 验证签名
    const expectedSignature = await sign(`${encodedHeader}.${encodedPayload}`, secret);
    if (signature !== expectedSignature) {
      return null;
    }

    // 解码payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    // 检查过期时间
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

/**
 * HMAC签名
 */
async function sign(data, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );

  return base64UrlEncode(signature);
}

/**
 * Base64 URL 编码
 */
function base64UrlEncode(data) {
  let base64;
  if (typeof data === 'string') {
    base64 = btoa(data);
  } else {
    const bytes = new Uint8Array(data);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    base64 = btoa(binary);
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64 URL 解码
 */
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}
