const assert = require('node:assert/strict');

module.exports = async function catalogTests({ test, api, rejected, repo, save, newMember, assign, fixtures }) {
  let catalog;
  await test('CATALOG-FIVE-DRAFTS', 'Tạo đúng 5 gói theo số buổi, chưa mở bán và không thay số dư/giá gói cũ', async () => {
    const old = await save('Package', { name: 'Gói Chuyên Sâu 20 Buổi', type: 'session_based', totalSessions: 20, price: 5200000, isActive: true });
    const member = await newMember(), mp = await assign(member.member, { packageId: old.id, remainingSessions: 7 });
    const result = await api('/packages/starter-catalog', 'POST', {});
    assert.equal(result.created, 5); assert.equal(result.retired, 1);
    catalog = (await repo('Package').find()).filter(p => p.catalogCode);
    assert.equal(catalog.length, 5);
    const expected = { trial_2: 2, group_8: 8, group_10: 10, private_4: 4, duo_4: 4 };
    for (const p of catalog) { assert.equal(p.totalSessions, expected[p.catalogCode]); assert.equal(p.type, 'session_based'); assert.equal(Number(p.price), 0); assert.equal(p.isActive, false); }
    assert.equal((await repo('MemberPackage').findOneBy({ id: mp.id })).remainingSessions, 7);
    assert.equal(Number((await repo('Package').findOneBy({ id: old.id })).price), 5200000);
    const second = await api('/packages/starter-catalog', 'POST', {});
    assert.equal(second.created, 0); assert.equal((await repo('Package').find()).filter(p => p.catalogCode).length, 5);
  });
  await test('CATALOG-ADMIN-ONLY', 'Chỉ admin được chuẩn bị danh mục gói', async () => {
    for (const actor of ['member', 'coach', 'staff']) await rejected('/packages/starter-catalog', 'POST', {}, actor, [403]);
  });
  await test('CATALOG-PUBLISH-PRICE', 'Chưa nhập giá thì không mở bán, mua online hoặc gán gói được', async () => {
    const p = catalog.find(p => p.catalogCode === 'group_8');
    await rejected(`/packages/${p.id}`, 'PATCH', { isActive: true });
    await rejected('/members/me/packages', 'POST', { packageId: p.id }, 'member', [404]);
    await rejected('/packages/assign', 'POST', { memberId: fixtures.member.member.id, packageId: p.id });
  });
  await test('CATALOG-UNIT-PRICING', 'Giá mỗi buổi 1:1 và 1:2 phải cao hơn lớp chung, kiểm tra cả hai chiều cập nhật', async () => {
    const rates = { trial_2: 200000, group_8: 1600000, group_10: 1900000, private_4: 2400000, duo_4: 1400000 };
    for (const p of catalog) await api(`/packages/${p.id}`, 'PATCH', { price: rates[p.catalogCode], isActive: true });
    const duo = catalog.find(p => p.catalogCode === 'duo_4'), group = catalog.find(p => p.catalogCode === 'group_8');
    await rejected(`/packages/${duo.id}`, 'PATCH', { price: 600000 });
    await rejected(`/packages/${group.id}`, 'PATCH', { price: 6400000 });
    assert.equal(Number((await repo('Package').findOneBy({ id: duo.id })).price), rates.duo_4);
  });
  await test('CATALOG-FIXED-ENTITLEMENT', 'Gói mẫu giữ đúng số buổi và loại lịch khi admin sửa giá hoặc mô tả', async () => {
    const p = catalog.find(p => p.catalogCode === 'private_4');
    for (const body of [{ totalSessions: 8 }, { type: 'unlimited' }, { privateSessionEnabled: false }, { privateSessionType: 'semi_private_1v2' }]) await rejected(`/packages/${p.id}`, 'PATCH', body);
    await api(`/packages/${p.id}`, 'PATCH', { description: 'QA mô tả mới' });
    assert.equal((await repo('Package').findOneBy({ id: p.id })).totalSessions, 4);
  });
  await test('CATALOG-PURCHASE-ENTITLEMENT', 'Mua gói 8 buổi chờ xác nhận tiền, sau xác nhận nhận đúng 8 buổi và mã loại gói', async () => {
    const m = await newMember(), p = catalog.find(p => p.catalogCode === 'group_8');
    const result = await api('/members/me/packages', 'POST', { packageId: p.id, paymentMethod: 'bank_transfer' }, m);
    assert.equal(result.status, 'pending'); assert.equal(await repo('MemberPackage').countBy({ memberId: m.member.id }), 0);
    await api(`/transactions/${result.transactionId}/confirm`, 'POST', {}, 'staff');
    const own = (await api('/members/me/packages', 'GET', undefined, m))[0];
    assert.equal(own.remainingSessions, 8); assert.equal(own.totalSessions, 8); assert.equal(own.package.catalogCode, 'group_8');
  });
};
