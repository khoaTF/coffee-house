const { createClient } = require('@supabase/supabase-js');
const sbUrl = 'https://xvghmwfmjxramrsptxfh.supabase.co';
const sbKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2Z2htd2ZtanhyYW1yc3B0eGZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTU2MjksImV4cCI6MjA4OTI3MTYyOX0.liWyBJwqGQ7z-kTfzfK0NQWrYgqOECZq51pGMFdk5H4';
const supabase = createClient(sbUrl, sbKey);

async function test() {
  console.log('Testing signInWithPassword for admin@nohope.cafe...');
  try {
    const res = await supabase.auth.signInWithPassword({
        email: 'admin@nohope.cafe',
        password: 'AdminPassword!2024'
    });
    console.log('Login Result:', res.data.user ? 'SUCCESS - User ID: ' + res.data.user.id : 'FAIL');
    if (res.error) console.error('Error:', res.error);
    
    // Test staff
    const resStaff = await supabase.auth.signInWithPassword({
        email: 'staff@nohope.cafe',
        password: 'SharedStaffPwd#123'
    });
    console.log('Staff Login Result:', resStaff.data.user ? 'SUCCESS' : 'FAIL');
    if (resStaff.error) console.error('Error (staff):', resStaff.error);
    
  } catch (err) {
    console.error('Exception:', err.message);
  }
}
test();
