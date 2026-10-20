const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const dep = createRequire(path.join(root, 'backend/package.json'));

// Use the same request builders as the two clients, then call the real API.
function clientHelper(file) {
  const ts = dep('typescript');
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const exports = {};
  new Function('exports', compiled.outputText)(exports);
  return exports;
}

module.exports = async ({ test, api, rejected, repo, newMember, schedule, fixtures }) => {
  const { userAccountUpdate } = clientHelper('web-admin/src/lib/userAccountPayload.ts');
  const { passwordChangeRequest } = clientHelper('mobile/src/lib/passwordChange.ts');
  const bcrypt = dep('bcrypt');
  const coach = async (name) => api('/instructors', 'POST', {
    fullName: name, email: `coach-${randomUUID()}@qa.invalid`, specializations: ['Reformer'],
  });
  const login = (email, password) => api('/auth/login', 'POST', { email, password }, null, 200);
  const form = (m, password = '') => ({ fullName: m.user.fullName, phone: '0901234567', role: 'member', password });

  await test('ACCOUNT-COACH-DELETE-RELOAD', 'HLV đã xóa không xuất hiện khi tải lại, tìm tên hoặc email; total đúng', async () => {
    const name = `QA xóa ${randomUUID()}`;
    const c = await coach(name);
    const before = await api('/instructors?limit=100');
    assert.ok(before.items.some(i => i.id === c.id));
    await api(`/instructors/${c.id}`, 'DELETE');
    for (const search of ['', name, c.user.email]) {
      const after = await api(`/instructors?limit=100&search=${encodeURIComponent(search)}`);
      assert.ok(!after.items.some(i => i.id === c.id));
      assert.equal(after.total, search ? 0 : before.total - 1);
    }
    assert.ok(!(await api('/instructors/options')).some(i => i.id === c.id));
    assert.equal((await repo('User').findOneBy({ id: c.userId })).isActive, false);
  });
  await test('ACCOUNT-COACH-HISTORY', 'Xóa HLV giữ lịch dạy, booking và hồ sơ lịch sử', async () => {
    const c = await coach('QA lịch sử HLV');
    const s = await schedule({ instructorId: c.userId });
    await api(`/schedules/${s.id}/book`, 'POST', undefined, 'member');
    const booking = await repo('Booking').findOneByOrFail({ scheduleId: s.id, memberId: fixtures.member.member.id });
    await api(`/instructors/${c.id}`, 'DELETE');
    assert.ok(await repo('Instructor').findOneBy({ id: c.id }));
    assert.equal((await repo('ClassSchedule').findOneByOrFail({ id: s.id })).instructorId, c.userId);
    assert.equal((await repo('Booking').findOneByOrFail({ id: booking.id })).status, 'confirmed');
    await rejected('/auth/login', 'POST', { email: c.user.email, password: 'Coach@123' }, null, [401]);
  });
  await test('ACCOUNT-COACH-DELETE-PERMISSION', 'Chỉ admin được xóa HLV; ID sai hoặc không có không báo thành công', async () => {
    const c = await coach('QA quyền xóa');
    for (const actor of ['staff', 'coach', 'member']) await rejected(`/instructors/${c.id}`, 'DELETE', undefined, actor, [403]);
    assert.equal((await repo('User').findOneByOrFail({ id: c.userId })).isActive, true);
    for (const id of ['not-a-uuid', randomUUID()]) await rejected(`/instructors/${id}`, 'DELETE', undefined, 'admin', [400,404]);
  });
  await test('ACCOUNT-COACH-EMPTY', 'Xóa HLV cuối cùng trả danh sách rỗng thật, không giữ dữ liệu cũ', async () => {
    const active = await repo('User').find({ where: { role: 'instructor', isActive: true } });
    for (const u of active) await repo('User').update(u.id, { isActive: false });
    try {
      const list = await api('/instructors');
      assert.deepEqual(list.items, []); assert.equal(list.total, 0);
    } finally {
      for (const u of active) await repo('User').update(u.id, { isActive: true });
    }
  });
  await test('ACCOUNT-ADMIN-PASSWORD', 'Mật khẩu mới từ biểu mẫu admin được lưu và đăng nhập được; mật khẩu cũ bị từ chối', async () => {
    const m = await newMember();
    const password = ' QA Reset@456 ';
    const payload = userAccountUpdate(form(m, password));
    const result = await api(`/users/${m.user.id}`, 'PATCH', payload);
    assert.equal(result.passwordHash, undefined); assert.equal(result.password, undefined);
    await rejected('/auth/login', 'POST', { email: m.user.email, password: 'Member@123' }, null, [401]);
    await login(m.user.email, password);
    const user = await repo('User').findOneByOrFail({ id: m.user.id });
    assert.notEqual(user.passwordHash, password); assert.ok(await bcrypt.compare(password, user.passwordHash));
  });
  await test('ACCOUNT-ADMIN-PASSWORD-BLANK', 'Để trống mật khẩu khi sửa tài khoản giữ nguyên mật khẩu cũ', async () => {
    const m = await newMember();
    const hash = (await repo('User').findOneByOrFail({ id: m.user.id })).passwordHash;
    const payload = userAccountUpdate({ ...form(m), fullName: 'QA đổi tên không đổi mật khẩu' });
    assert.ok(!Object.hasOwn(payload, 'password'));
    await api(`/users/${m.user.id}`, 'PATCH', payload);
    assert.equal((await repo('User').findOneByOrFail({ id: m.user.id })).passwordHash, hash);
    await login(m.user.email, 'Member@123');
  });
  await test('ACCOUNT-ADMIN-PASSWORD-VALIDATION', 'Client và API chặn mật khẩu dưới 8 ký tự, không ghi đè mật khẩu', async () => {
    const m = await newMember();
    assert.throws(() => userAccountUpdate(form(m, '1234567')), /8/);
    await rejected(`/users/${m.user.id}`, 'PATCH', { password: '1234567' });
    await rejected(`/users/${m.user.id}`, 'PATCH', { password: '' });
    await login(m.user.email, 'Member@123');
  });
  await test('ACCOUNT-ADMIN-PASSWORD-PERMISSION', 'Lễ tân, HLV và học viên không được đặt mật khẩu tài khoản khác', async () => {
    const m = await newMember();
    for (const actor of ['staff', 'coach', 'member']) await rejected(`/users/${m.user.id}`, 'PATCH', { password: 'Hacked@123' }, actor, [403]);
    await login(m.user.email, 'Member@123');
  });
  await test('ACCOUNT-SELF-PASSWORD', 'Yêu cầu đổi mật khẩu của web học viên dùng oldPassword và đăng nhập mới thành công', async () => {
    const m = await newMember();
    const payload = passwordChangeRequest('Member@123', 'Changed@456', 'Changed@456');
    assert.ok(!Object.hasOwn(payload, 'currentPassword'));
    await api('/auth/change-password', 'PUT', payload, m, 200);
    await rejected('/auth/login', 'POST', { email: m.user.email, password: 'Member@123' }, null, [401]);
    await login(m.user.email, 'Changed@456');
  });
  await test('ACCOUNT-SELF-PASSWORD-WRONG', 'Sai mật khẩu hiện tại không đổi mật khẩu và phiên hiện tại vẫn hợp lệ', async () => {
    const m = await newMember();
    await rejected('/auth/change-password', 'PUT', passwordChangeRequest('Wrong@123', 'Changed@456', 'Changed@456'), m, [401]);
    await api('/auth/me', 'GET', undefined, m);
    await login(m.user.email, 'Member@123');
  });
  await test('ACCOUNT-SELF-PASSWORD-VALIDATION', 'Thiếu mật khẩu cũ, xác nhận sai hoặc mật khẩu ngắn đều bị chặn', async () => {
    assert.throws(() => passwordChangeRequest('', 'Changed@456', 'Changed@456'));
    assert.throws(() => passwordChangeRequest('Member@123', 'Changed@456', 'Other@456'));
    assert.throws(() => passwordChangeRequest('Member@123', '1234567', '1234567'));
    const m = await newMember();
    await rejected('/auth/change-password', 'PUT', { newPassword: 'Changed@456' }, m);
    await rejected('/auth/change-password', 'PUT', { oldPassword: 'Member@123', newPassword: '1234567' }, m);
    await login(m.user.email, 'Member@123');
  });
};
