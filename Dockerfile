# Sử dụng Base Image Node.js tối ưu (Alpine)
FROM node:20-alpine AS builder

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy package config
COPY package*.json ./

# Cài đặt toàn bộ dependencies
RUN npm ci

# Copy toàn bộ mã nguồn
COPY . .

# Xóa devDependencies để tối ưu dung lượng (Production)
RUN npm prune --production

# --- Stage 2: Production ---
FROM node:20-alpine

WORKDIR /app

# Copy thư mục build và node_modules từ stage trên
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public

# Biến môi trường mặc định
ENV NODE_ENV=production
ENV PORT=3000

# Chạy dưới quyền user node để tăng cường bảo mật
USER node

# Mở cổng
EXPOSE 3000

# Khởi chạy server
CMD ["node", "src/server.js"]
