/**
 * 认证工具函数
 * 提供安全的密码哈希、JWT生成和验证
 */

// 常量配置
const PBKDF2_ITERATIONS = 100000; // PBKDF2 迭代次数
const SALT_LENGTH = 16; // 盐值长度
const ACCESS_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7天过期（改为更安全的值）

/**
 * 生成密码哈希（使用PBKDF2算法）
 * @param {string} password - 原始密码
 * @returns {Promise<string>} 返回格式: salt$hash
 */
export async function hashPassword(password) {
  // 生成随机盐值
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  // 使用PBKDF2派生密钥
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const key = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    key,
    256 // 32 bytes
  );

  // 将盐值和哈希值编码为hex字符串
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  // 格式: salt$hash
  return `${saltHex}$${hashHex}`;
}

/**
 * 验证密码
 * @param {string} password - 用户输入的密码
 * @param {string} storedHash - 存储的哈希值 (格式: salt$hash)
 * @returns {Promise<boolean>} 密码是否匹配
 */
export async function verifyPassword(password, storedHash) {
  try {
    const [saltHex, hashHex] = storedHash.split('$');
    if (!saltHex || !hashHex) {
      return false;
    }

    // 将hex字符串转换回字节数组
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));

    // 使用相同的盐值重新计算哈希
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const key = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      key,
      256
    );

    const computedHashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // 使用常量时间比较防止时序攻击
    return timingSafeEqual(computedHashHex, hashHex);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * 时序安全的字符串比较
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * 生成JWT令牌
 * @param {number} userId - 用户ID
 * @param {string} username - 用户名
 * @param {string} secret - JWT密钥
 * @returns {Promise<string>} JWT令牌
 */
export async function generateToken(userId, username, secret) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    userId,
    username,
    iat: now,
    exp: now + ACCESS_TOKEN_EXPIRY
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(`${encodedHeader}.${encodedPayload}`, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * 验证JWT令牌
 * @param {string} token - JWT令牌
 * @param {string} secret - JWT密钥
 * @returns {Promise<Object|null>} 解码后的payload或null
 */
export async function validateToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // 验证签名
    const expectedSignature = await sign(`${encodedHeader}.${encodedPayload}`, secret);
    if (!timingSafeEqual(signature, expectedSignature)) {
      return null;
    }

    // 解码payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    // 检查过期时间
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
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
 * @param {string} data - 要签名的数据
 * @param {string} secret - 密钥
 * @returns {Promise<string>} Base64 URL编码的签名
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
 * @param {string|ArrayBuffer} data
 * @returns {string}
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
 * @param {string} str
 * @returns {string}
 */
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}
