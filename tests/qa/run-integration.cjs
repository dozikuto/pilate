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
function recurringBody(offset = 0, changes = {}) {
  const first = new Date(dateBase.getTime() + (260 + offset) * 86400000);
  while (first.getUTCDay() !== 1) first.setUTCDate(first.getUTCDate() + 1);
  return { classId: fixtures.cls.id, instructorId: fixtures.coach.user.id, roomId: fixtures.room.id, maxCapacity: 4,
    startDate: first.toISOString().slice(0, 10), endDate: new Date(first.getTime() + 13 * 86400000).toISOString().slice(0, 10),
    weekdays: [2, 6], startTime: '06:30', endTime: '07:30', ...changes };
}
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
  fixtures.privatePkg = await save('Package', { name: 'QA tập riêng 1:1', type: 'session_based', price: 1500000, totalSessions: 5, durationDays: 60, privateSessionEnabled: true, privateSessionType: 'private_1v1', privateSessionDurationMinutes: 60 });
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
  await test('MEMBER-DETAIL-RELATIONS', 'Chi tiết học viên có đủ gói, lịch đặt và check-in gắn với đúng lớp/HLV', async () => {
    const m = await newMember(); const mp = await assign(m.member); const s = await schedule();
    const booking = await api(`/schedules/${s.id}/book`, 'POST', undefined, m);
    const ci = await save('CheckIn', { memberId: m.member.id, scheduleId: s.id, bookingId: booking.bookingId, checkInTime: new Date(), method: 'manual' });
    const profile = await api(`/members/${m.member.id}`);
    assert.equal(profile.user.fullName, m.user.fullName); assert.equal(profile.memberPackages[0].id, mp.id);
    assert.equal(profile.bookings[0].schedule.class.name, fixtures.cls.name);
    assert.equal(profile.bookings[0].schedule.instructor.id, fixtures.coach.user.id);
    const checkIn = profile.checkIns.find(v => v.id === ci.id); assert.equal(checkIn.schedule.class.name, fixtures.cls.name);
    assert.ok(!('passwordHash' in profile.user));
    await rejected(`/members/${m.member.id}`, 'GET', undefined, 'member2', [403]);
  });
  await test('WEEKLY-CREATE-PREVIEW', 'Xem trước đúng Thứ 3/Thứ 7 theo giờ Việt Nam và không ghi dữ liệu', async () => {
    const body = recurringBody(); const before = await repo('ClassSchedule').count();
    const preview = await api('/schedules/recurring/preview', 'POST', body, 'admin', 200);
    assert.equal(preview.totalCount, 4); assert.equal(preview.conflictCount, 0);
    assert.deepEqual(preview.occurrences.map(v => new Date(`${v.date}T00:00:00Z`).getUTCDay()), [2, 6, 2, 6]);
    assert.equal(new Date(preview.occurrences[0].startTime).toISOString().slice(11, 16), '23:30');
    assert.equal(await repo('ClassSchedule').count(), before);
    const result = await api('/schedules/recurring', 'POST', body);
    assert.equal(result.createdCount, 4);
    for (const item of result.schedules) {
      const row = await repo('ClassSchedule').findOneBy({ id: item.id });
      assert.equal(row.isRecurring, true); assert.deepEqual(JSON.parse(row.recurringRule).weekdays, [2, 6]);
      assert.equal(row.maxCapacity, 4);
    }
  });
  await test('WEEKLY-CREATE-CONFLICT-ROLLBACK', 'Báo ngày trùng phòng/HLV và không tạo dở dang các ngày khác', async () => {
    const body = recurringBody(21); const firstPreview = await api('/schedules/recurring/preview', 'POST', body);
    const collision = firstPreview.occurrences[2];
    await schedule({ startTime: collision.startTime, endTime: collision.endTime });
    const before = await repo('ClassSchedule').count();
    const preview = await api('/schedules/recurring/preview', 'POST', body);
    assert.equal(preview.conflictCount, 1);
    assert.deepEqual(preview.occurrences[2].conflicts.sort(), ['Trùng lịch HLV', 'Trùng phòng tập'].sort());
    await rejected('/schedules/recurring', 'POST', body);
    assert.equal(await repo('ClassSchedule').count(), before);
  });
  await test('WEEKLY-CREATE-COACH-CONFLICT', 'Trùng HLV ở phòng khác vẫn bị chặn', async () => {
    const body = recurringBody(42); const preview = await api('/schedules/recurring/preview', 'POST', body);
    await schedule({ startTime: preview.occurrences[0].startTime, endTime: preview.occurrences[0].endTime, roomId: fixtures.room2.id, maxCapacity: 1 });
    const after = await api('/schedules/recurring/preview', 'POST', body);
    assert.deepEqual(after.occurrences[0].conflicts, ['Trùng lịch HLV']);
    await rejected('/schedules/recurring', 'POST', body);
  });
  await test('WEEKLY-CREATE-CONCURRENT', 'Hai lần tạo đồng thời chỉ tạo một chuỗi lịch', async () => {
    const body = recurringBody(63); const before = await repo('ClassSchedule').count();
    const responses = await Promise.all([raw('/schedules/recurring', 'POST', body), raw('/schedules/recurring', 'POST', body)]);
    assert.deepEqual(responses.map(v => v.status).sort(), [201, 400]);
    assert.equal(await repo('ClassSchedule').count(), before + 4);
  });
  await test('WEEKLY-CREATE-VALIDATION', 'Chặn khoảng ngày, thứ, giờ và số lượng lịch không hợp lệ', async () => {
    const body = recurringBody(84);
    const endTooFar = new Date(Date.parse(body.startDate) + 366 * 86400000).toISOString().slice(0, 10);
    const manyDays = new Date(Date.parse(body.startDate) + 104 * 86400000).toISOString().slice(0, 10);
    for (const changes of [{ weekdays: [] }, { weekdays: [2, 2] }, { weekdays: [7] }, { weekdays: [-1] },
      { startDate: '2027-02-30' }, { endDate: '2000-01-01' }, { endDate: endTooFar },
      { endDate: body.startDate }, { startTime: '25:00' }, { endTime: '06:00' },
      { weekdays: [0, 1, 2, 3, 4, 5, 6], endDate: manyDays }]) {
      for (const endpoint of ['/schedules/recurring/preview', '/schedules/recurring']) await rejected(endpoint, 'POST', { ...body, ...changes });
    }
  });
  await test('WEEKLY-CREATE-ROLES', 'Admin/lễ tân được tạo, HLV và học viên bị chặn', async () => {
    const body = recurringBody(105);
    for (const actor of ['member', 'coach']) for (const endpoint of ['/schedules/recurring/preview', '/schedules/recurring']) await rejected(endpoint, 'POST', body, actor, [403]);
    await api('/schedules/recurring/preview', 'POST', body, 'staff', 200);
    const result = await api('/schedules/recurring', 'POST', body, 'staff'); assert.equal(result.createdCount, 4);
  });
  await test('WEEKLY-CREATE-RESOURCES', 'Xem trước và tạo đều chặn phòng/HLV/lớp/sức chứa sai', async () => {
    const body = recurringBody(126);
    for (const changes of [{ classId: randomUUID() }, { instructorId: fixtures.member.user.id }, { roomId: randomUUID() }, { maxCapacity: 1000 }]) {
      for (const endpoint of ['/schedules/recurring/preview', '/schedules/recurring']) await rejected(endpoint, 'POST', { ...body, ...changes }, 'admin', [400, 404]);
    }
  });
  await test('PACKAGE-BOOK-FIVE', 'Gói 5 buổi chọn 5 lịch, trừ đúng gói và đồng bộ hai vai trò', async () => {
    const m = await newMember();
    const pkg = await save('Package', { name: 'QA 5 buổi', type: 'session_based', price: 500000, totalSessions: 5, durationDays: 180 });
    const mp = await assign(m.member, { packageId: pkg.id, remainingSessions: 5 });
    const other = await assign(m.member);
    const schedules = []; for (let i = 0; i < 5; i++) schedules.push(await schedule());
    const result = await api('/bookings/package-schedules', 'POST', { memberPackageId: mp.id, scheduleIds: schedules.map(s => s.id) }, m, 201);
    assert.equal(result.bookedCount, 5); assert.equal(result.remainingSessions, 0);
    assert.equal((await repo('MemberPackage').findOneBy({ id: other.id })).remainingSessions, 10);
    for (const s of schedules) {
      const b = await repo('Booking').findOneBy({ scheduleId: s.id, memberId: m.member.id });
      assert.equal(b.memberPackageId, mp.id); assert.equal(b.sessionDeducted, true); assert.equal(b.status, 'confirmed');
      const filter = `?startDate=${encodeURIComponent(s.startTime)}&endDate=${encodeURIComponent(s.endTime)}`;
      const learner = (await api('/schedules' + filter, 'GET', undefined, m)).find(v => v.id === s.id);
      assert.equal(learner.isBooked, true); assert.equal(learner.bookedMemberPackageId, mp.id); assert.equal(learner.bookings, undefined);
      const admin = (await api('/schedules' + filter)).find(v => v.id === s.id);
      assert.ok(admin.bookings.some(v => v.memberPackageId === mp.id));
      assert.equal(admin.bookings.find(v => v.id === b.id)?.spotNumber, b.spotNumber);
    }
    const mine = (await api('/members/me/packages', 'GET', undefined, m)).find(p => p.id === mp.id);
    assert.equal(mine.remainingSessions, 0); assert.equal(mine.usedSessions, 5);
    await api(`/schedules/${schedules[0].id}/book`, 'DELETE', undefined, m);
    assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 1);
  });
  await test('SCHEDULE-SPOT-SYNC', 'Admin nhận đúng chỗ, tên và sĩ số sau khi đặt/hủy/điểm danh', async () => {
    const first = await newMember({ fullName: 'QA Chỗ số 2' }); const second = await newMember({ fullName: 'QA Chỗ số 4' });
    await assign(first.member); await assign(second.member); const s = await schedule({ maxCapacity: 4 });
    const b1 = await api('/bookings', 'POST', { memberId: first.member.id, scheduleId: s.id, spotNumber: 2 }, first);
    const b2 = await api('/bookings', 'POST', { memberId: second.member.id, scheduleId: s.id, spotNumber: 4 }, second);
    const filter = `?startDate=${encodeURIComponent(s.startTime)}&endDate=${encodeURIComponent(s.endTime)}`;
    let admin = (await api('/schedules' + filter)).find(v => v.id === s.id);
    assert.equal(admin.currentEnrolled, 2); assert.deepEqual(admin.bookings.map(b => b.spotNumber).sort(), [2, 4]);
    assert.equal(admin.bookings.find(b => b.id === b2.id).member.user.fullName, 'QA Chỗ số 4');
    await api(`/bookings/${b1.id}/cancel`, 'PATCH', {}, first);
    admin = (await api('/schedules' + filter)).find(v => v.id === s.id);
    assert.equal(admin.currentEnrolled, 1); assert.deepEqual(admin.bookings.map(b => b.spotNumber), [4]);
    await repo('Booking').update(b2.id, { status: 'attended' });
    admin = (await api('/schedules' + filter)).find(v => v.id === s.id);
    assert.equal(admin.bookings[0].status, 'attended'); assert.equal(admin.bookings[0].spotNumber, 4);
    const learner = (await api('/schedules' + filter, 'GET', undefined, first)).find(v => v.id === s.id);
    assert.equal(learner.bookings, undefined);
  });
  await test('PACKAGE-BOOK-OVER-QUOTA', 'Không đủ buổi phải rollback cả booking, sĩ số và số dư', async () => {
    const m = await newMember(); const mp = await assign(m.member, { remainingSessions: 2 });
    const ss = [await schedule(), await schedule(), await schedule()];
    await rejected('/bookings/package-schedules', 'POST', { memberPackageId: mp.id, scheduleIds: ss.map(s => s.id) }, m);
    assert.equal(await repo('Booking').countBy({ memberId: m.member.id }), 0);
    assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 2);
    for (const s of ss) assert.equal((await repo('ClassSchedule').findOneBy({ id: s.id })).currentEnrolled, 0);
  });
  await test('PACKAGE-BOOK-VALIDATION', 'Chặn lịch trùng ID, rỗng, quá 100 buổi, UUID sai và thiếu gói', async () => {
    const m = await newMember(); const mp = await assign(m.member); const s = await schedule();
    for (const scheduleIds of [[], [s.id, s.id], ['bad-id'], Array.from({ length: 101 }, () => randomUUID())])
      await rejected('/bookings/package-schedules', 'POST', { memberPackageId: mp.id, scheduleIds }, m);
    await rejected('/bookings/package-schedules', 'POST', { scheduleIds: [s.id] }, m);
    await rejected('/bookings/package-schedules', 'POST', { memberPackageId: randomUUID(), scheduleIds: [s.id] }, m);
    assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 10);
  });
  await test('PACKAGE-BOOK-OWNERSHIP', 'Không dùng gói người khác và không cho khách/HLV gọi API học viên', async () => {
    const m = await newMember(); const mp = await assign(m.member); const s = await schedule();
    const body = { memberPackageId: mp.id, scheduleIds: [s.id] };
    await rejected('/bookings/package-schedules', 'POST', body, 'member2');
    await rejected('/bookings/package-schedules', 'POST', body, null, [401]);
    await rejected('/bookings/package-schedules', 'POST', body, 'coach', [403]);
  });
  await test('PACKAGE-BOOK-FULL-ROLLBACK', 'Một lớp đầy không tạo đặt chỗ hay danh sách chờ cho cả lần chọn', async () => {
    const m = await newMember(); const mp = await assign(m.member); const ss = [await schedule(), await schedule()];
    const occupants = []; for (let i = 0; i < 4; i++) {
      const other = await newMember(); await assign(other.member); occupants.push(other);
      await api(`/schedules/${ss[1].id}/book`, 'POST', undefined, other);
    }
    await rejected('/bookings/package-schedules', 'POST', { memberPackageId: mp.id, scheduleIds: ss.map(s => s.id) }, m);
    assert.equal(await repo('Booking').countBy({ memberId: m.member.id }), 0);
    assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 10);
  });
  await test('PACKAGE-BOOK-OVERLAP', 'Hai buổi trùng giờ không được trừ dở dang', async () => {
    const m = await newMember(); const mp = await assign(m.member); const s = await schedule();
    const sameTime = await save('ClassSchedule', { classId: fixtures.cls.id, roomId: fixtures.room2.id, instructorId: fixtures.coach2.user.id,
      startTime: new Date(s.startTime), endTime: new Date(s.endTime), maxCapacity: 1 });
    await rejected('/bookings/package-schedules', 'POST', { memberPackageId: mp.id, scheduleIds: [s.id, sameTime.id] }, m);
    assert.equal(await repo('Booking').countBy({ memberId: m.member.id }), 0);
    assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 10);
  });
  await test('PACKAGE-BOOK-DATES-STATUS', 'Chặn gói hết hạn, chưa bắt đầu, bị khóa và lịch quá giờ/hủy', async () => {
    const m = await newMember(); const mp = await assign(m.member); const s = await schedule();
    const body = { memberPackageId: mp.id, scheduleIds: [s.id] };
    for (const changes of [{ expiryDate: new Date() }, { startDate: new Date(Date.now() + 86400000) }, { status: 'suspended' }]) {
      const original = await repo('MemberPackage').findOneBy({ id: mp.id });
      await repo('MemberPackage').update(mp.id, changes); await rejected('/bookings/package-schedules', 'POST', body, m);
      await repo('MemberPackage').save(original);
    }
    await repo('ClassSchedule').update(s.id, { status: 'cancelled' });
    await rejected('/bookings/package-schedules', 'POST', body, m);
    await repo('ClassSchedule').update(s.id, { status: 'scheduled', startTime: new Date(Date.now() - 60000) });
    await rejected('/bookings/package-schedules', 'POST', body, m);
    assert.equal(await repo('Booking').countBy({ memberId: m.member.id }), 0);
  });
  await test('PACKAGE-BOOK-TRAINING-CONFIG', 'Tôn trọng tập lớp/tập riêng, tỉ lệ HLV và thời lượng trên mọi đường đặt lịch', async () => {
    const m = await newMember(); const mp = await assign(m.member, { packageId: fixtures.privatePkg.id, remainingSessions: 5 });
    const group = await schedule();
    await rejected('/bookings/package-schedules', 'POST', { memberPackageId: mp.id, scheduleIds: [group.id] }, m);
    await rejected(`/schedules/${group.id}/book`, 'POST', undefined, m);
    const cls = await save('Class', { branchId: fixtures.branch.id, name: 'QA private', type: 'private', defaultMaxCapacity: 1, durationMinutes: 60 });
    const good = await schedule({ classId: cls.id, roomId: fixtures.room2.id, maxCapacity: 1 });
    const wrongDuration = await schedule({ classId: cls.id, roomId: fixtures.room2.id, maxCapacity: 1 });
    await repo('ClassSchedule').update(wrongDuration.id, { endTime: new Date(new Date(wrongDuration.startTime).getTime() + 45 * 60000) });
    await rejected('/bookings/package-schedules', 'POST', { memberPackageId: mp.id, scheduleIds: [wrongDuration.id] }, m);
    const wrongCapacity = await schedule({ classId: cls.id, maxCapacity: 2 });
    await rejected('/bookings/package-schedules', 'POST', { memberPackageId: mp.id, scheduleIds: [wrongCapacity.id] }, m);
    await api('/bookings/package-schedules', 'POST', { memberPackageId: mp.id, scheduleIds: [good.id] }, m);
    assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 4);
  });
  await test('PACKAGE-BOOK-CONCURRENT', 'Hai lần đặt đồng thời không dùng vượt số buổi còn lại', async () => {
    const m = await newMember(); const mp = await assign(m.member, { remainingSessions: 1 }); const ss = [await schedule(), await schedule()];
    const results = await Promise.all(ss.map(s => raw('/bookings/package-schedules', 'POST', { memberPackageId: mp.id, scheduleIds: [s.id] }, m)));
    assert.deepEqual(results.map(r => r.status).sort(), [201, 400]);
    assert.equal(await repo('Booking').countBy({ memberId: m.member.id }), 1);
    assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 0);
  });
  await test('PACKAGE-BOOK-DOUBLE-SUBMIT', 'Gửi lại cùng danh sách không trừ hai lần hay tạo deadlock', async () => {
    const m = await newMember(); const mp = await assign(m.member); const ss = [await schedule(), await schedule()];
    const ids = ss.map(s => s.id);
    const responses = await Promise.all([ids, [...ids].reverse()].map(scheduleIds => raw('/bookings/package-schedules', 'POST', { memberPackageId: mp.id, scheduleIds }, m)));
    assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
    assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 8);
  });
  await test('PACKAGE-BOOK-TIME-BASED', 'Gói theo thời gian vẫn đặt được nhiều lịch mà không trừ số buổi', async () => {
    const m = await newMember(); const pkg = await save('Package', { name: 'QA theo thời gian', type: 'time_based', price: 1000, durationDays: 180 });
    const mp = await assign(m.member, { packageId: pkg.id, remainingSessions: null }); const ss = [await schedule(), await schedule()];
    await api('/bookings/package-schedules', 'POST', { memberPackageId: mp.id, scheduleIds: ss.map(s => s.id) }, m);
    assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, null);
    assert.equal(await repo('Booking').countBy({ memberId: m.member.id, sessionDeducted: false }), 2);
  });
  await test('SCOPE-REMOVED-ENDPOINTS', 'Các API của UC đã gỡ đều trả 404 cho mọi vai trò', async () => {
    const id = fixtures.room.id;
    const retired = [
      ['/branches', 'GET'], ['/branches', 'POST'], [`/branches/${fixtures.branch.id}`, 'PATCH'],
      [`/branches/${fixtures.branch.id}/rooms`, 'POST'], ['/rooms', 'GET'], ['/rooms', 'POST'],
      [`/rooms/${id}`, 'PATCH'], [`/rooms/${id}`, 'DELETE'], [`/rooms/${id}/toggle`, 'PATCH'],
      ['/equipment', 'GET'], ['/equipment', 'POST'], [`/equipment/${id}`, 'PATCH'], [`/equipment/${id}`, 'DELETE'],
      ['/products', 'GET'], ['/products', 'POST'], [`/products/${id}`, 'PATCH'], [`/products/${id}/stock`, 'PATCH'], [`/products/${id}`, 'DELETE'],
      ['/private-sessions', 'GET'], ['/private-sessions', 'POST'], ['/private-sessions/my', 'GET'],
      [`/private-sessions/${id}/status`, 'PATCH'], [`/private-sessions/${id}/cancel`, 'PATCH'], ['/private-sessions/instructors', 'GET'],
      [`/private-sessions/instructors/${fixtures.coach.user.id}/week`, 'GET'], ['/notifications', 'GET'], ['/notifications', 'POST'], ['/notifications/broadcast', 'POST'],
      [`/notifications/${id}/read`, 'PATCH'], ['/notifications/read-all', 'PATCH'], ['/system/logs', 'GET'],
    ];
    for (const actor of ['admin', 'staff', 'coach', 'member']) {
      for (const [url, method] of retired) await rejected(url, method, method === 'GET' ? undefined : {}, actor, [404]);
    }
  });
  await test('SCOPE-SCHEDULE-ROOMS', 'Xếp lịch vẫn đọc được danh mục phòng đang hoạt động', async () => {
    const inactive = await save('Room', { branchId: fixtures.branch.id, name: 'QA phòng ngừng dùng', capacity: 2, isActive: false });
    const closedBranch = await save('Branch', { name: 'QA cơ sở ngừng dùng', address: 'QA', isActive: false });
    const closedRoom = await save('Room', { branchId: closedBranch.id, name: 'QA phòng thuộc cơ sở ngừng dùng', capacity: 2 });
    const rooms = await api('/classes/rooms');
    assert.ok(rooms.some(r => r.id === fixtures.room.id)); assert.ok(!rooms.some(r => r.id === inactive.id));
    assert.ok(!rooms.some(r => r.id === closedRoom.id));
    assert.ok((await api('/classes/rooms', 'GET', undefined, 'member')).some(r => r.id === fixtures.room.id));
    await rejected('/classes/rooms', 'GET', undefined, null, [401]);
    for (const method of ['POST', 'PATCH', 'DELETE']) await rejected('/classes/rooms', method, {}, 'admin', [400, 404]);
  });
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
  await test('UC2-PARALLEL-COACHES-ROOMS', 'Hai HLV khác nhau, hai phòng khác nhau được tạo cùng ngày cùng giờ', async () => {
    const body = scheduleBody();
    const other = { ...body, instructorId: fixtures.coach2.user.id, roomId: fixtures.room2.id, maxCapacity: 1 };
    const responses = await Promise.all([raw('/schedules', 'POST', body), raw('/schedules', 'POST', other)]);
    responses.forEach(r => assert.equal(r.status, 201, JSON.stringify(r.body)));
    const ids = responses.map(r => r.data.id);
    const schedules = (await api('/schedules')).filter(s => ids.includes(s.id));
    assert.equal(schedules.length, 2); assert.equal(schedules[0].startTime, schedules[1].startTime);
    assert.equal(schedules[0].endTime, schedules[1].endTime);
    assert.equal(new Set(schedules.map(s => s.instructorId)).size, 2);
    assert.equal(new Set(schedules.map(s => s.roomId)).size, 2);
  });
  await test('UC2-EDIT-PARALLEL-ROOMS', 'Sửa lịch sang cùng giờ lớp khác được phép khi khác HLV và phòng', async () => {
    const first = await schedule(); const second = await schedule({ instructorId: fixtures.coach2.user.id, roomId: fixtures.room2.id, maxCapacity: 1 });
    await api(`/schedules/${second.id}`, 'PATCH', { startTime: first.startTime, endTime: first.endTime });
    const updated = await api(`/schedules/${second.id}`);
    assert.equal(updated.startTime, first.startTime); assert.equal(updated.endTime, first.endTime);
    assert.equal(updated.instructorId, fixtures.coach2.user.id); assert.equal(updated.roomId, fixtures.room2.id);
  });
  await test('WEEKLY-PARALLEL-COACHES-ROOMS', 'Lịch hàng loạt cùng thứ, cùng giờ được tạo cho nhiều HLV ở các phòng khác nhau', async () => {
    const first = recurringBody(210);
    const second = { ...first, instructorId: fixtures.coach2.user.id, roomId: fixtures.room2.id, maxCapacity: 1 };
    const created = await api('/schedules/recurring', 'POST', first);
    const preview = await api('/schedules/recurring/preview', 'POST', second, 'admin', 200);
    assert.equal(preview.conflictCount, 0); assert.equal(preview.totalCount, created.createdCount);
    const parallel = await api('/schedules/recurring', 'POST', second);
    assert.equal(parallel.createdCount, created.createdCount);
    assert.deepEqual(parallel.schedules.map(s => s.startTime), created.schedules.map(s => s.startTime));
    assert.ok(parallel.schedules.every(s => s.instructorId === second.instructorId && s.roomId === second.roomId));
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
  await test('TEACHING-DATE-ROSTER', 'Lịch dạy đọc đúng ngày Việt Nam, HLV, phòng, học viên và sĩ số thực', async () => {
    const m = await newMember({ fullName: 'QA học viên giảng dạy' }); await assign(m.member); const s = await schedule();
    const booking = await api('/bookings', 'POST', { memberId: m.member.id, scheduleId: s.id }, m);
    const day = new Date(Date.parse(s.startTime) + 7 * 3600000).toISOString().slice(0, 10);
    const rows = await api(`/teaching/schedules?date=${day}`, 'GET', undefined, 'coach');
    const found = rows.find(v => v.id === s.id); assert.ok(found); assert.equal(found.currentEnrolled, 1);
    assert.equal(found.students[0].bookingId, booking.id); assert.equal(found.students[0].memberId, m.member.id);
    assert.equal(found.students[0].fullName, 'QA học viên giảng dạy'); assert.equal(found.attendedCount, 0);
    assert.equal(found.roomName, fixtures.room.name); assert.ok(!JSON.stringify(rows).includes('passwordHash'));
    const empty = await api('/teaching/schedules?date=2000-01-01'); assert.deepEqual(empty, []);
    await rejected('/teaching/schedules?date=invalid', 'GET', undefined);
    await rejected('/teaching/schedules', 'GET', undefined, 'member', [403]);
    await rejected(`/teaching/schedules?instructorId=${fixtures.coach.user.id}`, 'GET', undefined, 'coach2', [403]);
  });
  await test('TEACHING-ATTENDANCE', 'HLV điểm danh ca của mình, lưu check-in và không trừ lại buổi đã đặt', async () => {
    const m = await newMember(); const mp = await assign(m.member); const s = await schedule();
    const b = await api('/bookings', 'POST', { memberId: m.member.id, scheduleId: s.id }, m);
    const body = { memberId: m.member.id, bookingId: b.id };
    await rejected(`/teaching/schedules/${s.id}/check-in`, 'POST', body, 'coach2', [403]);
    assert.equal(await repo('CheckIn').countBy({ bookingId: b.id }), 0);
    await api(`/teaching/schedules/${s.id}/check-in`, 'POST', body, 'coach');
    const persistedCheckIn = await repo('CheckIn').findOneBy({ bookingId: b.id });
    assert.ok(Math.abs(new Date(persistedCheckIn.checkInTime).getTime() - Date.now()) < 5000, 'Thời điểm điểm danh phải đúng thời gian thực');
    assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 9);
    assert.equal((await repo('Booking').findOneBy({ id: b.id })).status, 'attended');
    assert.equal((await repo('Member').findOneBy({ id: m.member.id })).totalSessionsAttended, 1);
    await rejected(`/teaching/schedules/${s.id}/check-in`, 'POST', body, 'coach', [409]);
    const rows = await api('/teaching/schedules', 'GET', undefined, 'coach');
    assert.equal(rows.find(v => v.id === s.id).attendedCount, 1); assert.ok(rows.find(v => v.id === s.id).students[0].checkInTime);
    const students = await api('/teaching/students', 'GET', undefined, 'coach');
    assert.equal(students.find(v => v.id === m.member.id).totalSessionsAttended, 1);
  });
  await test('TEACHING-PLANS-PERSIST', 'Giáo án, điểm thể lực, ghi nhận và phản hồi được đọc lại sau khi sửa', async () => {
    const m = await newMember(); await assign(m.member); const s = await schedule(); await api(`/schedules/${s.id}/book`, 'POST', undefined, m);
    const p = await api('/teaching/workout-plans', 'POST', { memberId: m.member.id, scheduleId: s.id, title: 'Giáo án thực', exercises: 'Footwork\nPelvic Curl', coreScore: 8.5, flexibilityScore: 7, progressNotes: 'Tư thế tốt', feedback: 'Tập thở mỗi ngày' }, 'coach');
    assert.equal(p.coreScore, 8.5); assert.equal(p.memberName, m.user.fullName); assert.equal(p.className, fixtures.cls.name);
    assert.ok(Math.abs(Date.parse(p.createdAt) - Date.now()) < 5000, 'Ngày tạo giáo án phải đúng thời gian thực');
    await api(`/teaching/workout-plans/${p.id}`, 'PATCH', { exercises: 'Footwork 12 lần', coreScore: 9, flexibilityScore: null }, 'coach');
    const list = await api(`/teaching/workout-plans?memberId=${m.member.id}`, 'GET', undefined, 'coach');
    assert.equal(list[0].coreScore, 9); assert.equal(list[0].flexibilityScore, null); assert.equal(list[0].exercises, 'Footwork 12 lần');
    assert.ok(Math.abs(Date.parse(list[0].updatedAt) - Date.now()) < 5000, 'Ngày cập nhật giáo án phải đúng thời gian thực');
    const students = await api('/teaching/students', 'GET', undefined, 'coach');
    assert.equal(students.find(v => v.id === m.member.id).lastProgress.coreScore, 9);
    assert.equal(students.find(v => v.id === m.member.id).lastFeedback.feedback, 'Tập thở mỗi ngày');
    const mine = await api(`/teaching/students/${m.member.id}/progress`, 'GET', undefined, m);
    assert.equal(mine[0].id, p.id); assert.ok(!JSON.stringify(mine).includes('passwordHash'));
    await rejected(`/teaching/students/${m.member.id}/progress`, 'GET', undefined, 'member2', [403]);
    await rejected(`/teaching/workout-plans/${p.id}`, 'PATCH', { feedback: 'Sửa trái phép' }, 'coach2', [403]);
    const otherList = await api('/teaching/workout-plans', 'GET', undefined, 'coach2'); assert.ok(!otherList.some(v => v.id === p.id));
    for (const score of [-1, 11, 7.55]) await rejected(`/teaching/workout-plans/${p.id}`, 'PATCH', { coreScore: score }, 'coach');
    for (const field of ['memberId', 'instructorId', 'title']) await rejected(`/teaching/workout-plans/${p.id}`, 'PATCH', { [field]: null }, 'coach');
    await rejected('/teaching/workout-plans', 'POST', { memberId: m.member.id, title: 'Sai ca', scheduleId: randomUUID() }, 'coach', [404]);
    const outsider = await newMember(); await rejected('/teaching/workout-plans', 'POST', { memberId: outsider.member.id, title: 'Chưa được phân công' }, 'coach', [403]);
  });
  await test('UC3-STATUS', 'HLV bắt đầu/kết thúc ca và trạng thái được lưu', async () => { const s = await schedule(); await api(`/schedules/${s.id}`, 'PATCH', { status: 'in_progress' }, 'coach'); assert.equal((await api(`/schedules/${s.id}`)).status, 'in_progress'); await api(`/schedules/${s.id}`, 'PATCH', { status: 'completed' }, 'coach'); assert.equal((await api(`/schedules/${s.id}`)).status, 'completed'); });
  await test('UC3-STATUS-INVALID', 'Chặn trạng thái ca không hợp lệ, không lỗi 500', async () => { const s = await schedule(); await rejected(`/schedules/${s.id}`, 'PATCH', { status: 'garbage' }, 'coach'); });
  await test('UC3-OTHER-COACH', 'HLV không được sửa ca của HLV khác', async () => { const s = await schedule(); await rejected(`/schedules/${s.id}`, 'PATCH', { status: 'completed' }, 'coach2', [403]); });
  await test('UC3-PROGRESS', 'Giáo án, tiến độ và phản hồi đọc lại đúng', async () => {
    const p = await api('/teaching/workout-plans', 'POST', { memberId: fixtures.member.member.id, title: 'QA giáo án', exercises: 'Footwork', progressNotes: 'QA ban đầu' }, 'coach');
    await api(`/teaching/workout-plans/${p.id}/progress`, 'PATCH', { progressNotes: 'QA tiến bộ', feedback: 'QA phản hồi' }, 'coach'); const d = await api(`/teaching/students/${fixtures.member.member.id}/progress`, 'GET', undefined, 'member');
    const found = d.find(v => v.id === p.id); assert.ok(found); assert.equal(found.progressNotes, 'QA tiến bộ'); assert.equal(found.feedback, 'QA phản hồi');
  });
  await test('UC3-FEEDBACK-RECORD', 'Phản hồi HLV được lưu và đọc qua hồ sơ tiến độ', async () => {
    const feedback = `QA phản hồi ${randomUUID()}`;
    const plan = await api('/teaching/workout-plans', 'POST', { memberId: fixtures.member.member.id, title: 'Đánh giá buổi tập', feedback, progressNotes: 'Điểm cơ trọng tâm: 8/10; độ dẻo dai: 7/10' }, 'coach');
    const progress = await api(`/teaching/students/${fixtures.member.member.id}/progress`, 'GET', undefined, 'member');
    const saved = progress.find(p => p.id === plan.id); assert.equal(saved.feedback, feedback); assert.equal(saved.instructorId, fixtures.coach.user.id);
  });
  await test('UC3-INSTRUCTOR-WEEK', 'Lịch tuần HLV có đủ 7 ngày và danh sách lớp, không còn khung giờ đề nghị', async () => {
    const s = await schedule(); const day = new Date(new Date(s.startTime).getTime() + 7 * 3600000).toISOString().slice(0, 10);
    const w = await api(`/instructors/${fixtures.coach.user.id}/week?weekStart=${day}`, 'GET', undefined, 'member'); assert.equal(w.days.length, 7); assert.ok(w.days[0].classes.some(v => v.id === s.id));
    assert.ok(!('freeSlots' in w.days[0]));
  });
  await test('PACKAGE-PRIVATE-CONFIG', 'Hình thức tập riêng được tạo, sửa và đọc lại theo từng gói', async () => {
    const p = await api('/packages', 'POST', { name: 'QA riêng 45 phút', type: 'session_based', price: 1500000, totalSessions: 5, privateSessionEnabled: true, privateSessionType: 'semi_private_1v2', privateSessionDurationMinutes: 45 });
    assert.equal(p.privateSessionType, 'semi_private_1v2'); assert.equal(p.privateSessionDurationMinutes, 45);
    await api(`/packages/${p.id}`, 'PATCH', { privateSessionType: 'small_group_1v3', privateSessionDurationMinutes: 90 });
    const updated = await api(`/packages/${p.id}`); assert.equal(updated.privateSessionEnabled, true); assert.equal(updated.privateSessionType, 'small_group_1v3'); assert.equal(updated.privateSessionDurationMinutes, 90);
  });
  await test('PACKAGE-PRIVATE-VALIDATION', 'Chặn thời lượng và hình thức tập riêng sai khi tạo hoặc sửa gói', async () => {
    for (const value of [0, 14, 181, 30.5]) {
      await rejected('/packages', 'POST', { name: 'QA invalid', type: 'session_based', price: 1000, privateSessionDurationMinutes: value });
      await rejected(`/packages/${fixtures.privatePkg.id}`, 'PATCH', { privateSessionDurationMinutes: value });
    }
    for (const body of [{ privateSessionType: 'invalid' }, { privateSessionType: null }, { privateSessionEnabled: null }, { privateSessionDurationMinutes: null }]) await rejected(`/packages/${fixtures.privatePkg.id}`, 'PATCH', body);
    assert.equal((await api(`/packages/${fixtures.privatePkg.id}`)).privateSessionDurationMinutes, 60);
  });
  await test('PACKAGE-PRIVATE-ROLE', 'Học viên không được sửa cấu hình tập riêng', () => rejected(`/packages/${fixtures.privatePkg.id}`, 'PATCH', { privateSessionEnabled: false }, 'member', [403]));
  await test('PACKAGE-TRAINING-MODES', 'Tạo đủ bốn hình thức tập riêng, đổi sang tập lớp và đọc đúng trên gói hội viên', async () => {
    let last;
    for (const mode of ['private_1v1', 'semi_private_1v2', 'small_group_1v3', 'small_group_1v4']) {
      const p = await api('/packages', 'POST', { name: `QA ${mode}`, type: 'session_based', price: 1000000, totalSessions: 5, durationDays: 30, privateSessionEnabled: true, privateSessionType: mode, privateSessionDurationMinutes: 45 });
      assert.equal(p.privateSessionType, mode);
      await api(`/packages/${p.id}`, 'PATCH', { privateSessionEnabled: false });
      assert.equal((await api(`/packages/${p.id}`)).privateSessionEnabled, false);
      last = p;
    }
    await api(`/packages/${last.id}`, 'PATCH', { privateSessionEnabled: true });
    const m = await newMember(); const assigned = await api('/packages/assign', 'POST', { memberId: m.member.id, packageId: last.id });
    const my = (await api('/members/me/packages', 'GET', undefined, m)).find(v => v.id === assigned.id);
    assert.equal(my.package.privateSessionEnabled, true); assert.equal(my.package.privateSessionType, 'small_group_1v4'); assert.equal(my.package.privateSessionDurationMinutes, 45);
  });
  await test('ARCHIVED-REQUEST-NO-BLOCK', 'Dữ liệu đề nghị cũ không còn chặn tạo, sửa lịch hoặc đặt lớp', async () => {
    const m = await newMember(); await assign(m.member); const b = scheduleBody();
    await save('PrivateSessionRequest', { memberUserId: m.user.id, instructorUserId: b.instructorId, startTime: new Date(b.startTime), endTime: new Date(new Date(b.startTime).getTime() + 3 * 3600000), sessionType: 'private_1v1', status: 'approved' });
    const s = await api('/schedules', 'POST', b);
    await api(`/schedules/${s.id}`, 'PATCH', { startTime: b.endTime, endTime: new Date(new Date(b.endTime).getTime() + 3600000).toISOString() });
    assert.ok((await api(`/schedules/${s.id}/book`, 'POST', undefined, m)).bookingId);
  });
  await test('UC4-MEMBER-CRUD', 'Thêm/sửa/khóa học viên và kiểm tra đăng nhập bị chặn', async () => {
    const m = await api('/members', 'POST', { fullName: 'QA CRUD hội viên', email: `crud-${randomUUID()}@qa.invalid`, phone: '0909999999' }, 'staff'); assert.ok(m.id);
    await api(`/members/${m.id}`, 'PATCH', { fullName: 'QA CRUD đã sửa' }, 'staff'); assert.equal((await api(`/members/${m.id}`)).user.fullName, 'QA CRUD đã sửa');
    await api(`/members/${m.id}`, 'DELETE'); await rejected('/auth/login', 'POST', { email: m.user.email, password: 'Member@123' }, null, [401]);
  });
  await test('MEMBER-EDIT-PERSISTENCE', 'Sửa đầy đủ hồ sơ, đồng bộ danh sách và học viên, giữ nguyên gói/lịch/mật khẩu', async () => {
    const m = await newMember(); const mp = await assign(m.member); const s = await schedule();
    const booking = await api(`/schedules/${s.id}/book`, 'POST', undefined, m);
    const email = `edited-${randomUUID()}@qa.invalid`;
    const values = { fullName: 'Học viên đã chỉnh sửa', email, phone: '0901234567', dateOfBirth: '1992-07-08', gender: 'female', address: 'Địa chỉ kiểm thử', emergencyContactName: 'Liên hệ kiểm thử', emergencyContactPhone: '0912345678', healthNotes: 'Ghi chú kiểm thử', goals: 'Mục tiêu kiểm thử' };
    const edited = await api(`/members/${m.member.id}`, 'PATCH', values, 'staff');
    assert.equal(edited.id, m.member.id); assert.equal(edited.userId, m.user.id);
    assert.equal(edited.user.fullName, values.fullName); assert.equal(edited.user.email, email);
    for (const key of ['dateOfBirth', 'gender', 'address', 'emergencyContactName', 'emergencyContactPhone', 'healthNotes', 'goals']) assert.equal(edited[key], values[key]);
    const own = await api('/members/me', 'GET', undefined, m); assert.equal(own.address, values.address); assert.equal(own.user.fullName, values.fullName);
    const list = await api(`/members?search=${encodeURIComponent(email)}`); assert.equal(list.total, 1); assert.equal(list.items[0].name, values.fullName); assert.equal(list.items[0].address, values.address);
    assert.equal((await repo('User').findOneBy({ id: m.user.id })).passwordHash, m.entity.passwordHash);
    assert.equal((await repo('Booking').findOneBy({ id: booking.bookingId })).memberId, m.member.id);
    assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 9);
    assert.ok((await login(email, 'Member@123')).token); assert.ok(!('passwordHash' in edited.user));
  });
  await test('MEMBER-EDIT-CLEAR', 'Xóa ngày sinh, giới tính và các thông tin tùy chọn thật sự được lưu', async () => {
    const m = await newMember(); const url = `/members/${m.member.id}`;
    await api(url, 'PATCH', { dateOfBirth: '1990-02-03', gender: 'male', address: 'Cũ', emergencyContactName: 'Cũ', emergencyContactPhone: '0900000000', healthNotes: 'Cũ', goals: 'Cũ' });
    await api(url, 'PATCH', { dateOfBirth: null, gender: null, address: '', emergencyContactName: '', emergencyContactPhone: '', healthNotes: '', goals: '' });
    const result = await api(url);
    assert.equal(result.dateOfBirth, null); assert.equal(result.gender, null);
    for (const key of ['address', 'emergencyContactName', 'emergencyContactPhone', 'healthNotes', 'goals']) assert.equal(result[key], '');
    assert.equal(result.user.fullName, m.user.fullName); assert.equal(result.user.email, m.user.email);
    assert.equal((await api(url, 'PATCH', {})).id, m.member.id);
  });
  await test('MEMBER-EDIT-EMAIL-CONFLICT', 'Email trùng không phân biệt hoa thường trả 409 và không sửa dở hồ sơ', async () => {
    const m = await newMember(); const other = await newMember();
    await repo('Member').update(m.member.id, { address: 'Giữ nguyên địa chỉ' });
    await rejected(`/members/${m.member.id}`, 'PATCH', { fullName: 'Không được ghi', email: other.user.email.toUpperCase(), address: 'Không được ghi' }, 'staff', [409]);
    const result = await api(`/members/${m.member.id}`);
    assert.equal(result.user.fullName, m.user.fullName); assert.equal(result.user.email, m.user.email); assert.equal(result.address, 'Giữ nguyên địa chỉ');
  });
  await test('MEMBER-EDIT-VALIDATION', 'Chặn tên/email rỗng, ngày hoặc giới tính sai và trường ngoài quyền chỉnh sửa', async () => {
    const m = await newMember();
    for (const invalid of [{ fullName: null }, { fullName: '   ' }, { email: null }, { email: '' }, { email: 'invalid' }, { dateOfBirth: '2024-02-31' }, { gender: 'unknown' }, { role: 'admin' }, { remainingSessions: 999 }]) {
      await rejected(`/members/${m.member.id}`, 'PATCH', invalid, 'admin', [400]);
    }
    assert.equal((await repo('User').findOneBy({ id: m.user.id })).fullName, m.user.fullName);
  });
  await test('MEMBER-EDIT-PERMISSIONS', 'Admin/lễ tân được sửa, HLV/học viên không sửa hồ sơ người khác, tự sửa xóa được', async () => {
    const m = await newMember(); const url = `/members/${m.member.id}`;
    for (const actor of ['coach', 'member2']) await rejected(url, 'PATCH', { fullName: 'Không được ghi' }, actor, [403]);
    await rejected(url, 'PATCH', { fullName: 'Không được ghi' }, null, [401]);
    await api('/members/me', 'PATCH', { address: 'Học viên tự cập nhật', healthNotes: 'Ghi chú mới' }, m);
    await api('/members/me', 'PATCH', { healthNotes: '', address: '' }, m);
    const result = await api(url); assert.equal(result.healthNotes, ''); assert.equal(result.address, '');
    await api(url, 'PATCH', { goals: 'Admin cập nhật' });
    assert.equal((await api(url)).goals, 'Admin cập nhật');
  });
  await test('MEMBER-CREATE-OPTIONAL-PROFILE', 'Thêm học viên lưu địa chỉ và mục tiêu, cho phép chưa cung cấp ngày sinh/giới tính', async () => {
    const m = await api('/members', 'POST', { fullName: 'QA hồ sơ mới', email: `create-${randomUUID()}@qa.invalid`, phone: '0901234567', dateOfBirth: null, gender: null, address: 'Địa chỉ mới', goals: 'Mục tiêu mới' }, 'staff');
    assert.equal(m.address, 'Địa chỉ mới'); assert.equal(m.goals, 'Mục tiêu mới'); assert.equal(m.dateOfBirth, null); assert.equal(m.gender, null);
    assert.equal((await api(`/members/${m.id}`)).address, 'Địa chỉ mới');
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

  await test('UC5-PROMO', 'Khuyến mãi tính đúng giá và chặn mã trùng', async () => {
    const code = `QA${randomUUID().slice(0, 8)}`; await api('/promotions', 'POST', { code, name: 'QA giảm 10%', discountPercent: 10, minOrderAmount: 100000 });
    const d = await api('/promotions/apply', 'POST', { code: code.toLowerCase(), orderAmount: 1000000 }, null); assert.equal(d.discountAmount, 100000); assert.equal(d.finalAmount, 900000);
    await rejected('/promotions', 'POST', { code, name: 'QA trùng' }, 'admin', [409]); await rejected('/promotions/apply', 'POST', { code, orderAmount: 10 }, null);
  });
  await test('UC5-PROMO-EXPIRED', 'Không áp dụng voucher hết hạn', async () => {
    const p = await api('/promotions', 'POST', { code: `QA${randomUUID().slice(0, 8)}`, name: 'QA hết hạn', discountPercent: 10, endDate: '2020-01-01' }); await rejected('/promotions/apply', 'POST', { code: p.code, orderAmount: 1000000 }, null);
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
  await test('UC7-MEMBER-WRITE-DENIED', 'Hội viên không được tạo lớp hoặc gói', async () => {
    for (const url of ['/classes', '/packages']) await rejected(url, 'POST', {}, 'member', [403]);
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
  if (process.argv.includes('--serve')) app.enableCors({ origin: [
    'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8081',
    'http://localhost:5174', 'http://127.0.0.1:5174', 'http://localhost:8082', 'http://127.0.0.1:8082',
  ], credentials: true });
  await app.listen(Number(process.env.QA_HTTP_PORT || 0), '127.0.0.1'); db = app.get(DataSource); base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
  console.log(`QA on real PostgreSQL ${conn.host}:${conn.port}; temporary database ${database}`);
  await initializeFixtures();
  if (process.argv.includes('--serve')) {
    let uiContext = {};
    if (process.argv.includes('--simple-booking')) {
      await api('/packages/starter-catalog', 'POST', {});
      const catalog = (await repo('Package').find()).filter(p => p.catalogCode);
      const prices = { trial_2: 200000, group_8: 1600000, group_10: 1900000, private_4: 2400000, duo_4: 1400000 };
      for (const p of catalog) await api(`/packages/${p.id}`, 'PATCH', { price: prices[p.catalogCode], isActive: true });
      await repo('MemberPackage').delete({ memberId: fixtures.member.member.id });
      const group = await assign(fixtures.member.member, { packageId: catalog.find(p => p.catalogCode === 'group_8').id, remainingSessions: 8 });
      const personal = await assign(fixtures.member.member, { packageId: catalog.find(p => p.catalogCode === 'private_4').id, remainingSessions: 4 });
      const duo = await assign(fixtures.member.member, { packageId: catalog.find(p => p.catalogCode === 'duo_4').id, remainingSessions: 4 });
      const partner = await assign(fixtures.member2.member, { packageId: duo.packageId, remainingSessions: 4 });
      await api(`/packages/member-packages/${duo.id}/settings`, 'PATCH', { duoPartnerPackageId: partner.id });
      const oneClass = await save('Class', { name: 'Pilates riêng 1:1', type: 'private', branchId: fixtures.branch.id, durationMinutes: 60, defaultMaxCapacity: 1 });
      const duoClass = await save('Class', { name: 'Pilates đôi 1:2', type: 'semi_private', branchId: fixtures.branch.id, durationMinutes: 60, defaultMaxCapacity: 2 });
      const extraRoom = await save('Room', { name: 'Phòng lớp chung B', branchId: fixtures.branch.id, capacity: 4, roomType: 'group' });
      for (const offset of [1, 8, 15, 22, 29]) {
        const day = new Date(Date.now() + offset * 86400000 + 7 * 3600000).toISOString().slice(0, 10);
        await schedule({ startTime: `${day}T09:00:00+07:00`, endTime: `${day}T10:00:00+07:00` });
        await schedule({ roomId: extraRoom.id, instructorId: fixtures.coach2.user.id, startTime: `${day}T09:00:00+07:00`, endTime: `${day}T10:00:00+07:00` });
        const own = await schedule({ classId: oneClass.id, roomId: fixtures.room2.id, maxCapacity: 1, startTime: `${day}T18:00:00+07:00`, endTime: `${day}T19:00:00+07:00` });
        await schedule({ classId: duoClass.id, maxCapacity: 2, startTime: `${day}T19:00:00+07:00`, endTime: `${day}T20:00:00+07:00` });
        if (offset === 1) { await api('/bookings/package-schedules', 'POST', { memberPackageId: personal.id, scheduleIds: [own.id] }, 'member'); uiContext = { groupPackageId: group.id, privatePackageId: personal.id, duoPackageId: duo.id, firstDay: day }; }
      }
    } else if (process.argv.includes('--package-booking') || process.argv.includes('--package-flow')) {
      await repo('Package').update(fixtures.pkg.id, { name: 'Gói Pilates 5 buổi', totalSessions: 5 });
      await repo('MemberPackage').update({ memberId: fixtures.member.member.id }, { remainingSessions: 5 });
      for (const dayOffset of [1, 2, 3, 4, 5, 6, 9]) {
        const day = new Date(Date.now() + dayOffset * 86400000 + 7 * 3600000).toISOString().slice(0, 10);
        await schedule({ startTime: `${day}T09:00:00+07:00`, endTime: `${day}T10:00:00+07:00` });
      }
      if (process.argv.includes('--package-flow')) {
        const duoPkg = await save('Package', { name: 'Gói tập đôi 1:2 · 5 buổi', type: 'session_based', totalSessions: 5, price: 2000000, durationDays: 90, privateSessionEnabled: true, privateSessionType: 'semi_private_1v2', privateSessionDurationMinutes: 60 });
        const duoClass = await save('Class', { name: 'Pilates tập đôi 1:2', branchId: fixtures.branch.id, type: 'semi_private', durationMinutes: 60, defaultMaxCapacity: 2 });
        await assign(fixtures.member.member, { packageId: duoPkg.id, remainingSessions: 5 });
        await assign(fixtures.member2.member, { packageId: duoPkg.id, remainingSessions: 5 });
        await assign(fixtures.member.member, { packageId: fixtures.privatePkg.id, remainingSessions: 5 });
        const privateClass = await save('Class', { name: 'Pilates cá nhân 1:1', branchId: fixtures.branch.id, type: 'private', durationMinutes: 60, defaultMaxCapacity: 1 });
        for (const offset of [1, 8, 15, 22, 29]) {
          const day = new Date(Date.now() + offset * 86400000 + 7 * 3600000).toISOString().slice(0, 10);
          await schedule({ classId: privateClass.id, roomId: fixtures.room2.id, maxCapacity: 1, startTime: `${day}T18:00:00+07:00`, endTime: `${day}T19:00:00+07:00` });
          await schedule({ classId: duoClass.id, maxCapacity: 2, startTime: `${day}T19:00:00+07:00`, endTime: `${day}T20:00:00+07:00` });
        }
      }
    } else await schedule();
    fs.writeFileSync(path.join(reportDir, 'ui-server.json'), JSON.stringify({ base, stopFile: path.join(reportDir, 'stop-ui'), ...uiContext }));
    console.log(`UI QA READY ${base}`);
    await new Promise(resolve => { const timer = setInterval(() => { if (fs.existsSync(path.join(reportDir, 'stop-ui'))) { clearInterval(timer); resolve(); } }, 1000); });
    return;
  }
  if (!process.argv.includes('--skip-legacy')) {
    await schedule();
    await runLegacy('test-admin-crud.js');
    // The feedback scenario requires a real enrollment with the signed-in coach.
    const feedbackSchedule = await schedule();
    await api(`/schedules/${feedbackSchedule.id}/book`, 'POST', undefined, 'member');
    await runLegacy('test-usecases.js');
    const tables = db.entityMetadatas.map(m => `"${m.tableName.replaceAll('"', '""')}"`).join(',');
    await db.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`); await initializeFixtures();
  }
  await require('./package-catalog.cjs')({ test, api, rejected, repo, save, newMember, assign, fixtures });
  await require('./package-flow.cjs')({ test, api, rejected, raw, repo, save, newMember, assign, schedule, fixtures });
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
