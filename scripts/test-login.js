import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xvghmwfmjxramrsptxfh.supabase.co';
const supabaseKey = 'sb_publishable_DWoSSz1TRKd_UBvfE_5FoQ_qnJxLScL';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  console.log(`Login test for ${email}:`, error ? error.message : "Success");
}

async function run() {
  await testLogin('admin@nohope.cafe', 'AdminPassword!2024');
  await testLogin('kitchen@nohope.cafe', 'SharedKitchenPwd#123');
  await testLogin('staff@nohope.cafe', 'SharedStaffPwd#123');
}

run();
