---
aliases: [Super Admin, Quản trị hệ thống]
tags: [page, protected, superadmin, system]
type: page
route: /superadmin
file: pages/superadmin.html
role: superadmin
---

# 🛡️ Trang Super Admin (superadmin)

> Quản trị cấp hệ thống - quản lý toàn bộ cấu hình và người dùng.

## Thông tin

| Thuộc tính | Giá trị |
|-----------|---------|
| **Route** | `/superadmin` |
| **File** | `public/pages/superadmin.html` |
| **Quyền truy cập** | 🔒🔒 Super Admin (cao nhất) |
| **Bảo mật** | Cấp cao nhất |

## Chức năng chính
- Quản lý tất cả tài khoản nhân viên
- Cấu hình hệ thống
- Giám sát toàn bộ hoạt động

## Liên kết đến các trang khác

### Navigation
- Không có liên kết trực tiếp đến trang khác trong code HTML

### Các trang liên kết ĐẾN trang superadmin
- Không có trang nào link trực tiếp (truy cập bằng URL thủ công)

## Luồng người dùng
```
(URL trực tiếp) → superadmin → (độc lập)
```

## Ghi chú
- Trang **cô lập hoàn toàn** - không link đến và không được link từ trang nào
- Truy cập bằng URL trực tiếp `/superadmin`
- Đây là trang bảo mật cao nhất, cố tình không được liên kết trong navigation
