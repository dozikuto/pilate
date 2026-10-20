interface AccountForm {
  fullName: string
  phone: string
  role: string
  password: string
}

export function userAccountUpdate(form: AccountForm) {
  if (form.password && form.password.length < 8) {
    throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự')
  }
  return {
    fullName: form.fullName.trim(),
    phone: form.phone,
    role: form.role,
    ...(form.password ? { password: form.password } : {}),
  }
}
