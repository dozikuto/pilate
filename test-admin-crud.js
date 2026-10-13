// Kiểm thử API thật cho các usecase trong bảng test (chạy: node test-admin-crud.js)
const BASE = process.env.PILATES_TEST_API_URL || 'http://localhost:3001/api/v1';
const results = [];
let token = '';

async function req(method, url, body, tk = token) {
  const res = await fetch(BASE + url, {
    method,
    signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: `Bearer ${tk}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) {
    const msg = Array.isArray(json?.errors) ? json.errors.join('; ') : (json?.message || res.status);
    throw new Error(`${res.status} ${msg}`);
  }
  return json?.success && json.data !== undefined ? json.data : json;
}
const list = (d) => (Array.isArray(d) ? d : d?.items || d?.data || []);

async function t(id, name, fn) {
  try { const info = await fn(); results.push({ id, name, ok: true, info }); console.log(`PASS [${id}] ${name}${info ? ' — ' + info : ''}`); }
  catch (e) { results.push({ id, name, ok: false, info: e.message }); console.log(`FAIL [${id}] ${name} — ${e.message}`); }
}
const uniq = Date.now().toString().slice(-6);

(async () => {
  await t('AUTH', 'Đăng nhập Admin', async () => {
    const r = await req('POST', '/auth/login', { email: 'admin@pilatesms.vn', password: 'Admin@123456' }, null);
    token = r.accessToken || r.token; if (!token) throw new Error('no token');
  });

  await t('1', 'Dashboard', async () => { await req('GET', '/reports/dashboard'); });

  // Học viên
  await t('2', 'Danh sách học viên', async () => `${list(await req('GET', '/members')).length} HV`);
  await t('3', 'Thêm học viên', async () => {
    const r = await req('POST', '/members', { fullName: `Test HV ${uniq}`, phone: `09${uniq}11`, email: `hv${uniq}@test.vn` });
    return r.id;
  });
  await t('4', 'Tìm kiếm học viên', async () => {
    const r = list(await req('GET', `/members?search=hv${uniq}`));
    if (!r.length) throw new Error('không tìm thấy HV vừa tạo'); return `${r.length} kết quả`;
  });
  for (const st of ['active', 'inactive', 'expired']) {
    await t('5', `Lọc trạng thái=${st}`, async () => {
      const r = list(await req('GET', `/members?status=${st}`));
      const wrong = r.filter((m) => m.status !== st);
      if (wrong.length) throw new Error(`${wrong.length} HV sai trạng thái`); return `${r.length} HV`;
    });
  }

  // Lớp học + lịch
  let classId, scheduleId, instructorUserId, roomId, roomCapacity;
  await t('9', 'Danh sách lớp học', async () => `${list(await req('GET', '/classes')).length} lớp`);
  await t('10', 'Thêm lớp học', async () => {
    const r = await req('POST', '/classes', { name: `Lớp Test ${uniq}`, description: 'test', durationMinutes: 60, defaultMaxCapacity: 6, type: 'group', level: 'all', price: 0 });
    classId = r.id; return classId;
  });
  await t('11', 'Sửa lớp học', async () => { await req('PATCH', `/classes/${classId}`, { name: `Lớp Test ${uniq} (sửa)` }); });
  await t('6', 'Xem lịch học', async () => `${list(await req('GET', '/schedules')).length} lịch`);
  await t('7', 'Tạo lịch học mới', async () => {
    const ins = list(await req('GET', '/instructors'));
    instructorUserId = ins[0]?.userId || ins[0]?.user?.id;
    const rooms = list(await req('GET', '/rooms').catch(() => []));
    roomId = rooms[0]?.id; roomCapacity = rooms[0]?.capacity;
    if (!roomId || !instructorUserId) throw new Error('Thiếu fixture phòng/HLV');
    const start = new Date(Date.now() + (20 + Math.floor(Math.random() * 200)) * 86400000);
    start.setUTCHours(1, 0, 0, 0);
    const end = new Date(start.getTime() + 3600000);
    const r = await req('POST', '/schedules', {
      classId, instructorId: instructorUserId, ...(roomId ? { roomId } : {}),
      startTime: start.toISOString(), endTime: end.toISOString(), maxCapacity: Math.min(6, roomCapacity),
    });
    scheduleId = r.id; return scheduleId;
  });
  await t('8', 'Hủy lịch học (biến mất khỏi danh sách)', async () => {
    await req('DELETE', `/schedules/${scheduleId}`);
    const still = list(await req('GET', '/schedules')).some((s) => s.id === scheduleId);
    if (still) throw new Error('lịch vẫn còn trong danh sách');
  });
  await t('12', 'Xóa lớp học', async () => {
    await req('DELETE', `/classes/${classId}`);
    const still = list(await req('GET', '/classes')).some((c) => c.id === classId);
    if (still) throw new Error('lớp vẫn còn');
  });

  // Gói tập
  let pkgId;
  await t('21', 'Danh sách gói tập', async () => `${list(await req('GET', '/packages')).length} gói`);
  await t('22', 'Tạo gói mới', async () => {
    const r = await req('POST', '/packages', { name: `Gói Test ${uniq}`, type: 'session_based', price: 1000000, totalSessions: 5, durationDays: 30, description: 't', isActive: true });
    pkgId = r.id; return pkgId;
  });
  await t('23', 'Xóa gói', async () => { await req('DELETE', `/packages/${pkgId}`); });
  await t('23b', 'Xóa gói với id không hợp lệ (p1) không lỗi 500', async () => {
    try { await req('DELETE', '/packages/p1'); } catch (e) { if (e.message.startsWith('500')) throw e; return `trả về ${e.message.slice(0, 3)}`; }
  });

  // Sản phẩm
  let productId;
  await t('25', 'Danh sách sản phẩm', async () => `${list(await req('GET', '/products')).length} SP`);
  await t('28', 'Thêm sản phẩm', async () => {
    const r = await req('POST', '/products', { name: `SP Test ${uniq}`, sku: `SKU${uniq}`, price: 150000, stockQuantity: 10, category: 'accessory', unit: 'cái', description: 't', isActive: true });
    productId = r.id; return productId;
  });
  if (productId) await t('28b', 'Xóa sản phẩm test', async () => { await req('DELETE', `/products/${productId}`); });

  // Khuyến mãi / giao dịch / đánh giá
  await t('29', 'Danh sách khuyến mãi', async () => `${list(await req('GET', '/promotions')).length} mã`);
  await t('35', 'Danh sách giao dịch', async () => `${list(await req('GET', '/transactions')).length} GD`);
  await t('40', 'Danh sách đánh giá', async () => `${list(await req('GET', '/reviews')).length} ĐG`);

  // HLV
  let insId;
  await t('42', 'Danh sách HLV', async () => `${list(await req('GET', '/instructors')).length} HLV`);
  await t('43', 'Thêm HLV', async () => {
    const r = await req('POST', '/instructors', { fullName: `HLV Test ${uniq}`, email: `hlv${uniq}@test.vn`, phone: `08${uniq}22`, bio: 'test', specializations: ['Reformer'], hourlyRate: 300000 });
    insId = r.id; return insId;
  });
  await t('44', 'Sửa HLV', async () => { await req('PATCH', `/instructors/${insId}`, { bio: 'đã sửa' }); });
  await t('45', 'Xóa HLV', async () => { await req('DELETE', `/instructors/${insId}`); });

  // Thiết bị
  let eqId;
  await t('47', 'Danh sách thiết bị', async () => `${list(await req('GET', '/equipment')).length} TB`);
  await t('48', 'Thêm thiết bị', async () => {
    const r = await req('POST', '/equipment', { name: `Reformer Test ${uniq}`, type: 'Reformer', status: 'available', serialNumber: `SN${uniq}` });
    eqId = r.id; return eqId;
  });
  await t('50', 'Lên lịch bảo trì (cập nhật thiết bị)', async () => {
    await req('PATCH', `/equipment/${eqId}`, { status: 'maintenance', nextMaintenanceDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) });
  });
  await t('51', 'Phát thông báo bảo trì (broadcast)', async () => {
    await req('POST', '/notifications/broadcast', { title: 'Bảo trì test', message: 'Test broadcast', equipmentName: 'Reformer Test' });
  });
  if (eqId) await t('48b', 'Xóa thiết bị test', async () => { await req('DELETE', `/equipment/${eqId}`); });

  // Báo cáo
  await t('59', 'Báo cáo theo năm', async () => { await req('GET', `/reports/yearly?year=${new Date().getFullYear()}`); });

  // Người dùng
  let userId;
  await t('60', 'Danh sách tài khoản', async () => `${list(await req('GET', '/users')).length} TK`);
  await t('61', 'Thêm tài khoản', async () => {
    const r = await req('POST', '/users', { fullName: `User Test ${uniq}`, email: `u${uniq}@test.vn`, phone: `07${uniq}33`, password: 'User@12345', role: 'receptionist' });
    userId = r.id; return userId;
  });
  await t('63', 'Sửa tài khoản', async () => { await req('PATCH', `/users/${userId}`, { fullName: `User Test ${uniq} (sửa)` }); });
  await t('62', 'Khóa tài khoản', async () => { await req('PATCH', `/users/${userId}`, { isActive: false }); });
  await t('62b', 'Mở khóa tài khoản', async () => { await req('PATCH', `/users/${userId}`, { isActive: true }); });
  await t('65', 'Đổi vai trò', async () => { await req('PATCH', `/users/${userId}`, { role: 'instructor' }); });

  // Học viên đánh giá có chọn giáo viên
  await t('REV', 'Học viên gửi đánh giá có chọn HLV', async () => {
    const m = await req('POST', '/auth/login', { email: 'hang.nguyen@gmail.com', password: 'Member@123' }, null);
    const mt = m.accessToken || m.token;
    const ins = await req('GET', '/private-sessions/instructors', null, mt);
    const target = list(ins)[0];
    await req('POST', '/reviews', { targetType: 'instructor', targetId: target.id, targetName: target.fullName, rating: 5, comment: `test ${uniq}` }, mt);
    const found = list(await req('GET', '/reviews?limit=50')).find((r) => r.comment === `test ${uniq}`);
    if (!found || found.targetName !== target.fullName) throw new Error('không lưu được tên HLV');
    return target.fullName;
  });

  const fail = results.filter((r) => !r.ok);
  console.log(`\nTỔNG: ${results.length - fail.length}/${results.length} PASS`);
  if (fail.length) { process.exitCode = 1; console.log('LỖI:'); fail.forEach((f) => console.log(` - [${f.id}] ${f.name}: ${f.info}`)); }
})().catch(e => { console.error(e); process.exitCode = 2; });

