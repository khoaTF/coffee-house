// Bootstrap script to download npm and install dependencies
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const zlib = require('zlib');
const tar = require('tar'); // not available, let's do manual

// Download file helper
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (e) => { fs.unlinkSync(dest); reject(e); });
  });
}

// Use node built-in zlib to unzip 
async function main() {
  const nodeDir = path.dirname(process.execPath);
  const npmTarball = path.join(__dirname, '_npm.tgz');
  const npmExtracted = path.join(__dirname, '_npm_pkg');
  
  console.log('Downloading npm...');
  await download('https://registry.npmjs.org/npm/-/npm-10.9.2.tgz', npmTarball);
  console.log('npm tarball downloaded:', npmTarball);
  
  // Extract using PowerShell
  const ps = spawnSync('powershell', [
    '-Command',
    `Expand-Archive -Force -LiteralPath "${npmTarball}" -DestinationPath "${npmExtracted}" 2>&1 ; echo DONE`
  ], { encoding: 'utf8', timeout: 60000 });
  console.log('Extract result:', ps.stdout || ps.stderr);
  
  // npm bin should be in extracted/package/bin/npm
  const npmBin = path.join(npmExtracted, 'package', 'bin', 'npm-cli.js');
  if (fs.existsSync(npmBin)) {
    console.log('npm-cli.js found at:', npmBin);
    console.log('Running npm install...');
    const result = spawnSync(process.execPath, [npmBin, 'install'], {
      cwd: __dirname,
      stdio: 'inherit',
      encoding: 'utf8',
      timeout: 120000
    });
    console.log('npm install exit code:', result.status);
  } else {
    // List what was extracted  
    function listDir(d, depth=0) {
      if (!fs.existsSync(d)) return;
      if (depth > 3) return;
      for (const f of fs.readdirSync(d)) {
        console.log('  '.repeat(depth) + f);
        const fp = path.join(d, f);
        if (fs.statSync(fp).isDirectory()) listDir(fp, depth+1);
      }
    }
    console.log('Contents of', npmExtracted);
    listDir(npmExtracted);
  }
}

main().catch(console.error);
