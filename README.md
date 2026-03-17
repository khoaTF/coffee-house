# Serenity Cafe - Project Handover

This folder contains the complete source code for the Serenity Cafe real-time ordering system.

## Project Features
- **Real-time Kitchen/Admin Sync**: Orders appear instantly across all dashboards.
- **QR Code Table Ordering**: Customers scan and order with automatic table tracking.
- **Enterprise UI**: Dark-themed, glassmorphic design with PWA support (installable on mobile).
- **Inventory Management**: Automatic stock deduction based on recipes.
- **Multi-language**: Built-in support for Vietnamese and English.
- **Admin Analytics**: Revenue tracking, feedback stats, and CSV data export.

## How to Set Up on a New PC

1. **Prerequisites**:
   - Install **Node.js** (LTS version).
   - (Optional) Install **MongoDB** if you want to use persistent storage (instead of memory-only).

2. **Installation**:
   ```bash
   # Navigate to the project folder
   npm install
   ```

3. **Configuration**:
   - Copy `.env.example` to `.env` (if applicable) and configure your `MONGO_URI` and `JWT_SECRET`.
   - If no `.env` is provided, the app will run in **Memory Mode** (data resets on restart).

4. **Running the App**:
   ```bash
   npm start
   # Or directly
   node server.js
   ```

5. **Access**:
   - **Customer**: `http://localhost:3000?table=1`
   - **Kitchen**: `http://localhost:3000/kitchen.html`
   - **Admin**: `http://localhost:3000/admin.html`

## Contacts & Support
For any questions regarding the logic or deployment, please refer to the `walkthrough.md` artifact from the previous development session.
