const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

module.exports = async function packageFlow({
  test,
  api,
  rejected,
  raw,
  repo,
  save,
  newMember,
  assign,
  schedule,
  fixtures,
}) {
  const settings = (id) => `/packages/member-packages/${id}/settings`;
  const preference = (id) => `/members/me/packages/${id}/preferences`;
  async function duo() {
    const p = await save("Package", {
      name: "QA gói đôi 5 buổi",
      type: "session_based",
      totalSessions: 5,
      durationDays: 180,
      price: 1500000,
      privateSessionEnabled: true,
      privateSessionType: "semi_private_1v2",
      privateSessionDurationMinutes: 60,
    });
    const cls = await save("Class", {
      name: "QA ca tập đôi",
      branchId: fixtures.branch.id,
      type: "semi_private",
      defaultMaxCapacity: 2,
      durationMinutes: 60,
    });
    const a = await newMember({ fullName: "QA An" }),
      b = await newMember({ fullName: "QA Bình" });
    const ma = await assign(a.member, {
        packageId: p.id,
        remainingSessions: 5,
      }),
      mb = await assign(b.member, { packageId: p.id, remainingSessions: 5 });
    return { p, cls, a, b, ma, mb };
  }
  const book = (m, mp, s) =>
    api(
      "/bookings/package-schedules",
      "POST",
      { memberPackageId: mp.id, scheduleIds: [s.id] },
      m,
      201,
    );

  await test(
    "FLOW-USAGE-ACCOUNTING",
    "Tách đã tập/đã đặt/còn đặt; điểm danh không trừ hai lần; hủy sớm hoàn và hủy muộn giữ buổi",
    async () => {
      const m = await newMember();
      const p = await save("Package", {
        name: "QA 5 buổi luồng mới",
        type: "session_based",
        totalSessions: 5,
        price: 1000000,
        durationDays: 180,
      });
      const mp = await assign(m.member, {
        packageId: p.id,
        remainingSessions: 5,
      });
      const ss = await Promise.all([schedule(), schedule(), schedule()]);
      const booked = await api(
        "/bookings/package-schedules",
        "POST",
        { memberPackageId: mp.id, scheduleIds: ss.map((s) => s.id) },
        m,
      );
      let own = (await api("/members/me/packages", "GET", undefined, m)).find(
        (p) => p.id === mp.id,
      );
      assert.deepEqual(
        [own.attendedSessions, own.reservedSessions, own.remainingSessions],
        [0, 3, 2],
      );
      let admin = await api(`/members/${m.member.id}`);
      assert.equal(admin.memberPackages[0].reservedSessions, 3);
      const first = await repo("Booking").findOneBy({
        scheduleId: ss[0].id,
        memberId: m.member.id,
      });
      await repo("ClassSchedule").update(ss[0].id, {
        startTime: new Date(Date.now() - 15 * 60000),
        endTime: new Date(Date.now() + 45 * 60000),
      });
      await api(
        "/check-ins/manual",
        "POST",
        { memberId: m.member.id, scheduleId: ss[0].id, bookingId: first.id },
        "staff",
      );
      own = (await api("/members/me/packages", "GET", undefined, m))[0];
      assert.deepEqual(
        [own.attendedSessions, own.reservedSessions, own.remainingSessions],
        [1, 2, 2],
      );
      const second = await repo("Booking").findOneBy({
        scheduleId: ss[1].id,
        memberId: m.member.id,
      });
      await api(`/bookings/${second.id}/cancel`, "PATCH", {}, m);
      await repo("ClassSchedule").update(ss[2].id, {
        startTime: new Date(Date.now() + 3600000),
        endTime: new Date(Date.now() + 7200000),
      });
      const third = await repo("Booking").findOneBy({
        scheduleId: ss[2].id,
        memberId: m.member.id,
      });
      await api(`/bookings/${third.id}/cancel`, "PATCH", {}, m);
      own = (await api("/members/me/packages", "GET", undefined, m))[0];
      assert.deepEqual(
        [
          own.attendedSessions,
          own.reservedSessions,
          own.remainingSessions,
          own.forfeitedSessions,
        ],
        [1, 0, 3, 1],
      );
      await api(
        "/check-ins/manual",
        "POST",
        { memberId: m.member.id },
        "staff",
      );
      own = (await api("/members/me/packages", "GET", undefined, m))[0];
      assert.deepEqual(
        [
          own.attendedSessions,
          own.reservedSessions,
          own.remainingSessions,
          own.otherUsedSessions,
        ],
        [2, 0, 2, 0],
      );
      assert.equal(booked.bookedCount, 3);
    },
  );

  await test(
    "FLOW-COACH-PREFERENCE",
    "Lưu/bỏ HLV ưu tiên và vẫn được đặt ca của HLV khác",
    async () => {
      const m = await newMember(),
        mp = await assign(m.member);
      await api(
        preference(mp.id),
        "PATCH",
        { preferredInstructorId: fixtures.coach.user.id },
        m,
      );
      let own = (await api("/members/me/packages", "GET", undefined, m))[0];
      assert.equal(own.preferredInstructor.id, fixtures.coach.user.id);
      const s = await schedule({ instructorId: fixtures.coach2.user.id });
      await book(m, mp, s);
      await api(preference(mp.id), "PATCH", { preferredInstructorId: null }, m);
      own = (await api("/members/me/packages", "GET", undefined, m))[0];
      assert.equal(own.preferredInstructor, null);
    },
  );

  await test(
    "FLOW-PREFERENCE-ACCESS",
    "Chặn sửa gói người khác, HLV sai, trường ghép đôi và trường số dư từ tài khoản học viên",
    async () => {
      const m = await newMember(),
        other = await newMember(),
        mp = await assign(m.member);
      await rejected(
        preference(mp.id),
        "PATCH",
        { preferredInstructorId: fixtures.coach.user.id },
        other,
        [403],
      );
      for (const id of [fixtures.admin.user.id, randomUUID(), "wrong"])
        await rejected(
          preference(mp.id),
          "PATCH",
          { preferredInstructorId: id },
          m,
        );
      await rejected(
        preference(mp.id),
        "PATCH",
        { duoPartnerPackageId: randomUUID() },
        m,
      );
      await rejected(preference(mp.id), "PATCH", { remainingSessions: 100 }, m);
      await rejected(
        settings(mp.id),
        "PATCH",
        { preferredInstructorId: null },
        m,
        [403],
      );
      await rejected(
        settings(mp.id),
        "PATCH",
        { preferredInstructorId: null },
        "coach",
        [403],
      );
      await api(
        settings(mp.id),
        "PATCH",
        { preferredInstructorId: fixtures.coach.user.id },
        "staff",
      );
    },
  );

  await test(
    "FLOW-DUO-PAIR",
    "Lễ tân ghép hai gói 1:2 đối ứng; hai vai trò đọc đúng người tập cùng",
    async () => {
      const d = await duo();
      const options = await api(
        `/packages/member-packages/${d.ma.id}/duo-options`,
        "GET",
        undefined,
        "staff",
      );
      assert.ok(options.some((p) => p.packageId === d.mb.id));
      await api(
        settings(d.ma.id),
        "PATCH",
        { duoPartnerPackageId: d.mb.id },
        "staff",
      );
      assert.equal(
        (await repo("MemberPackage").findOneBy({ id: d.mb.id }))
          .duoPartnerPackageId,
        d.ma.id,
      );
      const own = (await api("/members/me/packages", "GET", undefined, d.a))[0];
      assert.equal(own.duoPartner.memberId, d.b.member.id);
      assert.equal(own.duoPartner.fullName, "QA Bình");
      const admin = await api(`/members/${d.b.member.id}`);
      assert.equal(admin.memberPackages[0].duoPartner.memberId, d.a.member.id);
    },
  );

  await test(
    "FLOW-DUO-UNPAIRED",
    "Gói đôi chưa ghép không được đặt qua API đơn hoặc hàng loạt",
    async () => {
      const d = await duo(),
        s = await schedule({ classId: d.cls.id, maxCapacity: 2 });
      await rejected(
        "/bookings/package-schedules",
        "POST",
        { memberPackageId: d.ma.id, scheduleIds: [s.id] },
        d.a,
      );
      await rejected(`/schedules/${s.id}/book`, "POST", undefined, d.a);
      assert.equal(
        (await repo("MemberPackage").findOneBy({ id: d.ma.id }))
          .remainingSessions,
        5,
      );
      assert.equal(await repo("Booking").countBy({ scheduleId: s.id }), 0);
    },
  );

  await test(
    "FLOW-DUO-BOOK",
    "Hai người đặt cùng ca, mỗi người trừ đúng một buổi; chặn cặp khác và không lộ thông tin cặp",
    async () => {
      const d = await duo(),
        e = await duo();
      await api(settings(d.ma.id), "PATCH", { duoPartnerPackageId: d.mb.id });
      await api(settings(e.ma.id), "PATCH", { duoPartnerPackageId: e.mb.id });
      const s = await schedule({ classId: d.cls.id, maxCapacity: 2 });
      await book(d.a, d.ma, s);
      const scheduleList = await api(
        `/schedules?date=${s.startTime.slice(0, 10)}`,
        "GET",
        undefined,
        e.a,
      );
      assert.equal(
        scheduleList.find((v) => v.id === s.id).duoAvailableForMember,
        false,
      );
      await rejected(
        "/bookings/package-schedules",
        "POST",
        { memberPackageId: e.ma.id, scheduleIds: [s.id] },
        e.a,
        [409],
      );
      await book(d.b, d.mb, s);
      assert.equal(
        (await repo("MemberPackage").findOneBy({ id: d.ma.id }))
          .remainingSessions,
        4,
      );
      assert.equal(
        (await repo("MemberPackage").findOneBy({ id: d.mb.id }))
          .remainingSessions,
        4,
      );
      assert.equal(
        (await repo("MemberPackage").findOneBy({ id: e.ma.id }))
          .remainingSessions,
        5,
      );
    },
  );

  await test(
    "FLOW-DUO-LAST-CREDIT",
    "Người thứ hai vẫn đặt được khi người thứ nhất đã giữ buổi cuối cho cùng ca",
    async () => {
      const d = await duo();
      await api(settings(d.ma.id), "PATCH", { duoPartnerPackageId: d.mb.id });
      await repo("MemberPackage").update([d.ma.id, d.mb.id], {
        remainingSessions: 1,
      });
      const s = await schedule({ classId: d.cls.id, maxCapacity: 2 });
      await book(d.a, d.ma, s);
      await book(d.b, d.mb, s);
      assert.equal(
        (await repo("MemberPackage").findOneBy({ id: d.ma.id }))
          .remainingSessions,
        0,
      );
      assert.equal(
        (await repo("ClassSchedule").findOneBy({ id: s.id })).currentEnrolled,
        2,
      );
    },
  );

  await test(
    "FLOW-DUO-CHANGE-GUARD",
    "Chặn đổi cặp khi có lịch sắp tới; hủy lịch rồi bỏ ghép cập nhật cả hai phía",
    async () => {
      const d = await duo();
      await api(settings(d.ma.id), "PATCH", { duoPartnerPackageId: d.mb.id });
      const s = await schedule({ classId: d.cls.id, maxCapacity: 2 });
      const r = await book(d.a, d.ma, s);
      await rejected(
        settings(d.mb.id),
        "PATCH",
        { duoPartnerPackageId: null },
        "staff",
        [409],
      );
      await api(`/bookings/${r.bookingIds[0]}/cancel`, "PATCH", {}, d.a);
      await api(
        settings(d.ma.id),
        "PATCH",
        { duoPartnerPackageId: null },
        "staff",
      );
      assert.equal(
        (await repo("MemberPackage").findOneBy({ id: d.mb.id }))
          .duoPartnerPackageId,
        null,
      );
    },
  );

  await test(
    "FLOW-DUO-VALIDATION",
    "Không ghép chính mình, gói nhóm, khác thời lượng hoặc gói hết hạn",
    async () => {
      const d = await duo(),
        group = await assign(d.b.member);
      await rejected(settings(d.ma.id), "PATCH", {
        duoPartnerPackageId: d.ma.id,
      });
      await rejected(settings(d.ma.id), "PATCH", {
        duoPartnerPackageId: group.id,
      });
      await repo("MemberPackage").update(d.mb.id, {
        expiryDate: new Date(Date.now() - 86400000),
      });
      await rejected(settings(d.ma.id), "PATCH", {
        duoPartnerPackageId: d.mb.id,
      });
      assert.equal(
        (await repo("MemberPackage").findOneBy({ id: d.ma.id }))
          .duoPartnerPackageId,
        null,
      );
    },
  );

  await test(
    "FLOW-DUO-CONCURRENT-PAIR",
    "Hai yêu cầu cùng ghép một người chỉ một yêu cầu thành công, không làm lệch liên kết",
    async () => {
      const d = await duo(),
        e = await duo();
      const results = await Promise.all(
        [d.ma.id, e.ma.id].map((id) =>
          raw(settings(id), "PATCH", { duoPartnerPackageId: d.mb.id }),
        ),
      );
      assert.equal(results.filter((r) => r.status === 200).length, 1);
      assert.equal(results.filter((r) => r.status === 409).length, 1);
      const target = await repo("MemberPackage").findOneBy({ id: d.mb.id });
      assert.equal(
        (
          await repo("MemberPackage").findOneBy({
            id: target.duoPartnerPackageId,
          })
        ).duoPartnerPackageId,
        target.id,
      );
    },
  );

  await test(
    "FLOW-DUO-CONCURRENT-BOOK",
    "Hai cặp đặt cùng ca đồng thời không bị ghép chéo",
    async () => {
      const d = await duo(),
        e = await duo();
      await api(settings(d.ma.id), "PATCH", { duoPartnerPackageId: d.mb.id });
      await api(settings(e.ma.id), "PATCH", { duoPartnerPackageId: e.mb.id });
      const s = await schedule({ classId: d.cls.id, maxCapacity: 2 });
      const results = await Promise.all(
        [
          [d.a, d.ma],
          [e.a, e.ma],
        ].map(([m, mp]) =>
          raw(
            "/bookings/package-schedules",
            "POST",
            { memberPackageId: mp.id, scheduleIds: [s.id] },
            m,
          ),
        ),
      );
      assert.equal(results.filter((r) => r.status === 201).length, 1);
      assert.equal(results.filter((r) => r.status === 409).length, 1);
      assert.equal(
        (await repo("ClassSchedule").findOneBy({ id: s.id })).currentEnrolled,
        1,
      );
    },
  );
};
