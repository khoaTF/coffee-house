---
aliases: [Sơ đồ trang, Page Map, Website Structure]
tags: [map, navigation, overview]
type: map
---

# 🗺️ Sơ Đồ Mạng Lưới Trang Web

> Bản đồ tổng quan các trang trong hệ thống Nohope Coffee và mối liên kết giữa chúng.
> **Mở Graph View trong Obsidian** (`Ctrl+G`) để xem sơ đồ trực quan.

---

## 📊 Tổng quan hệ thống

| Nhóm | Trang | Mô tả |
|-------|-------|-------|
| 🌐 **Public** | [[index]], [[delivery]], [[tracking]], [[tv]], [[guide]] | Không cần đăng nhập |
| 🔐 **Auth** | [[login]] | Cổng xác thực |
| 🔒 **Protected** | [[admin]], [[kitchen]], [[staff]], [[driver]] | Cần đăng nhập |
| 🛡️ **System** | [[superadmin]] | Truy cập URL trực tiếp |

---

## 🔗 Bản đồ liên kết

### Hub xác thực: [[login]]
```
         ┌→ [[admin]]     (role: admin/manager)
login ───┼→ [[kitchen]]   (role: kitchen)  
         └→ [[staff]]     (role: staff - default)
         
         ↑ redirect khi unauthorized
    [[admin]] + [[staff]] + [[kitchen]]
```

### Hub quản trị: [[admin]]
```
admin ──→ [[index]]      (sidebar: trang đặt hàng)
admin ──→ [[kitchen]]    (sidebar: trang bếp)
admin ──→ [[guide]]      (sidebar: hướng dẫn)
admin ──→ [[login]]      (logout)
```

### Hub tài liệu: [[guide]]
```
guide ──→ [[index]] + [[delivery]] + [[tracking]]
guide ──→ [[kitchen]] + [[staff]] + [[driver]]  
guide ──→ [[tv]] + [[admin]] + [[login]]
```

### Luồng giao hàng
```
[[delivery]] ←→ [[tracking]]
[[delivery]] ──→ [[index]] (logo)
[[driver]]   ... (dữ liệu realtime, không link)
```

### Trang độc lập
```
[[tv]]          → Không có link ra (hiển thị đơn hàng)
[[driver]]      → Không có link ra (app tài xế)
[[superadmin]]  → Hoàn toàn cô lập (bảo mật)
```

---

## 📈 Thống kê liên kết

| Trang | Links đi | Links đến | Loại |
|-------|---------|----------|------|
| [[guide]] | 9 | 1 | 🌟 Hub tài liệu |
| [[login]] | 4 | 4 | 🔄 Hub xác thực |
| [[admin]] | 4 | 3 | 🔄 Hub quản trị |
| [[kitchen]] | 2 | 3 | 🔄 Hai chiều |
| [[delivery]] | 1 | 2 | → Một chiều |
| [[tracking]] | 1 | 1 | ↔ Hai chiều |
| [[index]] | 0 | 4 | ← Chỉ nhận link |
| [[staff]] | 1 | 2 | ← Chủ yếu nhận |
| [[driver]] | 0 | 1 | 🔇 Độc lập |
| [[tv]] | 0 | 1 | 🔇 Độc lập |
| [[superadmin]] | 0 | 0 | 🔇 Cô lập |

---

## 🎨 Hướng dẫn xem Graph View

1. Mở Obsidian → `Ctrl+G` (hoặc command palette → "Graph view")
2. Filter theo folder: `path:pages/`
3. Bật **Arrows** để thấy hướng liên kết
4. Group by tags để phân loại màu:
   - 🟢 `public` = Trang công khai
   - 🔴 `protected` = Trang cần đăng nhập
   - 🟡 `auth` = Trang xác thực
   - ⚪ `system` = Trang hệ thống
