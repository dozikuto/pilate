export function passwordChangeRequest(oldPassword: string, newPassword: string, confirmation: string) {
  if (!oldPassword || !newPassword || !confirmation) {
    throw new Error('Vui lòng điền đầy đủ thông tin.')
  }
  if (newPassword.length < 8) {
    throw new Error('Mật khẩu mới tối thiểu 8 ký tự.')
  }
  if (newPassword !== confirmation) {
    throw new Error('Mật khẩu xác nhận không khớp.')
  }
  return { oldPassword, newPassword }
}
