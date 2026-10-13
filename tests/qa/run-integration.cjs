/* Real HTTP + PostgreSQL regression tests. Never connects the app to the existing DB.
 * Run from backend after npm run build: node ../tests/qa/run-integration.cjs
 * DB connection is loaded from the project's .env; QA_DB_* overrides are optional.
 * Each run creates qa_pilates_<random>, then drops ONLY that newly created database.
 */
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createRequire } = require('node:module');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const dep = createRequire(path.join(root, 'backend/package.json'));
dep('reflect-metadata');
dep('dotenv').config({ path: path.join(root, '.env') });
const { Client } = dep('pg');
const { DataSource } = dep('typeorm');
const bcrypt = dep('bcrypt');
const { NestFactory } = dep('@nestjs/core');
const { ValidationPipe } = dep('@nestjs/common');
const results = [];
const legacy = [];
const reportDir = process.env.QA_REPORT_DIR || path.join(root, 'tests/qa/results');
let app, db, base, fixtures, control, created = false, dropped = false;
const database = `qa_pilates_${randomUUID().replaceAll('-', '')}`;
let clockSlot = 0;
const dateBase = new Date();
dateBase.setUTCDate(dateBase.getUTCDate() + 30);
dateBase.setUTCHours(2, 0, 0, 0);
const repo = (name) => db.getRepository(name);
const save = (name, data) => repo(name).save(repo(name).create(data));
const raw = (url, method = 'GET', body, actor = 'admin') => fetch(base + url, {
  method,
  headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: `Bearer ${typeof actor === 'string' ? fixtures[actor].token : actor.token}` } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
  signal: AbortSignal.timeout(15000),
}).then(async r => {
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: r.status, body: json, data: json?.success && json.data !== undefined ? json.data : json };
});
async function api(url, method = 'GET', body, actor = 'admin', expected) {
  const r = await raw(url, method, body, actor);
  if (expected !== undefined) assert.equal(r.status, expected, `${method} ${url}: expected ${expected}, got ${r.status}; ${JSON.stringify(r.body)?.slice(0, 500)}`);
  else assert.ok(r.status >= 200 && r.status < 300, `${method} ${url}: HTTP ${r.status}; ${JSON.stringify(r.body)?.slice(0, 500)}`);
  return r.data;
}
async function rejected(url, method, body, actor = 'admin', allowed = [400]) {
  const r = await raw(url, method, body, actor);
  assert.ok(allowed.includes(r.status), `${method} ${url}: expected ${allowed.join('/')}, got ${r.status}`);
  return r;
}
async function test(id, name, fn) {
  const start = Date.now();
  try { await fn(); results.push({ id, name, status: 'PASS', ms: Date.now() - start }); }
  catch (e) { results.push({ id, name, status: 'FAIL', ms: Date.now() - start, evidence: e.message }); }
  const r = results.at(-1);
  console.log(`${r.status} [${id}] ${name}${r.evidence ? ' — ' + r.evidence.replaceAll('\n', ' ').slice(0, 650) : ''}`);
}
async function login(email, password) {
  const data = await api('/auth/login', 'POST', { email, password }, null, 200);
  assert.equal(typeof data.accessToken, 'string');
  return { token: data.accessToken, refreshToken: data.refreshToken, user: data.user };
}
async function newMember(extra = {}) {
  const user = await save('User', { email: `qa_${randomUUID()}@test.invalid`, fullName: 'QA Học viên', role: 'member', branchId: fixtures.branch.id, passwordHash: fixtures.hash, ...extra });
  const member = await save('Member', { userId: user.id, qrCode: `QA-${randomUUID()}` });
  const auth = await login(user.email, 'Member@123');
  return { ...auth, entity: user, member };
}
async function assign(member, changes = {}) {
  return save('MemberPackage', { memberId: member.id, packageId: fixtures.pkg.id, status: 'active', remainingSessions: 10, startDate: new Date(), expiryDate: new Date(Date.now() + 180 * 86400000), ...changes });
}
function scheduleBody(changes = {}) {
  const start = new Date(dateBase.getTime() + clockSlot++ * 86400000);
  return { classId: fixtures.cls.id, roomId: fixtures.room.id, instructorId: fixtures.coach.user.id, maxCapacity: 4, startTime: start.toISOString(), endTime: new Date(start.getTime() + 3600000).toISOString(), ...changes };
}
async function schedule(changes = {}) { return api('/schedules', 'POST', scheduleBody(changes)); }
async function initializeFixtures() {
  const branch = await save('Branch', { name: 'QA Pilates', address: 'QA only', isActive: true });
  fixtures = { branch };
  const accounts = [
    ['admin', 'admin@pilatesms.vn', 'Admin@123456', 'admin'],
    ['staff', 'letan@pilatesms.vn', 'Staff@123', 'receptionist'],
    ['coach', 'coach.lan@pilatesms.vn', 'Coach@123', 'instructor'],
    ['coach2', 'coach2@qa.invalid', 'Coach@123', 'instructor'],
    ['member', 'hang.nguyen@gmail.com', 'Member@123', 'member'],
    ['member2', 'member2@qa.invalid', 'Member@123', 'member'],
  ];
  fixtures.hash = await bcrypt.hash('Member@123', 4);
  for (const [key, email, password, role] of accounts) {
    const user = await save('User', { email, fullName: `QA ${key}`, role, passwordHash: await bcrypt.hash(password, 4), branchId: branch.id });
    if (role === 'instructor') await save('Instructor', { userId: user.id, bio: 'QA', specializations: ['Reformer'] });
    const member = role === 'member' ? await save('Member', { userId: user.id, qrCode: `QA-${key}` }) : undefined;
    fixtures[key] = { ...(await login(email, password)), entity: user, member };
  }
  fixtures.room = await save('Room', { branchId: branch.id, name: 'QA nhóm 4', capacity: 4, roomType: 'small_group_1v4' });
  fixtures.room2 = await save('Room', { branchId: branch.id, name: 'QA riêng 1', capacity: 1, roomType: 'private_1v1' });
  fixtures.cls = await save('Class', { branchId: branch.id, name: 'QA Pilates', defaultMaxCapacity: 4, durationMinutes: 60, price: 200000 });
  fixtures.pkg = await save('Package', { name: 'QA 10 buổi', type: 'session_based', price: 1000000, totalSessions: 10, durationDays: 180 });
  for (const key of ['member', 'member2']) await assign(fixtures[key].member);
}
async function runLegacy(script) {
  // Redirect only the hardcoded API origin; preserve all original assertions.
  const source = fs.readFileSync(path.join(root, script), 'utf8').replaceAll('http://localhost:3001/api/v1', base);
  const child = spawn(process.execPath, ['-e', source], { cwd: root, windowsHide: true });
  let out = '';
  child.stdout.on('data', b => { out += b; }); child.stderr.on('data', b => { out += b; });
  const timer = setTimeout(() => child.kill(), 120000);
  const exitCode = await new Promise((resolve, reject) => { child.on('exit', resolve); child.on('error', reject); });
  clearTimeout(timer);
  fs.writeFileSync(path.join(reportDir, `${script}.log`), out);
  const lines = out.split(/\r?\n/);
  const failureLines = lines.filter(l => /^FAIL \[|❌ \[.+\].*: FAILED/.test(l));
  const passed = lines.filter(l => /^PASS \[|✅ \[.+\].*: PASSED/.test(l)).length;
  legacy.push({ script, exitCode, passed, failed: failureLines.length, total: passed + failureLines.length, outputFile: `${script}.log`, failureLines });
  console.log(`LEGACY ${script}: exit=${exitCode}, failure lines=${legacy.at(-1).failureLines.length}`);
}
async function suite() {
  for (const [actor, role] of [['admin', 'admin'], ['staff', 'receptionist'], ['coach', 'instructor'], ['member', 'member']]) {
    await test(`UC1-LOGIN-${role}`, `Đăng nhập ${role} và đối chiếu /auth/me`, async () => {
      const me = await api('/auth/me', 'GET', undefined, actor, 200);
      assert.equal(me.id, fixtures[actor].user.id); assert.equal(me.role, role); assert.ok(!('passwordHash' in me));
    });
  }
  await test('UC1-BAD-LOGIN', 'Sai mật khẩu trả 401', () => rejected('/auth/login', 'POST', { email: fixtures.member.user.email, password: 'wrongpassword' }, null, [401]));
  await test('UC1-NO-TOKEN', 'API cá nhân chặn truy cập không token', () => rejected('/auth/me', 'GET', undefined, null, [401]));
  await test('UC1-BAD-TOKEN', 'API cá nhân chặn token giả', () => rejected('/auth/me', 'GET', undefined, { token: 'invalid' }, [401]));
  await test('UC1-REGISTER', 'Đăng ký tạo hồ sơ hội viên và giữ vai trò member', async () => {
    const data = await api('/auth/register', 'POST', { email: `register-${randomUUID()}@qa.invalid`, fullName: 'QA đăng ký', password: 'Member@123', confirmPassword: 'Member@123' }, null, 201);
    assert.equal(data.user.role, 'member'); assert.ok(data.user.memberId); assert.ok(await repo('Member').findOneBy({ id: data.user.memberId }));
  });
  await test('UC1-DUPLICATE-EMAIL', 'Đăng ký email trùng trả 409', () => rejected('/auth/register', 'POST', { email: fixtures.member.user.email, fullName: 'QA', password: 'Member@123' }, null, [409]));
  await test('UC1-REGISTER-INVALID', 'Chặn email sai và mật khẩu ngắn', () => rejected('/auth/register', 'POST', { email: 'bad-email', fullName: 'QA', password: '123' }, null));
  await test('UC1-REGISTER-ROLE', 'Chặn tự gán vai trò admin khi đăng ký', () => rejected('/auth/register', 'POST', { email: `role-${randomUUID()}@qa.invalid`, fullName: 'QA', password: 'Member@123', role: 'admin' }, null));
  await test('UC1-CONFIRM-PASSWORD', 'Chặn xác nhận mật khẩu đăng ký không khớp', () => rejected('/auth/register', 'POST', { email: `mismatch-${randomUUID()}@qa.invalid`, fullName: 'QA', password: 'Member@123', confirmPassword: 'Different@123' }, null));
  await test('UC1-VERIFY-WRONG', 'Chặn mã xác thực sai', async () => {
    const m = await newMember(); await repo('User').update(m.user.id, { isVerified: false, verificationCode: '123456' });
    await rejected('/auth/verify', 'POST', { email: m.user.email, code: 'wrong' }, null, [401]);
    assert.equal((await repo('User').findOneBy({ id: m.user.id })).isVerified, false);
  });
  await test('UC1-VERIFY-MISSING', 'Chặn xác thực khi chưa phát hành mã', async () => {
    const m = await newMember(); await repo('User').update(m.user.id, { isVerified: false, verificationCode: null });
    await rejected('/auth/verify', 'POST', { email: m.user.email, code: 'arbitrary' }, null, [400, 401]);
  });
  await test('UC1-UNVERIFIED-LOGIN', 'Chặn đăng nhập tài khoản chưa xác thực', async () => {
    const m = await newMember(); await repo('User').update(m.user.id, { isVerified: false });
    await rejected('/auth/login', 'POST', { email: m.user.email, password: 'Member@123' }, null, [401, 403]);
  });
  await test('UC1-PROFILE', 'Sửa hồ sơ rồi đọc lại dữ liệu', async () => {
    const m = await newMember(); await api('/members/me', 'PUT', { fullName: 'QA đã cập nhật', phone: '0901234567' }, m);
    const me = await api('/auth/me', 'GET', undefined, m); assert.equal(me.fullName, 'QA đã cập nhật'); assert.equal(me.phone, '0901234567');
  });
  await test('UC1-PROFILE-INVALID', 'Chặn ngày sinh không hợp lệ, không lỗi 500', () => rejected('/members/me', 'PUT', { dateOfBirth: 'invalid-date' }, 'member'));
  await test('UC1-PROFILE-PATCH', 'PATCH hồ sơ cá nhân không bị nhầm thành sửa hội viên theo ID', async () => { const m = await newMember(); await api('/members/me', 'PATCH', { fullName: 'QA PATCH' }, m); assert.equal((await api('/auth/me', 'GET', undefined, m)).fullName, 'QA PATCH'); });
  await test('UC1-PASSWORD', 'Đổi mật khẩu: mật khẩu cũ thất bại, mới đăng nhập được', async () => {
    const m = await newMember(); await api('/auth/change-password', 'POST', { oldPassword: 'Member@123', newPassword: 'Changed@123' }, m);
    await rejected('/auth/login', 'POST', { email: m.user.email, password: 'Member@123' }, null, [401]); await login(m.user.email, 'Changed@123');
  });
  await test('UC1-PASSWORD-WRONG', 'Đổi mật khẩu sai mật khẩu hiện tại trả 401', () => rejected('/auth/change-password', 'POST', { oldPassword: 'wrong', newPassword: 'Changed@123' }, 'member', [401]));
  await test('UC1-PASSWORD-WEAK', 'Chặn mật khẩu mới ngắn', () => rejected('/auth/change-password', 'POST', { oldPassword: 'Member@123', newPassword: '123' }, 'member'));
  await test('UC1-PASSWORD-METHOD', 'PUT đổi mật khẩu hoạt động như mobile gọi', async () => {
    const m = await newMember(); await api('/auth/change-password', 'PUT', { oldPassword: 'Member@123', newPassword: 'Changed@123' }, m, 200);
  });
  await test('UC1-REFRESH', 'Refresh token hợp lệ cấp access token', async () => {
    const m = await newMember(); const data = await api('/auth/refresh', 'POST', { refreshToken: m.refreshToken }, null, 200); assert.equal(typeof data.accessToken, 'string');
  });
  await test('UC1-LOGOUT', 'Logout vô hiệu hóa refresh token', async () => {
    const m = await newMember(); await api('/auth/logout', 'POST', undefined, m, 200);
    await rejected('/auth/refresh', 'POST', { refreshToken: m.refreshToken }, null, [401]);
  });
  await test('UC1-REVIEW', 'Gửi review và Admin thấy đúng nội dung, người gửi', async () => {
    const r = await api('/reviews', 'POST', { targetType: 'service', rating: 5, comment: 'QA service review' }, 'member', 201);
    const list = await api('/reviews?limit=100'); const found = list.items.find(v => v.id === r.id); assert.ok(found); assert.equal(found.rating, 5); assert.equal(found.userId, fixtures.member.user.id);
  });
  for (const rating of [0, 6, 2.5]) await test(`UC1-RATING-${rating}`, `Chặn điểm đánh giá ${rating}`, () => rejected('/reviews', 'POST', { targetType: 'service', rating }, 'member'));
  await test('UC1-REVIEW-INSTRUCTOR', 'Review HLV lưu đúng tên giáo viên', async () => {
    const r = await api('/reviews', 'POST', { targetType: 'instructor', targetId: fixtures.coach.user.id, targetName: fixtures.coach.user.fullName, rating: 4, comment: 'QA coach review' }, 'member');
    assert.equal(r.targetName, fixtures.coach.user.fullName); assert.equal(r.targetId, fixtures.coach.user.id);
  });

  await test('UC2-CLASS-SEARCH', 'Tìm kiếm lớp học trả đúng lớp và không có kết quả sai', async () => {
    const d = await api('/classes?search=QA%20Pilates'); assert.ok(d.items.some(x => x.id === fixtures.cls.id)); assert.ok(d.items.every(x => x.name.includes('QA Pilates')));
    assert.equal((await api('/classes?search=no-match-qa')).total, 0);
  });
  await test('UC2-SCHEDULE-CREATE', 'Tạo lịch và đọc lại thời gian, HLV, phòng', async () => {
    const body = scheduleBody(); const s = await api('/schedules', 'POST', body); const d = await api(`/schedules/${s.id}`);
    assert.equal(d.roomId, body.roomId); assert.equal(d.instructorId, body.instructorId); assert.equal(d.startTime, body.startTime); assert.equal(d.maxCapacity, 4);
  });
  await test('UC2-SCHEDULE-TIME', 'Chặn kết thúc trước bắt đầu', async () => {
    const b = scheduleBody(); b.endTime = new Date(new Date(b.startTime).getTime() - 3600000).toISOString(); await rejected('/schedules', 'POST', b);
  });
  await test('UC2-ROOM-CONFLICT', 'Chặn trùng phòng dù khác HLV', async () => {
    const b = scheduleBody(); await api('/schedules', 'POST', b); const r = await rejected('/schedules', 'POST', { ...b, instructorId: fixtures.coach2.user.id }); assert.match(JSON.stringify(r.body), /Phòng/);
  });
  await test('UC2-COACH-CONFLICT', 'Chặn trùng HLV dù khác phòng', async () => {
    const b = scheduleBody(); await api('/schedules', 'POST', b); const r = await rejected('/schedules', 'POST', { ...b, roomId: fixtures.room2.id, maxCapacity: 1 }); assert.match(JSON.stringify(r.body), /Huấn luyện viên/);
  });
  await test('UC2-ADJACENT', 'Hai ca nối tiếp nhau không bị coi là trùng', async () => {
    const b = scheduleBody(); await api('/schedules', 'POST', b); await api('/schedules', 'POST', { ...b, startTime: b.endTime, endTime: new Date(new Date(b.endTime).getTime() + 3600000).toISOString() });
  });
  await test('UC2-EDIT-CONFLICT', 'Sửa lịch không vượt qua chống trùng phòng', async () => {
    const s1 = await schedule(); const s2 = await schedule(); await rejected(`/schedules/${s2.id}`, 'PATCH', { startTime: s1.startTime, endTime: s1.endTime });
    assert.notEqual((await api(`/schedules/${s2.id}`)).startTime, s1.startTime);
  });
  await test('UC2-CAPACITY-ROOM', 'Chặn sức chứa lịch vượt sức chứa phòng', () => rejected('/schedules', 'POST', scheduleBody({ roomId: fixtures.room2.id, maxCapacity: 4 })));
  await test('UC2-CAPACITY-ZERO', 'Chặn sức chứa lịch bằng 0', () => rejected('/schedules', 'POST', scheduleBody({ maxCapacity: 0 })));
  await test('UC2-CAPACITY-NEGATIVE', 'Chặn sức chứa lịch âm', () => rejected('/schedules', 'POST', scheduleBody({ maxCapacity: -1 })));
  await test('UC2-COACH-FILTER', 'Lọc lịch đúng userId HLV', async () => {
    const s = await schedule({ instructorId: fixtures.coach2.user.id }); const d = await api(`/schedules?instructorId=${fixtures.coach2.user.id}`);
    assert.ok(d.some(v => v.id === s.id)); assert.ok(d.every(v => v.instructorId === fixtures.coach2.user.id));
  });
  await test('UC2-DATE-FILTER', 'Lọc ngày theo múi giờ Việt Nam', async () => {
    const s = await schedule(); const day = new Date(new Date(s.startTime).getTime() + 7 * 3600000).toISOString().slice(0, 10);
    const d = await api(`/schedules?date=${day}`); assert.ok(d.some(v => v.id === s.id)); assert.ok(d.every(v => new Date(new Date(v.startTime).getTime() + 7 * 3600000).toISOString().startsWith(day)));
  });
  await test('UC2-CANCEL-SCHEDULE', 'Hủy lịch: trạng thái cancelled và biến mất khỏi danh sách', async () => {
    const s = await schedule(); await api(`/schedules/${s.id}`, 'DELETE'); assert.equal((await api(`/schedules/${s.id}`)).status, 'cancelled'); assert.ok(!(await api('/schedules')).some(v => v.id === s.id));
  });
  await test('UC2-BOOK-CANCEL', 'Đặt/hủy lịch cập nhật đúng số chỗ và hoàn buổi', async () => {
    const m = await newMember(); const mp = await assign(m.member); const s = await schedule();
    await api(`/schedules/${s.id}/book`, 'POST', undefined, m); assert.equal((await api(`/schedules/${s.id}`)).currentEnrolled, 1);
    assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 9);
    await api(`/schedules/${s.id}/book`, 'DELETE', undefined, m); assert.equal((await api(`/schedules/${s.id}`)).currentEnrolled, 0);
    assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 10);
  });
  await test('UC2-DUPLICATE-BOOK', 'Chặn đặt lịch hai lần, không trừ thêm buổi', async () => {
    const m = await newMember(); const mp = await assign(m.member); const s = await schedule(); await api(`/schedules/${s.id}/book`, 'POST', undefined, m);
    await rejected(`/schedules/${s.id}/book`, 'POST', undefined, m); assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 9);
  });
  await test('UC2-BOOK-NO-PACKAGE', 'Chặn đặt lịch khi chưa có gói tập', async () => { const m = await newMember(); const s = await schedule(); await rejected(`/schedules/${s.id}/book`, 'POST', undefined, m); });
  await test('UC2-BOOK-EXPIRED', 'Chặn đặt lịch khi gói đã quá ngày hết hạn', async () => { const m = await newMember(); await assign(m.member, { expiryDate: new Date(Date.now() - 86400000) }); const s = await schedule(); await rejected(`/schedules/${s.id}/book`, 'POST', undefined, m); });
  await test('UC2-BOOK-COMPLETED', 'Chặn đặt lớp đã hoàn tất', async () => { const m = await newMember(); await assign(m.member); const s = await schedule(); await repo('ClassSchedule').update(s.id, { status: 'completed' }); await rejected(`/schedules/${s.id}/book`, 'POST', undefined, m); });
  await test('UC2-BOOK-PAST', 'Chặn đặt lớp đã qua thời gian', async () => { const m = await newMember(); await assign(m.member); const s = await schedule(); await repo('ClassSchedule').update(s.id, { startTime: new Date(Date.now() - 7200000), endTime: new Date(Date.now() - 3600000) }); await rejected(`/schedules/${s.id}/book`, 'POST', undefined, m); });
  await test('UC2-MEMBER-CONFLICT', 'Chặn học viên đặt hai lớp trùng giờ', async () => {
    const m = await newMember(); await assign(m.member); const b = scheduleBody(); const s1 = await api('/schedules', 'POST', b); const s2 = await api('/schedules', 'POST', { ...b, roomId: fixtures.room2.id, maxCapacity: 1, instructorId: fixtures.coach2.user.id });
    await api(`/schedules/${s1.id}/book`, 'POST', undefined, m); await rejected(`/schedules/${s2.id}/book`, 'POST', undefined, m);
  });
  await test('UC2-FULL-BOOK', 'Chặn đặt trực tiếp khi lớp đã đầy', async () => {
    const s = await schedule({ maxCapacity: 1, roomId: fixtures.room2.id }); for (const key of ['member', 'member2']) {
      if (key === 'member') await api(`/schedules/${s.id}/book`, 'POST', undefined, key); else await rejected(`/schedules/${s.id}/book`, 'POST', undefined, key);
    } assert.equal((await api(`/schedules/${s.id}`)).currentEnrolled, 1);
  });
  await test('UC2-CONCURRENT-CAPACITY', 'Hai request đồng thời không vượt sức chứa 1', async () => {
    for (let round = 0; round < 5; round++) {
      const a = await newMember(), b = await newMember(); await assign(a.member); await assign(b.member); const s = await schedule({ roomId: fixtures.room2.id, maxCapacity: 1 });
      const responses = await Promise.all([raw(`/schedules/${s.id}/book`, 'POST', undefined, a), raw(`/schedules/${s.id}/book`, 'POST', undefined, b)]);
      const count = await repo('Booking').countBy({ scheduleId: s.id, status: 'confirmed' }); assert.equal(count, 1, `round=${round + 1}, confirmed bookings=${count}, HTTP=${responses.map(r => r.status)}`);
    }
  });
  await test('UC2-WAITLIST', 'Danh sách chờ tự lên khi một người hủy', async () => {
    const s = await schedule({ roomId: fixtures.room2.id, maxCapacity: 1 }); const a = await newMember(), b = await newMember(); await assign(a.member); await assign(b.member);
    const b1 = await api('/bookings', 'POST', { memberId: a.member.id, scheduleId: s.id }, 'staff'); const b2 = await api('/bookings', 'POST', { memberId: b.member.id, scheduleId: s.id }, 'staff');
    assert.equal(b1.status, 'confirmed'); assert.equal(b2.status, 'waitlisted'); await api(`/bookings/${b1.id}/cancel`, 'PATCH', { reason: 'QA' }, 'staff');
    assert.equal((await api(`/bookings/${b2.id}`)).status, 'confirmed'); const d = await api(`/schedules/${s.id}`); assert.equal(d.currentEnrolled, 1); assert.equal(d.waitlistCount, 0);
  });
  await test('UC2-SPOT-RANGE', 'Chặn đặt vị trí vượt sức chứa lớp', async () => { const s = await schedule(); const m = await newMember(); await assign(m.member); await rejected('/bookings', 'POST', { memberId: m.member.id, scheduleId: s.id, spotNumber: 99 }, 'staff'); });
  await test('UC2-SPOTS-DIRECT', 'Đặt trực tiếp phải giảm số chỗ trống trong sơ đồ vị trí', async () => {
    const s = await schedule(); const m = await newMember(); await assign(m.member); await api(`/schedules/${s.id}/book`, 'POST', undefined, m);
    const d = await api(`/schedules/${s.id}/spots`); assert.equal(d.availableSpots, 3); assert.equal(d.spots.filter(v => v.isAvailable).length, 3);
  });
  await test('UC2-CHECKIN-ONCE', 'Check-in thành công chỉ trừ tổng cộng một buổi', async () => {
    const s = await schedule(); const m = await newMember(); const mp = await assign(m.member); await api(`/schedules/${s.id}/book`, 'POST', undefined, m);
    await api('/check-ins/manual', 'POST', { memberId: m.member.id, scheduleId: s.id }, 'staff'); assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 9);
  });
  await test('UC2-CHECKIN-DUPLICATE', 'Check-in lần hai bị chặn và không ghi nhận thêm lượt', async () => {
    const s = await schedule(); const m = await newMember(); await assign(m.member); await api(`/schedules/${s.id}/book`, 'POST', undefined, m);
    await api('/check-ins/manual', 'POST', { memberId: m.member.id, scheduleId: s.id }, 'staff'); await rejected('/check-ins/manual', 'POST', { memberId: m.member.id, scheduleId: s.id }, 'staff', [400, 409]);
  });
  await test('UC2-QR', 'Quét QR ghi nhận đúng học viên và booking attended', async () => {
    const s = await schedule(); const m = await newMember(); await assign(m.member); await api(`/schedules/${s.id}/book`, 'POST', undefined, m);
    const data = await api('/check-ins/qr', 'POST', { qrData: m.member.qrCode, scheduleId: s.id }, 'staff'); assert.equal(data.checkIn.memberId, m.member.id);
    assert.equal((await repo('Booking').findOneBy({ scheduleId: s.id, memberId: m.member.id })).status, 'attended');
  });
  await test('UC2-QR-INVALID', 'QR không tồn tại trả 404', () => rejected('/check-ins/qr', 'POST', { qrData: 'QA-invalid' }, 'staff', [404]));

  await test('UC3-MY-SCHEDULES', 'HLV chỉ thấy lịch dạy của mình', async () => { const s = await schedule(); const d = await api('/teaching/my-schedules', 'GET', undefined, 'coach'); assert.ok(d.some(v => v.id === s.id)); assert.ok(d.every(v => v.instructorId === fixtures.coach.user.id)); });
  await test('UC3-STATUS', 'HLV bắt đầu/kết thúc ca và trạng thái được lưu', async () => { const s = await schedule(); await api(`/schedules/${s.id}`, 'PATCH', { status: 'in_progress' }, 'coach'); assert.equal((await api(`/schedules/${s.id}`)).status, 'in_progress'); await api(`/schedules/${s.id}`, 'PATCH', { status: 'completed' }, 'coach'); assert.equal((await api(`/schedules/${s.id}`)).status, 'completed'); });
  await test('UC3-STATUS-INVALID', 'Chặn trạng thái ca không hợp lệ, không lỗi 500', async () => { const s = await schedule(); await rejected(`/schedules/${s.id}`, 'PATCH', { status: 'garbage' }, 'coach'); });
  await test('UC3-OTHER-COACH', 'HLV không được sửa ca của HLV khác', async () => { const s = await schedule(); await rejected(`/schedules/${s.id}`, 'PATCH', { status: 'completed' }, 'coach2', [403]); });
  await test('UC3-PROGRESS', 'Giáo án, tiến độ và phản hồi đọc lại đúng', async () => {
    const p = await api('/teaching/workout-plans', 'POST', { memberId: fixtures.member.member.id, title: 'QA giáo án', exercises: 'Footwork', progressNotes: 'QA ban đầu' }, 'coach');
    await api(`/teaching/workout-plans/${p.id}/progress`, 'PATCH', { progressNotes: 'QA tiến bộ', feedback: 'QA phản hồi' }, 'coach'); const d = await api(`/teaching/students/${fixtures.member.member.id}/progress`, 'GET', undefined, 'member');
    const found = d.find(v => v.id === p.id); assert.ok(found); assert.equal(found.progressNotes, 'QA tiến bộ'); assert.equal(found.feedback, 'QA phản hồi');
  });
  await test('UC3-FEEDBACK-NOTIFICATION', 'Phản hồi HLV xuất hiện đúng trên thông báo học viên', async () => {
    const title = `QA phản hồi ${randomUUID()}`; await api('/notifications', 'POST', { userId: fixtures.member.user.id, title, message: 'QA feedback' }, 'coach');
    assert.ok((await api('/notifications?limit=100', 'GET', undefined, 'member')).some(v => v.title === title)); assert.ok(!(await api('/notifications?limit=100', 'GET', undefined, 'member2')).some(v => v.title === title));
  });
  await test('UC3-PRIVATE-WEEK', 'Lịch tuần HLV có đủ 7 ngày và slot không trùng lớp', async () => {
    const s = await schedule(); const day = new Date(new Date(s.startTime).getTime() + 7 * 3600000).toISOString().slice(0, 10);
    const w = await api(`/private-sessions/instructors/${fixtures.coach.user.id}/week?weekStart=${day}`, 'GET', undefined, 'member'); assert.equal(w.days.length, 7); assert.ok(w.days[0].classes.some(v => v.id === s.id));
    assert.ok(w.days[0].freeSlots.every(v => !(new Date(v.startTime) < new Date(s.endTime) && new Date(s.startTime) < new Date(v.endTime))));
  });
  await test('UC3-PRIVATE-APPROVE', 'Đề nghị tập riêng -> duyệt -> chặn lớp trùng HLV', async () => {
    const b = scheduleBody(); const r = await api('/private-sessions', 'POST', { instructorUserId: b.instructorId, startTime: b.startTime, endTime: b.endTime }, 'member'); assert.equal(r.status, 'pending');
    const approved = await api(`/private-sessions/${r.id}/status`, 'PATCH', { status: 'approved' }, 'coach'); assert.equal(approved.status, 'approved'); await rejected('/schedules', 'POST', b);
  });
  await test('UC3-PRIVATE-CANCEL-OWNER', 'Học viên khác không được hủy đề nghị tập riêng', async () => { const b = scheduleBody(); const r = await api('/private-sessions', 'POST', { instructorUserId: b.instructorId, startTime: b.startTime, endTime: b.endTime }, 'member'); await rejected(`/private-sessions/${r.id}/cancel`, 'PATCH', {}, 'member2', [403]); await api(`/private-sessions/${r.id}/cancel`, 'PATCH', {}, 'member'); });
  await test('UC3-PRIVATE-HOURS', 'Chặn đề nghị tập riêng ngoài giờ hoạt động 07-21', async () => { const b = scheduleBody(); const day = b.startTime.slice(0, 10); await rejected('/private-sessions', 'POST', { instructorUserId: b.instructorId, startTime: `${day}T23:00:00+07:00`, endTime: `${day}T23:30:00+07:00` }, 'member'); });

  await test('UC4-MEMBER-CRUD', 'Thêm/sửa/khóa học viên và kiểm tra đăng nhập bị chặn', async () => {
    const m = await api('/members', 'POST', { fullName: 'QA CRUD hội viên', email: `crud-${randomUUID()}@qa.invalid`, phone: '0909999999' }, 'staff'); assert.ok(m.id);
    await api(`/members/${m.id}`, 'PATCH', { fullName: 'QA CRUD đã sửa' }, 'staff'); assert.equal((await api(`/members/${m.id}`)).user.fullName, 'QA CRUD đã sửa');
    await api(`/members/${m.id}`, 'DELETE'); await rejected('/auth/login', 'POST', { email: m.user.email, password: 'Member@123' }, null, [401]);
  });
  for (const status of ['active', 'inactive', 'expired']) await test(`UC4-FILTER-${status}`, `Lọc học viên trạng thái ${status} có dữ liệu đúng`, async () => {
    const m = await newMember(); if (status === 'inactive') await repo('User').update(m.user.id, { isActive: false }); else await assign(m.member, status === 'expired' ? { status: 'expired', expiryDate: new Date(Date.now() - 86400000) } : {});
    const d = await api(`/members?status=${status}&limit=100`); assert.ok(d.items.some(v => v.id === m.member.id), 'Không tìm thấy fixture phù hợp'); assert.ok(d.items.every(v => v.status === status));
  });
  await test('UC4-MEMBER-SEARCH', 'Tìm học viên theo email trả đúng người', async () => { const m = await newMember(); const d = await api(`/members?search=${encodeURIComponent(m.user.email)}`); assert.equal(d.total, 1); assert.equal(d.items[0].id, m.member.id); });
  await test('UC4-FILTER-EXPIRED-DATE', 'Gói quá ngày hết hạn phải xuất hiện trong bộ lọc hết hạn', async () => { const m = await newMember(); await assign(m.member, { expiryDate: new Date(Date.now() - 86400000) }); const d = await api(`/members?status=expired&limit=100`); assert.ok(d.items.some(v => v.id === m.member.id), 'Gói quá hạn nhưng vẫn phân loại hội viên hoạt động'); });
  await test('UC4-PACKAGE-CRUD', 'Tạo/sửa/ngừng gói và kiểm tra isActive', async () => {
    const p = await api('/packages', 'POST', { name: 'QA CRUD gói', type: 'session_based', price: 1000000, totalSessions: 5, durationDays: 30 }); await api(`/packages/${p.id}`, 'PATCH', { price: 1200000 }); assert.equal(Number((await api(`/packages/${p.id}`)).price), 1200000); await api(`/packages/${p.id}`, 'DELETE'); assert.equal((await api(`/packages/${p.id}`)).isActive, false);
  });
  await test('UC4-ASSIGN-PACKAGE', 'Lễ tân đăng ký gói đủ buổi và ngày hết hạn', async () => {
    const m = await newMember(); const p = await api('/packages/assign', 'POST', { memberId: m.member.id, packageId: fixtures.pkg.id }, 'staff'); assert.equal(p.remainingSessions, 10); assert.equal(p.status, 'active'); assert.ok(new Date(p.expiryDate) > new Date(p.startDate));
  });
  await test('UC4-PAY-CASH', 'Thanh toán tại quầy tạo giao dịch và gói tập', async () => {
    const m = await newMember(); const tx = await api('/transactions', 'POST', { memberId: m.member.id, branchId: fixtures.branch.id, packageId: fixtures.pkg.id, amount: 1000000, finalAmount: 1000000, paymentMethod: 'cash' }, 'staff'); assert.equal(tx.paymentStatus, 'completed'); assert.ok(await repo('MemberPackage').findOneBy({ transactionId: tx.id }));
  });
  await test('UC4-PENDING-CONFIRM', 'Xác nhận giao dịch chờ phải cấp gói sau khi thanh toán', async () => {
    const m = await newMember(); const tx = await api('/transactions', 'POST', { memberId: m.member.id, branchId: fixtures.branch.id, packageId: fixtures.pkg.id, amount: 1000000, finalAmount: 1000000, paymentMethod: 'bank_transfer', paymentStatus: 'pending' }, 'staff');
    assert.equal(await repo('MemberPackage').countBy({ transactionId: tx.id }), 0); await api(`/transactions/${tx.id}/confirm`, 'POST', {}, 'staff'); assert.equal(await repo('MemberPackage').countBy({ transactionId: tx.id }), 1);
  });
  await test('UC4-TX-HISTORY', 'Hội viên chỉ thấy giao dịch của mình', async () => {
    const own = await api('/transactions', 'POST', { memberId: fixtures.member.member.id, branchId: fixtures.branch.id, amount: 1000000, finalAmount: 1000000, paymentMethod: 'cash' }, 'staff');
    await api('/transactions', 'POST', { memberId: fixtures.member2.member.id, branchId: fixtures.branch.id, amount: 1000000, finalAmount: 1000000, paymentMethod: 'cash' }, 'staff');
    const d = await api('/transactions', 'GET', undefined, 'member'); assert.ok(d.items.some(v => v.id === own.id)); assert.ok(d.items.every(v => v.memberId === fixtures.member.member.id));
  });
  await test('UC4-TX-FILTER', 'Lễ tân lọc giao dịch theo memberId như API công bố', async () => { const d = await api(`/transactions?memberId=${fixtures.member.member.id}`, 'GET', undefined, 'staff'); assert.ok(d.items.length > 0); assert.ok(d.items.every(v => v.memberId === fixtures.member.member.id)); });
  await test('UC4-TX-DETAIL-OWNER', 'Không đọc chi tiết giao dịch của học viên khác', async () => {
    const tx = await api('/transactions', 'POST', { memberId: fixtures.member2.member.id, branchId: fixtures.branch.id, amount: 1000000, finalAmount: 1000000, paymentMethod: 'cash' }, 'staff'); await rejected(`/transactions/${tx.id}`, 'GET', undefined, 'member', [403, 404]);
  });
  await test('UC4-PAY-NEGATIVE', 'Chặn giao dịch có số tiền âm', () => rejected('/transactions', 'POST', { memberId: fixtures.member.member.id, branchId: fixtures.branch.id, amount: -100, finalAmount: -100, paymentMethod: 'cash' }, 'staff'));
  await test('UC4-BUY-TAMPER', 'Hội viên không tự sửa giá gói xuống 1 đồng', async () => {
    const m = await newMember(); const r = await raw('/members/me/packages', 'POST', { packageId: fixtures.pkg.id, finalAmount: 1, discountAmount: 999999 }, m);
    if ([400, 403].includes(r.status)) return; assert.ok(r.status >= 200 && r.status < 300, `HTTP ${r.status}`);
    const tx = await repo('Transaction').findOne({ where: { memberId: m.member.id }, order: { createdAt: 'DESC' } }); assert.equal(Number(tx.finalAmount), 1000000, 'Server phải tính giá từ gói và voucher hợp lệ');
  });

  await test('UC5-ROOM-CRUD', 'Phòng 1:1 và nhóm 2-4 lưu sức chứa, tìm kiếm, bật/tắt', async () => {
    for (const [capacity, roomType] of [[1, 'private_1v1'], [2, 'semi_private_1v2'], [3, 'small_group_1v3'], [4, 'small_group_1v4']]) {
      const p = await api('/rooms', 'POST', { name: `QA cấu hình ${capacity}`, capacity, roomType }); assert.equal(p.capacity, capacity);
      const d = await api(`/rooms?roomType=${roomType}&search=${encodeURIComponent(p.name)}`); assert.ok(d.some(v => v.id === p.id)); assert.ok(d.every(v => v.roomType === roomType));
      const off = await api(`/rooms/${p.id}/toggle`, 'PATCH', {}); assert.equal(off.isActive, false); await api(`/rooms/${p.id}`, 'DELETE'); await rejected(`/rooms/${p.id}`, 'GET', undefined, 'admin', [404]);
    }
  });
  await test('UC5-ROOM-NEGATIVE', 'Chặn sức chứa phòng âm', () => rejected('/rooms', 'POST', { name: 'QA invalid', roomType: 'private_1v1', capacity: -1 }));
  await test('UC5-PRODUCT-CRUD', 'Thêm/sửa sản phẩm và cập nhật tồn kho', async () => {
    const p = await api('/products', 'POST', { name: 'QA thảm', category: 'accessory', price: 100000, stockQuantity: 10 }); await api(`/products/${p.id}`, 'PATCH', { name: 'QA thảm sửa' }); assert.equal((await api(`/products/${p.id}`)).name, 'QA thảm sửa');
    await api(`/products/${p.id}/stock`, 'PATCH', { change: -3 }); assert.equal((await api(`/products/${p.id}`)).stockQuantity, 7);
  });
  await test('UC5-PRODUCT-NEGATIVE', 'Chặn giá sản phẩm âm', () => rejected('/products', 'POST', { name: 'QA invalid', category: 'accessory', price: -1 }));
  await test('UC5-PROMO', 'Khuyến mãi tính đúng giá và chặn mã trùng', async () => {
    const code = `QA${randomUUID().slice(0, 8)}`; await api('/promotions', 'POST', { code, name: 'QA giảm 10%', discountPercent: 10, minOrderAmount: 100000 });
    const d = await api('/promotions/apply', 'POST', { code: code.toLowerCase(), orderAmount: 1000000 }, null); assert.equal(d.discountAmount, 100000); assert.equal(d.finalAmount, 900000);
    await rejected('/promotions', 'POST', { code, name: 'QA trùng' }, 'admin', [409]); await rejected('/promotions/apply', 'POST', { code, orderAmount: 10 }, null);
  });
  await test('UC5-PROMO-EXPIRED', 'Không áp dụng voucher hết hạn', async () => {
    const p = await api('/promotions', 'POST', { code: `QA${randomUUID().slice(0, 8)}`, name: 'QA hết hạn', discountPercent: 10, endDate: '2020-01-01' }); await rejected('/promotions/apply', 'POST', { code: p.code, orderAmount: 1000000 }, null);
  });
  await test('UC5-MAINTENANCE', 'Lên lịch bảo trì, broadcast tới đúng học viên và đánh dấu đã đọc', async () => {
    const e = await api('/equipment', 'POST', { name: 'QA Reformer', type: 'Reformer', serialNumber: `QA-${randomUUID()}` }); await api(`/equipment/${e.id}`, 'PATCH', { status: 'maintenance', nextMaintenanceDate: '2027-01-01' }); assert.equal((await api(`/equipment/${e.id}`)).status, 'maintenance');
    const title = `QA bảo trì ${randomUUID()}`; const b = await api('/notifications/broadcast', 'POST', { title, message: 'QA maintenance', equipmentName: 'QA Reformer' }); assert.ok(b.count > 0);
    for (const actor of ['member', 'member2']) { const n = (await api('/notifications?limit=100', 'GET', undefined, actor)).find(v => v.title === title || v.title.includes(title)); assert.ok(n, `${actor} không nhận được thông báo`); await api(`/notifications/${n.id}/read`, 'PATCH', {}, actor); assert.equal((await repo('Notification').findOneBy({ id: n.id })).isRead, true); }
  });

  await test('UC6-DASHBOARD', 'Dashboard trả KPI dạng số hữu hạn', async () => { const d = await api('/reports/dashboard'); assert.ok(d && typeof d === 'object'); assert.ok(Object.keys(d).length > 0); for (const [key, value] of Object.entries(d)) if (typeof value === 'number') assert.ok(Number.isFinite(value), key); });
  await test('UC6-YEAR', 'Báo cáo năm đối chiếu doanh thu với DB, đủ 12 tháng', async () => {
    const year = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));
    for (const y of [year, year - 1]) { const d = await api(`/reports/yearly?year=${y}`); assert.equal(d.monthlyData.length, 12); const [{ total }] = await db.query('SELECT COALESCE(SUM(final_amount),0) AS total FROM transactions WHERE payment_status = $1 AND EXTRACT(YEAR FROM created_at) = $2', ['completed', y]); assert.equal(Number(d.totalYearRevenue), Number(total)); }
  });
  await test('UC6-YEAR-INVALID', 'Chặn năm báo cáo không hợp lệ', () => rejected('/reports/yearly?year=bad', 'GET', undefined));
  await test('UC6-MEMBER-DENIED', 'Hội viên không truy cập báo cáo doanh thu', () => rejected('/reports/yearly?year=2026', 'GET', undefined, 'member', [403]));

  await test('UC7-USERS-CRUD', 'Admin thêm/sửa/khóa/mở tài khoản và đổi vai trò', async () => {
    const u = await api('/users', 'POST', { fullName: 'QA tài khoản', email: `user-${randomUUID()}@qa.invalid`, password: 'User@12345', role: 'receptionist' });
    await api(`/users/${u.id}`, 'PATCH', { fullName: 'QA đã sửa', isActive: false }); assert.equal((await api(`/users/${u.id}`)).isActive, false);
    await rejected('/auth/login', 'POST', { email: u.email, password: 'User@12345' }, null, [401]); await api(`/users/${u.id}`, 'PATCH', { isActive: true, role: 'instructor' }); assert.equal((await login(u.email, 'User@12345')).user.role, 'instructor');
  });
  for (const actor of ['member', 'coach', 'staff']) await test(`UC7-USERS-DENIED-${actor}`, `${actor} không được xem danh sách người dùng`, () => rejected('/users', 'GET', undefined, actor, [403]));
  await test('UC7-MEMBER-WRITE-DENIED', 'Hội viên không được tạo lớp/phòng/gói hoặc broadcast', async () => {
    for (const url of ['/classes', '/rooms', '/packages', '/notifications/broadcast']) await rejected(url, 'POST', {}, 'member', [403]);
  });
  await test('UC7-BOOKING-OWNER', 'Hội viên không được hủy booking của người khác', async () => {
    const s = await schedule(); const b = await api('/bookings', 'POST', { memberId: fixtures.member2.member.id, scheduleId: s.id }, 'staff'); await rejected(`/bookings/${b.id}/cancel`, 'PATCH', { reason: 'QA unauthorized' }, 'member', [403, 404]);
  });
  await test('UC7-HEALTH-DATA', 'Hội viên không đọc dữ liệu sức khỏe qua danh sách booking', async () => {
    const s = await schedule(); const m = await newMember(); await assign(m.member); await repo('Member').update(m.member.id, { healthNotes: 'QA confidential health note' }); await api('/bookings', 'POST', { memberId: m.member.id, scheduleId: s.id }, 'staff');
    const r = await raw('/bookings?limit=100', 'GET', undefined, 'member'); if ([403, 404].includes(r.status)) return; assert.equal(r.status, 200); assert.ok(!JSON.stringify(r.body).includes('QA confidential health note'), 'Booking list lộ healthNotes của học viên khác');
  });
  await test('UC7-HASH-LEAK', 'API booking không lộ passwordHash/refreshTokenHash của tài khoản', async () => { const d = await api('/bookings?limit=100', 'GET', undefined, 'member'); assert.ok(!JSON.stringify(d).includes('passwordHash'), 'Payload chứa passwordHash'); assert.ok(!JSON.stringify(d).includes('refreshTokenHash'), 'Payload chứa refreshTokenHash'); });
  await test('UC7-DISABLE-TOKEN', 'Khóa tài khoản vô hiệu hóa access token đang dùng', async () => {
    const m = await newMember(); await api(`/users/${m.user.id}`, 'PATCH', { isActive: false }); await rejected('/auth/me', 'GET', undefined, m, [401, 403]);
  });
  await test('UC7-CONFIG-PERSIST', 'Cấu hình hệ thống lưu được và đọc lại đúng', async () => {
    await api('/system/config', 'PATCH', { studioName: 'QA tên mới', cancelHoursLimit: 4 }); const d = await api('/system/config'); assert.equal(d.studioName, 'QA tên mới'); assert.equal(d.cancelHoursLimit, 4);
  });
  await test('UC7-LOGS', 'Nhật ký chứa sự kiện cập nhật cấu hình', async () => { const d = await api('/system/logs?limit=100'); assert.ok(d.items.some(v => v.action === 'CONFIG_UPDATE')); });
  await test('UC7-BACKUP-ARTIFACT', 'Backup trả bản sao lưu có tệp thực tế', async () => {
    const d = await api('/system/backup', 'POST', {}); assert.equal(d.status, 'completed'); const file = d.path || d.filePath || path.join(root, 'backend/backups', d.filename || 'missing'); assert.ok(fs.existsSync(file), 'API báo completed nhưng không có tệp backup thực tế');
  });
  await test('UC7-RESTORE-INVALID', 'Chặn khôi phục backup không tồn tại', () => rejected('/system/restore/QA_DOES_NOT_EXIST', 'POST', {}, 'admin', [404]));
  await test('UC7-PAGINATION', 'Phân trang 1-2 không trùng dữ liệu; tổng khớp DB', async () => {
    const a = await api('/users?page=1&limit=2'), b = await api('/users?page=2&limit=2'); assert.equal(a.items.length, 2); assert.equal(b.items.length, 2); assert.ok(!a.items.some(v => b.items.some(w => w.id === v.id))); assert.equal(a.total, await repo('User').count());
  });
  for (const query of ['page=0', 'limit=101', 'order=invalid']) await test(`UC7-PAGINATION-${query}`, `Chặn phân trang sai ${query}`, () => rejected(`/users?${query}`, 'GET', undefined));
  await test('UC7-SORT-INVALID', 'Sort sai trả 400, không lỗi 500', () => rejected('/users?sort=doesNotExist', 'GET', undefined));
  for (const endpoint of ['/members/bad-id', '/schedules/bad-id', '/classes/bad-id', '/transactions/bad-id']) await test(`UC7-ID-${endpoint}`, `${endpoint}: ID sai không gây 500`, () => rejected(endpoint, 'GET', undefined, 'admin', [400, 404]));

  await test('UC2-CONCURRENT-SAME-MEMBER', 'Hai request cùng học viên chỉ tạo một booking và trừ một buổi', async () => {
    const m = await newMember(); const mp = await assign(m.member); const s = await schedule();
    const responses = await Promise.all([raw(`/schedules/${s.id}/book`, 'POST', undefined, m), raw(`/schedules/${s.id}/book`, 'POST', undefined, m)]);
    assert.equal(responses.filter(r => r.status === 201).length, 1); assert.equal(await repo('Booking').countBy({ scheduleId: s.id, status: 'confirmed' }), 1);
    assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 9);
  });
  await test('UC2-CHECKIN-CONCURRENT', 'Check-in đồng thời chỉ ghi một lượt và không trừ thêm buổi', async () => {
    const m = await newMember(); const mp = await assign(m.member); const s = await schedule(); await api(`/schedules/${s.id}/book`, 'POST', undefined, m);
    const responses = await Promise.all([raw('/check-ins/manual', 'POST', { memberId: m.member.id, scheduleId: s.id }, 'staff'), raw('/check-ins/manual', 'POST', { memberId: m.member.id, scheduleId: s.id }, 'staff')]);
    assert.equal(responses.filter(r => r.status === 201).length, 1); assert.equal(await repo('CheckIn').countBy({ memberId: m.member.id, scheduleId: s.id }), 1);
    assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 9);
  });
  await test('UC2-LAST-SESSION-CANCEL', 'Đặt buổi cuối rồi hủy sớm hoàn lại đúng một buổi', async () => {
    const m = await newMember(); const mp = await assign(m.member, { remainingSessions: 1 }); const s = await schedule(); await api(`/schedules/${s.id}/book`, 'POST', undefined, m);
    assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 0); await api(`/schedules/${s.id}/book`, 'DELETE', undefined, m); assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 1);
  });
  await test('UC4-CONFIRM-IDEMPOTENT', 'Hai xác nhận thanh toán đồng thời chỉ cấp một gói', async () => {
    const m = await newMember(); const tx = await api('/transactions', 'POST', { memberId: m.member.id, branchId: fixtures.branch.id, packageId: fixtures.pkg.id, amount: 1000000, finalAmount: 1000000, paymentMethod: 'bank_transfer', paymentStatus: 'pending' }, 'staff');
    await Promise.all([api(`/transactions/${tx.id}/confirm`, 'POST', {}, 'staff'), api(`/transactions/${tx.id}/confirm`, 'POST', {}, 'staff')]);
    assert.equal(await repo('MemberPackage').countBy({ transactionId: tx.id }), 1);
  });
  await test('UC4-PURCHASE-PENDING', 'Yêu cầu mua online không tự xác nhận tiền hoặc cấp gói', async () => {
    const m = await newMember(); const r = await api('/members/me/packages', 'POST', { packageId: fixtures.pkg.id, paymentMethod: 'bank_transfer' }, m);
    assert.equal(r.status, 'pending'); assert.equal((await repo('Transaction').findOneBy({ id: r.transactionId })).paymentStatus, 'pending'); assert.equal(await repo('MemberPackage').countBy({ memberId: m.member.id }), 0);
    await api(`/transactions/${r.transactionId}/confirm`, 'POST', {}, 'staff'); assert.equal(await repo('MemberPackage').countBy({ memberId: m.member.id }), 1);
  });
  await test('UC4-PURCHASE-VOUCHER-SERVER', 'Server tính voucher hợp lệ, không tin giá client gửi', async () => {
    const code = `QA${randomUUID().slice(0,8)}`; await api('/promotions', 'POST', { code, name: 'QA voucher', discountPercent: 10 }); const m = await newMember();
    const r = await api('/members/me/packages', 'POST', { packageId: fixtures.pkg.id, voucherCode: code, finalAmount: 1, discountAmount: 999999 }, m);
    assert.equal(r.finalAmount, 900000); assert.equal(r.discountAmount, 100000);
  });
  await test('UC2-SCHEDULE-PRIVACY', 'Lịch xem bởi hội viên không lộ sức khỏe hoặc mật khẩu người khác', async () => {
    const d = await api('/schedules', 'GET', undefined, 'member'); assert.ok(!JSON.stringify(d).includes('QA confidential health note')); assert.ok(!JSON.stringify(d).includes('passwordHash'));
  });
  await test('UC6-PERFORMANCE-REAL', 'Báo cáo HLV/phòng/gói lấy đúng fixture trong database', async () => {
    const year = new Date().getFullYear(); const d = await api(`/reports/yearly?year=${year}`); assert.ok(d.instructorPerformance.some(v => v.name === fixtures.coach.user.fullName));
    assert.ok(d.roomUtilization.some(v => v.name === fixtures.room.name)); assert.ok(d.packageDistribution.some(v => v.name === fixtures.pkg.name));
    assert.ok(d.instructorPerformance.every(v => Number.isFinite(v.hours) && Number.isFinite(v.students))); assert.ok(d.roomUtilization.every(v => Number.isFinite(v.occupancy)));
  });
  await test('UC7-BACKUP-RESTORE-ROUNDTRIP', 'Backup -> sửa/xóa dữ liệu test -> restore phục hồi đủ dữ liệu và cấu hình', async () => {
    const m = await newMember(); const original = await repo('User').findOneBy({ id: m.user.id }); const count = await repo('Member').count();
    const originalConfig = await api('/system/config'); const backup = await api('/system/backup', 'POST', {});
    await repo('User').update(m.user.id, { fullName: 'QA changed after backup' }); await repo('Member').delete(m.member.id); await api('/system/config', 'PATCH', { studioName: 'QA changed after backup' });
    await api(`/system/restore/${backup.backupId}`, 'POST', {});
    assert.equal((await repo('User').findOneBy({ id: m.user.id })).fullName, original.fullName); assert.equal(await repo('Member').count(), count); assert.ok(await repo('Member').findOneBy({ id: m.member.id })); assert.equal((await api('/system/config')).studioName, originalConfig.studioName);
    await login(m.user.email, 'Member@123');
  });
  await test('UC7-BACKUP-DOWNLOAD', 'Admin tải được bản backup đầy đủ; hội viên bị chặn', async () => {
    const backups = await api('/system/backups'); assert.ok(backups.length > 0); const url = `/system/backups/${backups[0].backupId}/download`;
    const d = await api(url); assert.equal(d.version, 1); assert.ok(d.tables.users.length > 0); await rejected(url, 'GET', undefined, 'member', [403]);
  });
  await test('UC7-BACKUP-PATH-TRAVERSAL', 'ID backup chứa đường dẫn không được đọc file tùy ý', () => rejected('/system/restore/..%5C..%5C.env', 'POST', {}, 'admin', [404]));
  await test('UC2-SCHEDULE-CONCURRENT', 'Tạo lịch đồng thời không tạo hai ca trùng phòng/HLV', async () => {
    const b = scheduleBody(); const responses = await Promise.all([raw('/schedules', 'POST', b), raw('/schedules', 'POST', b)]);
    assert.equal(responses.filter(r => r.status === 201).length, 1); assert.equal(await repo('ClassSchedule').countBy({ startTime: new Date(b.startTime), roomId: b.roomId }), 1);
  });
  await test('UC2-STUDIO-CANCEL-REFUND', 'Phòng tập hủy lớp phải hủy booking và hoàn đúng buổi', async () => {
    const m = await newMember(); const mp = await assign(m.member); const s = await schedule(); const b = await api(`/schedules/${s.id}/book`, 'POST', undefined, m);
    await api(`/schedules/${s.id}`, 'DELETE'); assert.equal((await repo('Booking').findOneBy({ id: b.bookingId })).status, 'cancelled'); assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 10);
    await api(`/schedules/${s.id}`, 'DELETE'); assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 10);
  });
  await test('UC2-CANCEL-POLICY', 'Hủy trễ áp dụng số giờ đã lưu trong cấu hình', async () => {
    await api('/system/config', 'PATCH', { cancelHoursLimit: 4 }); const m = await newMember(); const mp = await assign(m.member); const s = await schedule(); await api(`/schedules/${s.id}/book`, 'POST', undefined, m);
    await repo('ClassSchedule').update(s.id, { startTime: new Date(Date.now() + 3 * 3600000), endTime: new Date(Date.now() + 4 * 3600000) }); await api(`/schedules/${s.id}/book`, 'DELETE', undefined, m);
    assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 9); await api('/system/config', 'PATCH', { cancelHoursLimit: 2 });
  });
  await test('UC4-PAY-ROLLBACK', 'Gói ngừng hoạt động không để lại giao dịch hoàn tất', async () => {
    const m = await newMember(); const p = await save('Package', { name: 'QA inactive', type: 'session_based', price: 1000000, totalSessions: 10, isActive: false });
    await rejected('/transactions', 'POST', { memberId: m.member.id, branchId: fixtures.branch.id, packageId: p.id, amount: 1000000, finalAmount: 1000000, paymentMethod: 'cash' }, 'staff'); assert.equal(await repo('Transaction').countBy({ memberId: m.member.id }), 0);
  });
  await test('UC7-RESTORE-ROLLBACK', 'Backup lỗi ràng buộc phải rollback toàn bộ dữ liệu hiện tại', async () => {
    const m = await newMember(); const backup = await api('/system/backup', 'POST', {}); const snapshot = JSON.parse(fs.readFileSync(backup.filePath, 'utf8')); snapshot.tables.users.push(snapshot.tables.users[0]); fs.writeFileSync(backup.filePath, JSON.stringify(snapshot));
    await repo('User').update(m.user.id, { fullName: 'QA must survive failed restore' }); const count = await repo('User').count(); await rejected(`/system/restore/${backup.backupId}`, 'POST', {});
    assert.equal(await repo('User').count(), count); assert.equal((await repo('User').findOneBy({ id: m.user.id })).fullName, 'QA must survive failed restore');
  });
}
async function main() {
  fs.mkdirSync(reportDir, { recursive: true });
  const conn = { host: process.env.QA_DB_HOST || process.env.DB_HOST || '127.0.0.1', port: Number(process.env.QA_DB_PORT || process.env.DB_PORT || 5433), user: process.env.QA_DB_USER || process.env.DB_USERNAME || process.env.DB_USER || 'pilates', password: process.env.QA_DB_PASSWORD || process.env.DB_PASSWORD || 'pilates123', database: 'postgres', connectionTimeoutMillis: 10000 };
  control = new Client(conn); await control.connect();
  await control.query(`CREATE DATABASE "${database}"`); created = true;
  Object.assign(process.env, { DB_HOST: conn.host, DB_PORT: String(conn.port), DB_USER: conn.user, DB_USERNAME: conn.user, DB_PASSWORD: conn.password, DB_NAME: database, DB_SYNC: 'true', DB_LOGGING: 'false' });
  process.env.QA_STORAGE_DIR = path.join(reportDir, 'storage');
  const { AppModule } = require(path.join(root, 'backend/dist/app.module'));
  app = await NestFactory.create(AppModule, { logger: ['error'] });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  const { TransformInterceptor } = require(path.join(root, 'backend/dist/common/interceptors/transform.interceptor'));
  const { HttpExceptionFilter } = require(path.join(root, 'backend/dist/common/filters/http-exception.filter'));
  app.useGlobalInterceptors(new TransformInterceptor()); app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, '127.0.0.1'); db = app.get(DataSource); base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
  console.log(`QA on real PostgreSQL ${conn.host}:${conn.port}; temporary database ${database}`);
  await initializeFixtures();
  if (process.argv.includes('--serve')) {
    app.enableCors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8081'], credentials: true });
    await schedule();
    fs.writeFileSync(path.join(reportDir, 'ui-server.json'), JSON.stringify({ base, stopFile: path.join(reportDir, 'stop-ui') }));
    console.log(`UI QA READY ${base}`);
    await new Promise(resolve => { const timer = setInterval(() => { if (fs.existsSync(path.join(reportDir, 'stop-ui'))) { clearInterval(timer); resolve(); } }, 1000); });
    return;
  }
  if (!process.argv.includes('--skip-legacy')) {
    await schedule();
    await runLegacy('test-admin-crud.js'); await runLegacy('test-usecases.js');
    const tables = db.entityMetadatas.map(m => `"${m.tableName.replaceAll('"', '""')}"`).join(',');
    await db.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`); await initializeFixtures();
  }
  await suite();
}
(async () => {
  let fatal;
  try { await main(); } catch (e) { fatal = e.message; console.error('QA SETUP FAILED:', e.message); process.exitCode = 2; }
  finally {
    try { if (app) await app.close(); if (created && /^qa_pilates_[a-f0-9]{32}$/.test(database)) { await control.query(`DROP DATABASE "${database}"`); dropped = true; } if (control) await control.end(); }
    catch (e) { fatal = `${fatal || ''} Cleanup: ${e.message}`; process.exitCode = 2; }
    fs.mkdirSync(reportDir, { recursive: true });
    const report = { testedAt: new Date().toISOString(), environment: 'Actual NestJS HTTP routes + PostgreSQL, freshly built dist; isolated temporary database', database, databaseDropped: dropped, legacy, passed: results.filter(r => r.status === 'PASS').length, failed: results.filter(r => r.status === 'FAIL').length, total: results.length, fatal, results };
    fs.writeFileSync(path.join(reportDir, 'integration-results.json'), JSON.stringify(report, null, 2));
    console.log(`TOTAL ${report.passed}/${report.total} PASS, ${report.failed} FAIL${fatal ? '; SETUP/CLEANUP ERROR' : ''}`);
    if ((report.failed || legacy.some(r => r.failed || r.exitCode !== 0)) && !process.exitCode) process.exitCode = 1;
  }
})();
