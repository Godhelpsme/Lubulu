/**
 * CORS 配置
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // 生产环境应该设置为具体域名
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export function handleCors() {
  return new Response(null, {
    headers: corsHeaders
  });
}
