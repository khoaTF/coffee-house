---
aliases: [Đăng nhập, Login Page]
tags: [page, auth, entry-point]
type: page
route: /login
file: pages/login.html
role: public
---

# 🔐 Trang Đăng Nhập (login)

> Cổng xác thực cho nhân viên - phân quyền tự động dựa trên role.

## Thông tin

| Thuộc tính | Giá trị |
|-----------|---------|
| **Route** | `/login` |
| **File** | `public/pages/login.html` |
| **Quyền truy cập** | 🌐 Public |
| **Xác thực** | Supabase Auth |

## Chức năng chính
- Đăng nhập bằng email/password
- Tự động redirect theo role sau khi đăng nhập thành công
- Hiển thị logo và branding

## Liên kết đến các trang khác

### Redirect theo role (sau đăng nhập)
- → [[admin]] khi role = `admin` hoặc `manager`
- → [[kitchen]] khi role = `kitchen`
- → [[staff]] khi role = `staff` (default)

### Links trong giao diện
- → [[index]] → Logo link & footer "Powered by Nohope Coffee System"

### Các trang redirect VỀ trang login
- [[admin]] → Khi chưa đăng nhập / session hết hạn / logout
- [[staff]] → Khi chưa đăng nhập / session hết hạn / logout
- [[kitchen]] → Khi chưa đăng nhập / session hết hạn / logout

## Luồng người dùng
```
login → (xác thực) → admin / kitchen / staff
         ↑
   admin, staff, kitchen (logout/unauthorized)
```

## Ghi chú
- Đây là **hub xác thực trung tâm** của hệ thống
- Tất cả trang nhân viên đều redirect về đây khi unauthorized
