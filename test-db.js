require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
(async () => {
    try {
        let { data, error } = await supabase.from('users').select('*');
        if (error) console.log("DB ERROR:", error);
        else console.log('Users in DB: ' + data.length, data.map(d => d.role));
    } catch(e) {
        console.log("EXEC ERROR:", e);
    }
})();
