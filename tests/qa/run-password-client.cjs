const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const dep = createRequire(path.join(root, 'mobile/package.json'));
const ts = createRequire(path.join(root, 'backend/package.json'))('typescript');
const axios = dep('axios');
const stored = new Map([['pilatesms_token', 'qa-existing-session']]);
const storage = {
  getItem: async key => stored.get(key),
  deleteItem: async key => stored.delete(key),
};
const source = fs.readFileSync(path.join(root, 'mobile/src/lib/axios.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const exportsObject = {};
new Function('exports', 'require', code)(exportsObject, name => name === './storage' ? storage : dep(name));
const client = exportsObject.default;
let lastHeaders;
client.defaults.adapter = async config => {
  lastHeaders = config.headers;
  if (config.url === '/auth/me' && stored.has('pilatesms_token')) return { data: { id: 'qa' }, status: 200, statusText: 'OK', headers: {}, config };
  throw new axios.AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, { status: 401, data: { message: 'Mật khẩu hiện tại không chính xác' }, headers: {}, config });
};
(async () => {
  await assert.rejects(client.put('/auth/change-password', { oldPassword: 'Wrong@123', newPassword: 'New@12345' }));
  assert.equal(stored.get('pilatesms_token'), 'qa-existing-session');
  await client.get('/auth/me');
  assert.equal(lastHeaders.Authorization, 'Bearer qa-existing-session');
  console.log('PASS Sai mật khẩu hiện tại không xóa phiên, request kế tiếp vẫn gửi token');
  await assert.rejects(client.get('/protected-expired'));
  assert.ok(!stored.has('pilatesms_token'));
  console.log('PASS Lỗi 401 của request thông thường vẫn xóa phiên không hợp lệ');
  console.log('TOTAL 2/2 PASS');
})().catch(e => { console.error(e); process.exitCode = 1; });
