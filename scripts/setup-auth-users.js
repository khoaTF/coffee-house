import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = 'https://xvghmwfmjxramrsptxfh.supabase.co';
const supabaseKey = 'sb_publishable_DWoSSz1TRKd_UBvfE_5FoQ_qnJxLScL';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY in .env");
  process.exit(1);
}

// We need service_role key to bypass rate limits or email confirmations easily if possible.
// If not, we'll just try standard signUp and if email confirmations are off, it will work.
const supabase = createClient(supabaseUrl, supabaseKey);

const defaultUsers = [
  { email: 'admin@nohope.cafe', password: process.env.ADMIN_PASSWORD, role: 'admin' },
  { email: 'kitchen@nohope.cafe', password: process.env.KITCHEN_PASSWORD, role: 'kitchen' },
  { email: 'staff@nohope.cafe', password: process.env.STAFF_PASSWORD, role: 'staff' }
].filter(user => {
  if (!user.password) {
    console.warn(`⚠️ Bỏ qua tài khoản ${user.email} vì chưa cấu hình biến môi trường mật khẩu tương ứng (ví dụ: ADMIN_PASSWORD).`);
    return false;
  }
  return true;
});

async function setupUsers() {
  for (const user of defaultUsers) {
    console.log(`Setting up ${user.email}...`);
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        console.log(`User ${user.email} already exists.`);
      } else {
        console.error(`Error creating ${user.email}:`, error.message);
      }
    } else {
      console.log(`Successfully created/updated ${user.email}.`);
    }
  }
}

setupUsers();
