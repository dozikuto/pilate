const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const dep = createRequire(path.resolve(__dirname, '../../backend/package.json'));
dep('ts-node').register({ transpileOnly: true, skipProject: true, moduleTypes: { '**/*.ts': 'cjs' }, compilerOptions: { module: 'CommonJS', moduleResolution: 'node', target: 'ES2021' } });
const { adaptMemberDetail } = require('../../web-admin/src/lib/memberAdapters.ts');
const original = { id: 'm1', qrCode: 'HV-ONE', user: { fullName: 'Học viên kiểm thử', phone: '0900000000', email: 'test@example.invalid', isActive: true },
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-02-01T00:00:00Z', emergencyContactName: 'Người liên hệ', emergencyContactPhone: '0911111111' };
let passed = 0;
function test(name, fn) { try { fn(); passed++; console.log(`PASS ${name}`); } catch (e) { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1; } }
test('Hồ sơ API thiếu name cấp ngoài vẫn có tên, mã và liên hệ', () => {
  const member = adaptMemberDetail(original); assert.equal(member.name, original.user.fullName); assert.equal(member.code, original.qrCode);
  assert.equal(member.emergencyContact, original.emergencyContactName); assert.equal(member.phone, original.user.phone); assert.equal(member.joinDate, original.createdAt);
});
test('Không có quan hệ dữ liệu trả danh sách rỗng, không dùng hồ sơ giả', () => {
  const member = adaptMemberDetail(original); assert.deepEqual(member.packages, []); assert.deepEqual(member.bookings, []); assert.deepEqual(member.checkIns, []);
  assert.equal(member.totalSessions, 0); assert.equal(member.currentPackage, undefined);
});
test('Hồ sơ thiếu user vẫn có tên hiển thị an toàn', () => {
  const member = adaptMemberDetail({ id: 'm2' }); assert.equal(typeof member.name, 'string'); assert.ok(member.name.trim()); assert.equal(member.email, '');
});
test('Đọc đúng tên gói, số buổi 0 và giá từ dữ liệu liên kết', () => {
  const member = adaptMemberDetail({ ...original, memberPackages: [{ id: 'mp1', packageId: 'p1', status: 'active', remainingSessions: 0,
    package: { id: 'p1', name: 'Gói 5 buổi', totalSessions: 5, price: '1500000.00', type: 'session_based' } }] });
  assert.equal(member.packages[0].packageName, 'Gói 5 buổi'); assert.equal(member.remainingSessions, 0); assert.equal(member.usedSessions, 5);
  assert.equal(member.packages[0].price, 1500000); assert.equal(member.currentPackage.id, 'mp1');
});
test('Gói đã hết hạn và gói tạm dừng không bị ghi nhầm đang hoạt động', () => {
  const member = adaptMemberDetail({ ...original, memberPackages: [{ id: 'old', status: 'active', expiryDate: '2000-01-01', remainingSessions: 2 }, { id: 'paused', status: 'suspended' }] });
  assert.equal(member.status, 'expired'); assert.equal(member.packages[0].status, 'expired'); assert.equal(member.packages[1].status, 'suspended');
  assert.equal(adaptMemberDetail({ ...original, user: { ...original.user, isActive: false } }).status, 'inactive');
});
test('Lịch đặt có đúng lớp/HLV/giờ và giữ trạng thái danh sách chờ', () => {
  const member = adaptMemberDetail({ ...original, bookings: [{ id: 'b1', status: 'waitlisted', schedule: { id: 's1', startTime: '2030-01-01T02:00:00Z', endTime: '2030-01-01T03:00:00Z', class: { name: 'Reformer' }, instructor: { fullName: 'HLV A' } } }, { id: 'b2', status: 'no_show' }] });
  assert.equal(member.bookings[0].className, 'Reformer'); assert.equal(member.bookings[0].instructorName, 'HLV A'); assert.equal(member.bookings[0].status, 'waitlisted');
  assert.equal(member.bookings[1].status, 'no-show');
});
test('Check-in đọc đúng lớp và sắp buổi mới nhất lên đầu', () => {
  const member = adaptMemberDetail({ ...original, checkIns: [{ id: 'ci1', checkInTime: '2026-01-01T00:00:00Z', method: 'manual', schedule: { class: { name: 'Lớp cũ' } } }, { id: 'ci2', checkInTime: '2026-02-01T00:00:00Z', method: 'face_id', schedule: { class: { name: 'Lớp mới' } } }] });
  assert.equal(member.checkIns[0].className, 'Lớp mới'); assert.equal(member.checkIns[0].method, 'face_id');
});
test('Chuyển đổi không sửa dữ liệu nguồn và giữ số liệu đã được API chuẩn hóa', () => {
  const before = JSON.stringify(original); const member = adaptMemberDetail({ ...original, name: 'Tên từ API', totalSessions: 20, remainingSessions: 12, usedSessions: 8 });
  assert.equal(JSON.stringify(original), before); assert.equal(member.name, 'Tên từ API'); assert.equal(member.remainingSessions, 12);
});
console.log(`TOTAL ${passed}/8 PASS`);
