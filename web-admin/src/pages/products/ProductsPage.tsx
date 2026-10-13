import { useState, useEffect } from 'react'
import {
  ShoppingBag, Plus, Search, Edit3, Trash2, Package,
  AlertCircle, CheckCircle2, ArrowUpDown, Tag
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/utils'
import { api } from '@/lib/axios'
import toast from 'react-hot-toast'

interface ProductItem {
  id: string
  name: string
  sku: string
  category: 'apparel' | 'equipment' | 'beverage' | 'accessory'
  price: number
  stockQuantity: number
  unit: string
  description: string
  isActive: boolean
}

const defaultProducts: ProductItem[] = [
  {
    id: 'p1',
    name: 'Thảm Tập Pilates Pro Grip 10mm',
    sku: 'THAM-01',
    category: 'equipment',
    price: 450000,
    stockQuantity: 30,
    unit: 'chiếc',
    description: 'Thảm TPE cao cấp chống trượt độ bám cao, êm ái khi tập',
    isActive: true,
  },
  {
    id: 'p2',
    name: 'Vòng Tập Pilates Magic Circle 38cm',
    sku: 'VONG-01',
    category: 'equipment',
    price: 320000,
    stockQuantity: 20,
    unit: 'chiếc',
    description: 'Vòng kháng lực hỗ trợ siết cơ đùi, cơ bụng và bắp tay',
    isActive: true,
  },
  {
    id: 'p3',
    name: 'Bóng Tập Pilates Mini Ball 25cm',
    sku: 'BONG-01',
    category: 'equipment',
    price: 180000,
    stockQuantity: 45,
    unit: 'quả',
    description: 'Bóng tập tăng cường cảm nhận cơ lõi và hỗ trợ thắt lưng',
    isActive: true,
  },
  {
    id: 'p4',
    name: 'Tất Chống Trượt Pilates Grip Socks',
    sku: 'TAT-01',
    category: 'accessory',
    price: 120000,
    stockQuantity: 60,
    unit: 'đôi',
    description: 'Tất dệt kim co giãn có hạt cao su chống trượt an toàn trên máy Reformer',
    isActive: true,
  },
  {
    id: 'p5',
    name: 'Bộ Quần Áo Tập Pilates Liền Thân Cao Cấp',
    sku: 'AO-01',
    category: 'apparel',
    price: 680000,
    stockQuantity: 15,
    unit: 'bộ',
    description: 'Chất liệu Spandex co giãn 4 chiều thoáng khí ôm sát cơ thể',
    isActive: true,
  },
  {
    id: 'p6',
    name: 'Nước Điện Giải Phục Hồi Cơ Electrolyte 500ml',
    sku: 'NUOC-01',
    category: 'beverage',
    price: 35000,
    stockQuantity: 100,
    unit: 'chai',
    description: 'Bổ sung khoáng chất và điện giải nhanh chóng sau buổi tập',
    isActive: true,
  },
]

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>(defaultProducts)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'equipment' as any,
    price: 0,
    stockQuantity: 10,
    unit: 'chiếc',
    description: '',
  })

  const [isStockModalOpen, setIsStockModalOpen] = useState(false)
  const [selectedStockProduct, setSelectedStockProduct] = useState<ProductItem | null>(null)
  const [stockChange, setStockChange] = useState(10)

  const isUuid = (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

  useEffect(() => {
    api.get('/products')
      .then((res) => {
        const payload = res.data?.data ?? res.data
        const items = Array.isArray(payload) ? payload : (payload?.items ?? [])
        if (items.length > 0) {
          setProducts(
            items.map((p: any) => ({
              id: p.id,
              name: p.name,
              sku: p.sku || `SKU-${p.id.slice(0, 4)}`,
              category: p.category || 'equipment',
              price: Number(p.price) || 0,
              stockQuantity: Number(p.stockQuantity) || 0,
              unit: p.unit || 'chiếc',
              description: p.description || '',
              isActive: p.isActive !== false,
            }))
          )
        }
      })
      .catch(() => {})
  }, [])

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter
    return matchSearch && matchCat
  })

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'apparel':
        return <Badge variant="default">Trang phục</Badge>
      case 'equipment':
        return <Badge variant="info">Dụng cụ tập</Badge>
      case 'beverage':
        return <Badge variant="success">Đồ uống</Badge>
      case 'accessory':
        return <Badge variant="secondary">Phụ kiện</Badge>
      default:
        return <Badge variant="default">{cat}</Badge>
    }
  }

  const handleOpenAdd = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      sku: `SKU-${Date.now().toString().slice(-4)}`,
      category: 'equipment',
      price: 250000,
      stockQuantity: 20,
      unit: 'chiếc',
      description: '',
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (p: ProductItem) => {
    setEditingProduct(p)
    setFormData({
      name: p.name,
      sku: p.sku,
      category: p.category,
      price: p.price,
      stockQuantity: p.stockQuantity,
      unit: p.unit,
      description: p.description,
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên sản phẩm')
      return
    }

    const payload = {
      name: formData.name,
      sku: formData.sku,
      category: formData.category,
      price: Number(formData.price),
      stockQuantity: Number(formData.stockQuantity),
      unit: formData.unit,
      description: formData.description,
      isActive: true,
    }

    try {
      if (editingProduct) {
        if (isUuid(editingProduct.id)) {
          await api.patch(`/products/${editingProduct.id}`, payload)
        }
        setProducts(
          products.map((p) =>
            p.id === editingProduct.id ? { ...p, ...payload } : p
          )
        )
        toast.success('Cập nhật sản phẩm thành công!')
      } else {
        let createdId = `p-${Date.now()}`
        const res = await api.post('/products', { ...payload, sku: payload.sku || undefined })
        const saved = res.data?.data || res.data
        if (saved?.id) createdId = saved.id
        const newProduct: ProductItem = {
          id: createdId,
          ...payload,
        }
        setProducts([newProduct, ...products])
        toast.success('Thêm sản phẩm mới thành công!')
      }
      setIsModalOpen(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu sản phẩm')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn ngừng bán sản phẩm này?')) return
    try {
      if (isUuid(id)) {
        await api.delete(`/products/${id}`)
      }
      setProducts(products.filter((p) => p.id !== id))
      toast.success('Xóa sản phẩm thành công!')
    } catch {
      toast.error('Không thể xóa sản phẩm lúc này')
    }
  }

  const handleUpdateStock = async () => {
    if (!selectedStockProduct) return
    const newQty = Math.max(0, selectedStockProduct.stockQuantity + Number(stockChange))
    try {
      if (isUuid(selectedStockProduct.id)) {
        await api.patch(`/products/${selectedStockProduct.id}/stock`, { change: Number(stockChange) })
      }
      setProducts(
        products.map((p) =>
          p.id === selectedStockProduct.id ? { ...p, stockQuantity: newQty } : p
        )
      )
      toast.success('Cập nhật số lượng tồn kho thành công!')
    } catch {
      toast.error('Không thể cập nhật số lượng tồn kho')
    }
    setIsStockModalOpen(false)
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản Lý Sản Phẩm & Cửa Hàng</h1>
          <p className="text-gray-500 text-sm mt-1">
            Quản lý các sản phẩm bán lẻ, dụng cụ hỗ trợ, phụ kiện và thức uống tại quầy phòng tập
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Thêm Sản Phẩm Mới
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 font-semibold uppercase">Tổng Số Sản Phẩm</div>
            <div className="text-2xl font-black text-gray-900 mt-1">{products.length}</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 font-semibold uppercase">Tổng Số Lượng Tồn Kho</div>
            <div className="text-2xl font-black text-gray-900 mt-1">
              {products.reduce((acc, p) => acc + Number(p.stockQuantity), 0)}
            </div>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <Package className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 font-semibold uppercase">Sản Phẩm Sắp Hết Hàng</div>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {products.filter((p) => p.stockQuantity < 20).length}
            </div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 font-semibold uppercase">Giá Trị Tồn Kho Ước Tính</div>
            <div className="text-xl font-black text-primary mt-1">
              {formatCurrency(products.reduce((acc, p) => acc + p.price * p.stockQuantity, 0))}
            </div>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Tag className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tìm theo tên hoặc mã SKU..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            className="border rounded-lg px-3 py-2 text-sm bg-white"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Tất cả danh mục</option>
            <option value="equipment">Dụng cụ tập</option>
            <option value="accessory">Phụ kiện</option>
            <option value="apparel">Trang phục</option>
            <option value="beverage">Đồ uống</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">Sản Phẩm</th>
                <th className="py-3 px-4">Mã SKU</th>
                <th className="py-3 px-4">Danh Mục</th>
                <th className="py-3 px-4 text-right">Giá Bán</th>
                <th className="py-3 px-4 text-center">Tồn Kho</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-500 line-clamp-1">{p.description}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-gray-500">{p.sku}</td>
                  <td className="py-3.5 px-4">{getCategoryBadge(p.category)}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                    {formatCurrency(p.price)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => {
                        setSelectedStockProduct(p)
                        setStockChange(10)
                        setIsStockModalOpen(true)
                      }}
                      className={`inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-full text-xs hover:opacity-80 transition ${
                        p.stockQuantity > 20
                          ? 'bg-green-100 text-green-700'
                          : p.stockQuantity > 0
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                      title="Bấm để điều chỉnh tồn kho"
                    >
                      {p.stockQuantity} {p.unit}
                      <ArrowUpDown className="w-3 h-3 ml-0.5" />
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Badge variant={p.isActive ? 'success' : 'secondary'}>
                      {p.isActive ? 'Đang bán' : 'Ngừng bán'}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(p)}
                        className="h-8 w-8 p-0"
                        title="Chỉnh sửa"
                      >
                        <Edit3 className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(p.id)}
                        className="h-8 w-8 p-0"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingProduct ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
        >
          <div className="space-y-4 py-2 text-sm">
            <div>
              <label className="font-medium text-gray-700 block mb-1">Tên sản phẩm *</label>
              <Input
                placeholder="VD: Thảm tập Pilates Grip 10mm"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-gray-700 block mb-1">Mã SKU</label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>
              <div>
                <label className="font-medium text-gray-700 block mb-1">Danh mục</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                >
                  <option value="equipment">Dụng cụ tập</option>
                  <option value="accessory">Phụ kiện</option>
                  <option value="apparel">Trang phục</option>
                  <option value="beverage">Đồ uống</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-medium text-gray-700 block mb-1">Giá bán (VNĐ) *</label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="font-medium text-gray-700 block mb-1">Số lượng tồn kho</label>
                <Input
                  type="number"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="font-medium text-gray-700 block mb-1">Đơn vị tính</label>
                <Input
                  placeholder="chiếc, đôi, bộ..."
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="font-medium text-gray-700 block mb-1">Mô tả sản phẩm</label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm min-h-[70px]"
                placeholder="Thông tin chất liệu, công dụng sản phẩm..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button onClick={handleSave}>Lưu Sản Phẩm</Button>
          </ModalFooter>
        </Modal>
      )}

      {isStockModalOpen && selectedStockProduct && (
        <Modal
          open={isStockModalOpen}
          onClose={() => setIsStockModalOpen(false)}
          title={`Điều Chỉnh Tồn Kho — ${selectedStockProduct.name}`}
        >
          <div className="space-y-4 py-2 text-sm">
            <div className="bg-gray-50 p-3 rounded-xl flex justify-between text-xs text-gray-600">
              <span>Tồn kho hiện tại: <strong>{selectedStockProduct.stockQuantity} {selectedStockProduct.unit}</strong></span>
              <span>Mã SKU: <strong>{selectedStockProduct.sku}</strong></span>
            </div>

            <div>
              <label className="font-medium text-gray-700 block mb-1">
                Số lượng nhập thêm (+) hoặc xuất bớt (-)
              </label>
              <Input
                type="number"
                value={stockChange}
                onChange={(e) => setStockChange(Number(e.target.value))}
              />
              <p className="text-xs text-gray-400 mt-1">
                Nhập số dương để nhập kho (VD: 10), nhập số âm để xuất kho (VD: -5)
              </p>
            </div>

            <div className="text-sm font-semibold text-primary">
              Tồn kho sau điều chỉnh: {Math.max(0, selectedStockProduct.stockQuantity + Number(stockChange))} {selectedStockProduct.unit}
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsStockModalOpen(false)}>Hủy</Button>
            <Button onClick={handleUpdateStock}>Xác Nhận Điều Chỉnh</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}
