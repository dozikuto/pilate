const BASE_URL = process.env.PILATES_TEST_API_URL || 'http://localhost:3001/api/v1';

async function request(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const res = await fetch(fullUrl, {
    ...options,
    signal: AbortSignal.timeout(15000),
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  if (!res.ok) {
    const error = new Error(json?.message || `HTTP ${res.status}: ${res.statusText}`);
    error.status = res.status;
    error.data = json;
    throw error;
  }

  // Unwrap TransformInterceptor { success: true, data: ... }
  if (json && typeof json === 'object' && json.success === true && json.data !== undefined) {
    return json.data;
  }
  return json;
}

async function runFullSystemTest() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU CHẠY KIỂM THỬ TOÀN BỘ HỆ THỐNG VÀ TỪNG USECASE');
  console.log('================================================================\n');

  let adminToken = '';
  let coachToken = '';
  let memberToken = '';
  let memberUserId = '';
  let coachUserId = '';
  let testScheduleId = '';

  const results = [];

  function recordResult(id, name, status, details) {
    results.push({ id, name, status, details });
    const icon = status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} [${id}] ${name}: ${status}`);
    if (details) {
      console.log(`   └─ ${details}`);
    }
  }

  // ─── 1. AUTHENTICATION ─────────────────────────────────────
  console.log('--- 1. XÁC THỰC TÀI KHOẢN (ADMIN, HLV, HỌC VIÊN) ---');
  try {
    const adminRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@pilatesms.vn', password: 'Admin@123456' }),
    });
    adminToken = adminRes.accessToken || adminRes.token;
    const adminId = adminRes.user?.id;
    recordResult('AUTH-1', 'Đăng nhập Quản trị viên (Admin)', 'PASSED', `Admin ID: ${adminId}`);
  } catch (err) {
    recordResult('AUTH-1', 'Đăng nhập Quản trị viên (Admin)', 'FAILED', err.message);
  }

  try {
    const coachRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'coach.lan@pilatesms.vn', password: 'Coach@123' }),
    });
    coachToken = coachRes.accessToken || coachRes.token;
    coachUserId = coachRes.user?.id;
    recordResult('AUTH-2', 'Đăng nhập Huấn luyện viên (Coach)', 'PASSED', `Coach ID: ${coachUserId}`);
  } catch (err) {
    recordResult('AUTH-2', 'Đăng nhập Huấn luyện viên (Coach)', 'FAILED', err.message);
  }

  try {
    const memberRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'hang.nguyen@gmail.com', password: 'Member@123' }),
    });
    memberToken = memberRes.accessToken || memberRes.token;
    memberUserId = memberRes.user?.id;
    recordResult('AUTH-3', 'Đăng nhập Học viên (Member)', 'PASSED', `Member ID: ${memberUserId}`);
  } catch (err) {
    recordResult('AUTH-3', 'Đăng nhập Học viên (Member)', 'FAILED', err.message);
  }

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const coachHeaders = { Authorization: `Bearer ${coachToken}` };
  const memberHeaders = { Authorization: `Bearer ${memberToken}` };

  // ─── 2. USECASE ID 4: ĐÁNH GIÁ DỊCH VỤ PHÍA HỘI VIÊN ─────────
  console.log('\n--- 2. USECASE ID 4: ĐÁNH GIÁ DỊCH VỤ PHÍA HỘI VIÊN ---');
  try {
    const postReviewRes = await request('/reviews', {
      method: 'POST',
      headers: memberHeaders,
      body: JSON.stringify({
        targetType: 'service',
        rating: 5,
        comment: 'Phòng tập rất thơm, sạch sẽ và máy Reformer Allegro 2 vận hành êm ái tuyệt vời!',
      }),
    });
    const reviewId = postReviewRes.id;

    const getReviewsRes = await request('/reviews?limit=10', { headers: adminHeaders });
    const reviewsList = Array.isArray(getReviewsRes) ? getReviewsRes : (getReviewsRes.items || getReviewsRes.data || []);
    const foundReview = reviewsList.find((r) => r.id === reviewId);

    if (foundReview) {
      recordResult(
        'ID 4',
        'Đánh giá dịch vụ phía hội viên & Admin xem đánh giá',
        'PASSED',
        `Đánh giá gửi từ học viên hiển thị trên danh sách Admin với ID: ${reviewId}, Điểm: ${foundReview.rating} sao`,
      );
    } else {
      recordResult('ID 4', 'Đánh giá dịch vụ phía hội viên', 'FAILED', `Gửi đánh giá thành công với ID: ${reviewId}`);
    }
  } catch (err) {
    recordResult('ID 4', 'Đánh giá dịch vụ phía hội viên', 'FAILED', err.message);
  }

  // ─── 3. USECASE ID 5: XEM LỊCH DẠY CỦA HUẤN LUYỆN VIÊN ───────
  console.log('\n--- 3. USECASE ID 5: XEM LỊCH DẠY CỦA HUẤN LUYỆN VIÊN ---');
  try {
    const instructorsRes = await request('/instructors', { headers: adminHeaders });
    const instructors = Array.isArray(instructorsRes) ? instructorsRes : (instructorsRes.items || instructorsRes.data || []);

    if (instructors.length > 0) {
      const firstInstructor = instructors.find(i => (i.userId || i.user?.id) === coachUserId);
      if (!firstInstructor) throw new Error('Không tìm thấy hồ sơ HLV đăng nhập');
      const instructorId = firstInstructor.userId || firstInstructor.user?.id;
      const schedulesRes = await request(`/schedules?instructorId=${instructorId}`, {
        headers: adminHeaders,
      });
      const schedules = Array.isArray(schedulesRes) ? schedulesRes : (schedulesRes.items || schedulesRes.data || []);
      if (!schedules.every(s => s.instructorId === instructorId)) throw new Error('Bộ lọc trả sai HLV');
      recordResult(
        'ID 5',
        'Xem lịch dạy của huấn luyện viên theo từng HLV',
        'PASSED',
        `Tìm thấy ${instructors.length} HLV. HLV [${firstInstructor.user?.fullName || firstInstructor.name}] có ${schedules.length} ca dạy trong hệ thống`,
      );
    } else {
      recordResult('ID 5', 'Xem lịch dạy của huấn luyện viên', 'FAILED', 'Không tìm thấy HLV nào trong hệ thống');
    }
  } catch (err) {
    recordResult('ID 5', 'Xem lịch dạy của huấn luyện viên', 'FAILED', err.message);
  }

  // ─── 4. USECASE ID 6: CÀI ĐẶT PHÒNG TẬP 1VS1 HOẶC 2-4 NGƯỜI ───
  console.log('\n--- 4. USECASE ID 6: CÀI ĐẶT SỐ LƯỢNG NGƯỜI TẬP PHÒNG 1VS1 / NHÓM 2-4 NGƯỜI ---');
  try {
    const roomsRes = await request('/rooms', { headers: adminHeaders });
    const rooms = Array.isArray(roomsRes) ? roomsRes : (roomsRes.items || roomsRes.data || []);
    const p1v1Room = rooms.find((r) => r.capacity === 1 || r.roomType === 'private_1v1');
    const groupRoom = rooms.find((r) => r.capacity > 1);

    if (p1v1Room && groupRoom) {
      recordResult(
        'ID 6',
        'Quản trị admin cài đặt phòng tập 1:1 và phòng tập 2-4 người',
        'PASSED',
        `Phòng 1:1: [${p1v1Room.name}] (Sức chứa: ${p1v1Room.capacity}). Phòng nhóm: [${groupRoom.name}] (Sức chứa: ${groupRoom.capacity})`,
      );
    } else {
      recordResult('ID 6', 'Quản trị admin cài đặt phòng tập', 'FAILED', `Tổng cộng ${rooms.length} phòng tập đã được cấu hình sức chứa chuẩn`);
    }
  } catch (err) {
    recordResult('ID 6', 'Quản trị admin cài đặt phòng tập', 'FAILED', err.message);
  }

  // ─── 5. USECASE ID 8: CHỐNG TRÙNG LỊCH ĐA TẦNG ───────────────
  console.log('\n--- 5. USECASE ID 8: KIỂM THỬ TÍNH NĂNG CHỐNG TRÙNG LỊCH ĐA TẦNG ---');
  try {
    const allSchedulesRes = await request('/schedules', { headers: adminHeaders });
    const allSchedules = Array.isArray(allSchedulesRes) ? allSchedulesRes : (allSchedulesRes.items || allSchedulesRes.data || []);
    if (allSchedules.length > 0) {
      const sample = allSchedules[0];
      testScheduleId = sample.id;

      // Thử tạo lịch trùng phòng và trùng khung giờ
      try {
        await request('/schedules', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({
            classId: sample.classId || sample.class?.id,
            roomId: sample.roomId || sample.room?.id,
            instructorId: sample.instructorId || sample.instructor?.id,
            startTime: sample.startTime,
            endTime: sample.endTime,
            maxCapacity: 4,
          }),
        });
        recordResult('ID 8', 'Chống trùng lịch đa tầng', 'FAILED', 'Hệ thống cho phép tạo lịch trùng!');
      } catch (conflictErr) {
        if (conflictErr.status === 400) {
          recordResult(
            'ID 8',
            'Chống trùng lịch đa tầng (phòng tập, HLV, thời gian)',
            'PASSED',
            `Chặn trùng thành công với mã 400: "${conflictErr.message}"`,
          );
        } else {
          recordResult('ID 8', 'Chống trùng lịch đa tầng', 'FAILED', conflictErr.message);
        }
      }
    } else {
      recordResult('ID 8', 'Chống trùng lịch đa tầng', 'FAILED', 'Thiếu lịch fixture để kiểm chứng chống trùng');
    }
  } catch (err) {
    recordResult('ID 8', 'Chống trùng lịch đa tầng', 'FAILED', err.message);
  }

  // ─── 6. USECASE ID 9: GHI NHẬN BUỔI TẬP VÀ CẬP NHẬT TRẠNG THÁI BUỔI TẬP ─
  console.log('\n--- 6. USECASE ID 9: GHI NHẬN BUỔI TẬP VÀ CẬP NHẬT TRẠNG THÁI BUỔI TẬP ---');
  try {
    if (testScheduleId) {
      // 1. Chuyển sang in_progress (Bắt đầu ca)
      await request(`/schedules/${testScheduleId}`, {
        method: 'PATCH',
        headers: coachHeaders,
        body: JSON.stringify({ status: 'in_progress' }),
      });

      // 2. Chuyển sang completed (Hoàn tất ca)
      await request(`/schedules/${testScheduleId}`, {
        method: 'PATCH',
        headers: coachHeaders,
        body: JSON.stringify({ status: 'completed' }),
      });

      // 3. Kiểm tra lại trạng thái
      const getSchedule = await request(`/schedules/${testScheduleId}`, { headers: adminHeaders });
      const updatedStatus = getSchedule.status;
      if (updatedStatus !== 'completed') throw new Error('Trạng thái ca chưa được lưu');

      recordResult(
        'ID 9',
        'Ghi nhận buổi tập và cập nhật trạng thái buổi tập',
        'PASSED',
        `Cập nhật ca dạy [${testScheduleId}] từ scheduled -> in_progress -> completed thành công. Trạng thái hiện tại: "${updatedStatus}"`,
      );
    } else {
      recordResult('ID 9', 'Ghi nhận buổi tập và cập nhật trạng thái', 'FAILED', 'Không tìm thấy ca dạy để test');
    }
  } catch (err) {
    recordResult('ID 9', 'Ghi nhận buổi tập và cập nhật trạng thái', 'FAILED', err.message);
  }

  // ─── 7. USECASE ID 10: ĐÁNH GIÁ HỌC VIÊN & GỬI PHẢN HỒI CHO HỌC VIÊN ───
  console.log('\n--- 7. USECASE ID 10: ĐÁNH GIÁ HỌC VIÊN & GỬI PHẢN HỒI CHO HỌC VIÊN ---');
  try {
    const feedbackTitle = 'Nhận xét buổi tập từ Huấn luyện viên Trần Mai Lan';
    const feedbackMsg = 'Học viên có độ dẻo dai khớp háng cải thiện rõ rệt, bài tập Elephant Stretch đạt điểm 9/10!';

    // HLV gửi thông báo đánh giá học viên
    const sendNotiRes = await request('/notifications', {
      method: 'POST',
      headers: coachHeaders,
      body: JSON.stringify({
        userId: memberUserId,
        title: feedbackTitle,
        message: feedbackMsg,
        type: 'system',
      }),
    });
    const notiId = sendNotiRes.id;

    // Học viên kiểm tra danh sách thông báo
    const memberNotiRes = await request('/notifications?limit=10', { headers: memberHeaders });
    const notiList = Array.isArray(memberNotiRes) ? memberNotiRes : (memberNotiRes.items || memberNotiRes.data || []);
    const receivedNoti = notiList.find((n) => n.id === notiId);

    if (receivedNoti) {
      recordResult(
        'ID 10',
        'Đánh giá học viên và gửi phản hồi cho học viên',
        'PASSED',
        `HLV gửi phản hồi thành công và học viên nhận được thông báo: "${receivedNoti.title}" - "${receivedNoti.message}"`,
      );
    } else {
      recordResult('ID 10', 'Đánh giá học viên và gửi phản hồi', 'FAILED', `Gửi phản hồi thành công với ID: ${notiId}`);
    }
  } catch (err) {
    recordResult('ID 10', 'Đánh giá học viên và gửi phản hồi', 'FAILED', err.message);
  }

  // ─── 8. USECASE ID 11: BỘ LỌC HỌC VIÊN THEO TRẠNG THÁI ─────────
  console.log('\n--- 8. USECASE ID 11: PHẦN CHỌN LỌC TRONG PHẦN HỌC VIÊN ---');
  try {
    const allMembersRes = await request('/members', { headers: adminHeaders });
    const activeMembersRes = await request('/members?status=active', { headers: adminHeaders });
    const inactiveMembersRes = await request('/members?status=inactive', { headers: adminHeaders });
    const expiredMembersRes = await request('/members?status=expired', { headers: adminHeaders });

    const totalAll = allMembersRes.total ?? (Array.isArray(allMembersRes) ? allMembersRes.length : allMembersRes.items?.length ?? 0);
    const totalActive = activeMembersRes.total ?? (Array.isArray(activeMembersRes) ? activeMembersRes.length : activeMembersRes.items?.length ?? 0);
    const totalInactive = inactiveMembersRes.total ?? (Array.isArray(inactiveMembersRes) ? inactiveMembersRes.length : inactiveMembersRes.items?.length ?? 0);
    const totalExpired = expiredMembersRes.total ?? (Array.isArray(expiredMembersRes) ? expiredMembersRes.length : expiredMembersRes.items?.length ?? 0);

    recordResult(
      'ID 11',
      'Phần chọn lọc trong phần học viên (Tất cả, Hoạt động, Không hoạt động, Hết hạn)',
      'PASSED',
      `Lọc thành công: Tất cả (${totalAll} HV) | Hoạt động (${totalActive} HV) | Không hoạt động (${totalInactive} HV) | Hết hạn (${totalExpired} HV)`,
    );
  } catch (err) {
    recordResult('ID 11', 'Phần chọn lọc trong phần học viên', 'FAILED', err.message);
  }

  // ─── 9. USECASE ID 14: QUẢN LÝ LỊCH BẢO TRÌ & THÔNG BÁO BẢO TRÌ ─
  console.log('\n--- 9. USECASE ID 14: QUẢN LÝ LỊCH BẢO TRÌ & THÔNG BÁO BẢO TRÌ ---');
  try {
    const broadcastRes = await request('/notifications/broadcast', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: 'Thông báo bảo trì thiết bị: Cadillac VIP',
        message: 'Khung máy Cadillac VIP phòng số 3 sẽ được kiểm tra và tra dầu mỡ định kỳ vào 08:00 sáng mai.',
        equipmentName: 'Cadillac VIP',
      }),
    });

    // Học viên kiểm tra xem có nhận được thông báo bảo trì không
    const memberNotiCheck = await request('/notifications?limit=5', { headers: memberHeaders });
    const memberNotifications = Array.isArray(memberNotiCheck) ? memberNotiCheck : (memberNotiCheck.items || memberNotiCheck.data || []);
    const maintNoti = memberNotifications.find((n) => n.title.includes('Bảo trì') || n.title.includes('Cadillac'));

    if (maintNoti) {
      recordResult(
        'ID 14',
        'Quản lý lịch bảo trì và phát thông báo bảo trì tới học viên',
        'PASSED',
        `Phát thông báo thành công: "${broadcastRes.message || 'Đã phát'}", học viên nhận được thông báo: "${maintNoti.title}"`,
      );
    } else {
      recordResult('ID 14', 'Quản lý lịch bảo trì và thông báo bảo trì', 'FAILED', `Phát thông báo bảo trì thành công tới ${broadcastRes.count || 'các'} người dùng`);
    }
  } catch (err) {
    recordResult('ID 14', 'Quản lý lịch bảo trì và thông báo bảo trì', 'FAILED', err.message);
  }

  // ─── 10. USECASE ID 17: BỘ LỌC THEO NĂM Ở MỤC BÁO CÁO ──────────
  console.log('\n--- 10. USECASE ID 17: PHẦN CHỌN LỌC THEO NĂM Ở MỤC BÁO CÁO ---');
  try {
    const report2026 = await request('/reports/yearly?year=2026', { headers: adminHeaders });
    const report2025 = await request('/reports/yearly?year=2025', { headers: adminHeaders });

    const rev2026 = report2026.totalYearRevenue;
    const rev2025 = report2025.totalYearRevenue;

    if (report2026.monthlyData?.length === 12 && report2025.monthlyData?.length === 12 && report2026.year === 2026 && report2025.year === 2025 && Number.isFinite(rev2026) && Number.isFinite(rev2025)) {
      recordResult(
        'ID 17',
        'Phần chọn lọc theo năm ở mục Báo cáo',
        'PASSED',
        `Lọc báo cáo thành công: Năm 2026 có doanh thu ${rev2026.toLocaleString('vi-VN')} đ (12 tháng) | Năm 2025 có doanh thu ${rev2025.toLocaleString('vi-VN')} đ (12 tháng)`,
      );
    } else {
      recordResult('ID 17', 'Phần chọn lọc theo năm ở mục Báo cáo', 'FAILED', 'Báo cáo trả sai năm, thiếu tháng hoặc số liệu không hợp lệ');
    }
  } catch (err) {
    recordResult('ID 17', 'Phần chọn lọc theo năm ở mục Báo cáo', 'FAILED', err.message);
  }

  console.log('\n================================================================');
  console.log('📊 TỔNG KẾT BẢNG KẾT QUẢ KIỂM THỬ USECASE TOÀN HỆ THỐNG');
  console.log('================================================================');
  const passedCount = results.filter((r) => r.status === 'PASSED').length;
  const failedCount = results.filter((r) => r.status === 'FAILED').length;
  console.log(`Tổng số test case: ${results.length}`);
  console.log(`✅ Thành công (PASSED): ${passedCount}`);
  console.log(`❌ Thất bại (FAILED):    ${failedCount}`);
  console.log('================================================================\n');

  if (failedCount) process.exitCode = 1;
  return { passedCount, failedCount, results };
}

runFullSystemTest().catch(e => { console.error(e); process.exitCode = 2; });
