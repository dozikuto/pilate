import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateMember, useMember, useUpdateMember, memberError } from '@/hooks/useMembers'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'

const phone = /^0\d{9}$/
const schema = z.object({
  name: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(200, 'Họ tên quá dài'),
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
  phone: z.string().trim().regex(phone, 'Số điện thoại phải có 10 số, bắt đầu bằng 0'),
  dateOfBirth: z.string(),
  gender: z.enum(['', 'male', 'female', 'other']),
  address: z.string().trim(),
  emergencyContact: z.string().trim(),
  emergencyPhone: z.string().trim().refine(value => !value || phone.test(value), 'SĐT khẩn cấp phải có 10 số, bắt đầu bằng 0'),
  healthNotes: z.string().trim(),
  goals: z.string().trim(),
})
type FormValues = z.infer<typeof schema>
const empty: FormValues = {
  name: '', email: '', phone: '', dateOfBirth: '', gender: '', address: '',
  emergencyContact: '', emergencyPhone: '', healthNotes: '', goals: '',
}

export default function MemberFormModal({ memberId, onClose }: { memberId?: string; onClose: () => void }) {
  const memberQuery = useMember(memberId ?? '')
  const create = useCreateMember()
  const update = useUpdateMember(memberId ?? '')
  const [initialized, setInitialized] = useState(!memberId)
  const [serverError, setServerError] = useState('')
  const { register, reset, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema), defaultValues: empty,
  })
  const saving = create.isPending || update.isPending
  useEffect(() => {
    if (!initialized && memberQuery.data) {
      const m = memberQuery.data
      reset({ name: m.name, email: m.email, phone: m.phone,
        dateOfBirth: m.dateOfBirth?.slice(0, 10) ?? '', gender: m.gender ?? '', address: m.address ?? '',
        emergencyContact: m.emergencyContact ?? '', emergencyPhone: m.emergencyPhone ?? '',
        healthNotes: m.healthNotes ?? '', goals: m.goals ?? '' })
      setInitialized(true)
    }
  }, [initialized, memberQuery.data, reset])
  const close = () => { if (!saving) onClose() }
  const submit = async (values: FormValues) => {
    if (saving) return
    setServerError('')
    try {
      await (memberId ? update : create).mutateAsync(values)
      onClose()
    } catch (error) { setServerError(memberError(error)) }
  }
  return <Modal open title={memberId ? 'Chỉnh sửa học viên' : 'Thêm học viên mới'} size="xl" onClose={close} hideClose={saving}>
    {!initialized ? memberQuery.isError ? <div role="alert" className="space-y-4">
      <p className="text-red-700">Không tải được hồ sơ để chỉnh sửa.</p>
      <Button variant="outline" onClick={() => memberQuery.refetch()}>Thử lại</Button>
    </div> : <p className="py-8 text-center text-gray-500" role="status">Đang tải hồ sơ học viên…</p> :
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <fieldset disabled={saving} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><Input {...register('name')} label="Họ và tên" required error={errors.name?.message} autoComplete="name" /></div>
        <Input {...register('phone')} label="Số điện thoại" type="tel" required error={errors.phone?.message} autoComplete="tel" />
        <Input {...register('email')} label="Email" type="email" required error={errors.email?.message} autoComplete="email"
          helperText={memberId ? 'Email này được dùng để đăng nhập tài khoản học viên.' : undefined} />
        <Input {...register('dateOfBirth')} label="Ngày sinh" type="date" error={errors.dateOfBirth?.message} />
        <div className="flex flex-col gap-1">
          <label htmlFor="member-gender" className="text-sm font-medium text-gray-700">Giới tính</label>
          <select id="member-gender" {...register('gender')} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
            <option value="">Chưa cung cấp</option><option value="female">Nữ</option><option value="male">Nam</option><option value="other">Khác</option>
          </select>
        </div>
        <div className="sm:col-span-2"><Input {...register('address')} label="Địa chỉ" autoComplete="street-address" /></div>
        <Input {...register('emergencyContact')} label="Người liên hệ khẩn cấp" />
        <Input {...register('emergencyPhone')} label="SĐT khẩn cấp" type="tel" error={errors.emergencyPhone?.message} />
        <div className="sm:col-span-2"><Textarea {...register('healthNotes')} label="Ghi chú sức khỏe" rows={3} /></div>
        <div className="sm:col-span-2"><Textarea {...register('goals')} label="Mục tiêu tập luyện" rows={3} /></div>
      </fieldset>
      {serverError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</p>}
      <ModalFooter>
        <Button type="button" variant="outline" onClick={close} disabled={saving}>Hủy</Button>
        <Button type="submit" loading={saving}>{memberId ? 'Lưu thay đổi' : 'Thêm học viên'}</Button>
      </ModalFooter>
    </form>}
  </Modal>
}
