// Calendar/business-rule tests for the student weekly planner; no database writes.
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const dep = createRequire(path.resolve(__dirname, '../../backend/package.json'));
dep('ts-node').register({ transpileOnly: true, skipProject: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node', target: 'ES2021' } });
const { planWeeklyBookings, shiftStudioDate } = require('../../mobile/src/lib/weeklyBooking.ts');
const { studioDate } = require('../../mobile/src/lib/packageBooking.ts');
let first = `${new Date().getUTCFullYear() + 1}-01-01`;
while (new Date(`${first}T00:00:00Z`).getUTCDay() !== 2) first = shiftStudioDate(first, 1);
const pkg = { id: 'mp', status: 'active', packageType: 'session_based', remainingSessions: 5, totalSessions: 5,
  startDate: studioDate(), expiryDate: shiftStudioDate(first, 180), package: { privateSessionEnabled: false } };
function schedule(offset, time = '09:00', extra = {}) {
  const date = shiftStudioDate(first, offset);
  return { id: `${offset}-${time}`, className: 'Pilates', class: { id: 'c1', type: 'group', isActive: true },
    instructor: { id: 'i1', fullName: 'HLV' }, room: 'Phòng 1', capacity: 4, enrolled: 0, scheduleStatus: 'scheduled', status: 'available',
    startTime: `${date}T${time}:00+07:00`, endTime: `${date}T${String(Number(time.slice(0, 2)) + 1).padStart(2, '0')}:${time.slice(3)}:00+07:00`, ...extra };
}
const rule = { startDate: first, endDate: shiftStudioDate(first, 49), weekdays: [2], count: 5 };
const tuesdays = Array.from({ length: 8 }, (_, i) => schedule(i * 7));
let passed = 0;
function test(name, fn) { try { fn(); passed++; console.log(`PASS ${name}`); } catch (e) { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1; } }
test('Chọn đúng 5 Thứ 3 liên tiếp theo giờ Việt Nam', () => {
  const result = planWeeklyBookings([...tuesdays].reverse(), pkg, rule);
  assert.equal(result.error, ''); assert.deepEqual(result.chosen.map(v => v.id), tuesdays.slice(0, 5).map(v => v.id));
});
test('Chọn Thứ 3 và Thứ 7 theo thứ tự ngày, tối đa một buổi mỗi ngày', () => {
  const result = planWeeklyBookings([...tuesdays, schedule(4), schedule(4, '18:00')], pkg, { ...rule, weekdays: [2, 6] });
  assert.deepEqual(result.chosen.map(v => v.id), ['0-09:00', '4-09:00', '7-09:00', '14-09:00', '21-09:00']);
});
test('Buổi 00:30 đúng ngày Việt Nam dù UTC là hôm trước', () => {
  const result = planWeeklyBookings([schedule(0, '00:30')], pkg, { ...rule, count: 1, startTime: '00:30' });
  assert.equal(result.chosen.length, 1); assert.equal(studioDate(result.chosen[0].startTime), first);
});
test('Lọc chính xác lớp, HLV và giờ bắt đầu', () => {
  const right = schedule(0, '18:00', { id: 'right', class: { id: 'c2', type: 'group' }, instructor: { id: 'i2' } });
  const result = planWeeklyBookings([...tuesdays, right], pkg, { ...rule, count: 1, classId: 'c2', instructorId: 'i2', startTime: '18:00' });
  assert.equal(result.chosen[0].id, 'right');
});
test('Bỏ lớp đầy và lớp đã đặt, tìm tuần kế tiếp và báo lý do', () => {
  const result = planWeeklyBookings(tuesdays.map((v, i) => i === 0 ? { ...v, enrolled: 4 } : i === 1 ? { ...v, isBooked: true } : v), pkg, rule);
  assert.deepEqual(result.chosen.map(v => v.id), tuesdays.slice(2, 7).map(v => v.id)); assert.equal(result.skipped.length, 2);
});
test('Giữ lựa chọn thủ công, không thêm vượt số buổi còn lại', () => {
  assert.ok(planWeeklyBookings(tuesdays, pkg, rule, [tuesdays[0]]).error);
  const result = planWeeklyBookings(tuesdays, pkg, { ...rule, count: 4 }, [tuesdays[0]]);
  assert.deepEqual(result.chosen.map(v => v.id), tuesdays.slice(1, 5).map(v => v.id));
});
test('Bỏ lịch trùng giờ với buổi đã đặt khác', () => {
  const booked = schedule(0, '09:00', { id: 'booked', isBooked: true });
  const result = planWeeklyBookings([...tuesdays, booked], pkg, rule);
  assert.equal(result.chosen[0].id, tuesdays[1].id);
});
test('Không đủ lịch trả đúng số tìm được cùng các ngày bị thiếu', () => {
  const result = planWeeklyBookings(tuesdays.slice(0, 3), pkg, rule);
  assert.equal(result.error, ''); assert.equal(result.chosen.length, 3); assert.ok(result.skipped.length);
});
test('Không chọn buổi sau ngày hết hạn gói', () => {
  const result = planWeeklyBookings(tuesdays, { ...pkg, expiryDate: shiftStudioDate(first, 7) }, rule);
  assert.equal(result.chosen.length, 2);
});
test('Tôn trọng cấu hình tập riêng và thời lượng', () => {
  const privatePackage = { ...pkg, package: { privateSessionEnabled: true, privateSessionType: 'private_1v1', privateSessionDurationMinutes: 45 } };
  const good = schedule(7, '09:00', { class: { type: 'private' }, capacity: 1, endTime: `${shiftStudioDate(first, 7)}T09:45:00+07:00` });
  const result = planWeeklyBookings([...tuesdays, good], privatePackage, { ...rule, count: 1 }); assert.equal(result.chosen[0].id, good.id);
});
test('Validation ngày, thứ, giờ, số buổi và giới hạn 1 năm', () => {
  for (const changes of [{ startDate: '2027-02-30' }, { endDate: '2000-01-01' }, { weekdays: [] }, { weekdays: [7] },
    { count: 0 }, { count: 6 }, { count: 1.5 }, { startTime: '25:00' }, { endDate: shiftStudioDate(first, 366) }]) {
    assert.ok(planWeeklyBookings(tuesdays, pkg, { ...rule, ...changes }).error);
  }
});
test('Gói theo thời gian không bị giới hạn bởi remainingSessions = 0', () => {
  const result = planWeeklyBookings(tuesdays, { ...pkg, packageType: 'time_based', remainingSessions: 0 }, rule); assert.equal(result.chosen.length, 5);
});
console.log(`TOTAL ${passed}/12 PASS`);
