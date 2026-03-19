try { require('./server.js'); } catch(e) { console.error("ERROR NAME:", e.name); console.error("ERROR MSG:", e.message); console.error(e.stack); process.exit(1); }
