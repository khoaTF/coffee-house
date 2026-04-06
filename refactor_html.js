const fs = require('fs');

let html = fs.readFileSync('public/pages/index.html', 'utf8');
let addedEvents = [];
let idCounter = 1;

html = html.replace(/<[^>]+(onclick|onchange)=["']([^"']+)["'][^>]*>/g, (match, type, code) => {
    // Check if element has an ID
    let idMatch = match.match(/id=["']([^"']+)["']/);
    let elemId = idMatch ? idMatch[1] : null;

    if (!elemId) {
        elemId = `auto-btn-${idCounter++}`;
        // Insert ID before the first attribute
        match = match.replace(/^<([a-zA-Z0-9-]+)\s*/, `<$1 id="${elemId}" `);
    }

    // Remove the onclick/onchange
    let newMatch = match.replace(new RegExp(`\\s*${type}=["'][^"']+["']`), '');
    
    let eventName = type === 'onclick' ? 'click' : 'change';
    addedEvents.push(`\ndocument.getElementById('${elemId}')?.addEventListener('${eventName}', function(event) {\n    ${code}\n});`);

    return newMatch;
});

fs.writeFileSync('public/pages/index.html', html, 'utf8');
fs.writeFileSync('tmp_events.js', addedEvents.join('\n'), 'utf8');
console.log('Done refactoring HTML!');
