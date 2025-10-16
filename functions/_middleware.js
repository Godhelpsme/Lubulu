/**
 * Cloudflare Pages Functions
 * 在 functions/ 目录下的文件会自动部署为 Functions
 */

export { default as onRequest } from '../src/worker/index.js';
