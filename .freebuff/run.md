# AniMaker — Preview Run Doc

Static site (plain HTML/CSS/JS + Supabase). No build step, no dependencies, no package.json scripts.

## Reproduce artifacts

None needed — there are no env files, lockfile installs, or build outputs.
Supabase credentials are hardcoded in `js/supabase.js` (anon key, public by design).

## Run the server

Any static file server rooted at the repo root works. The currently used one is a
tiny Node built-in server (no npm install required), listening on **127.0.0.1:8791**
(port chosen arbitrarily; any free port works — pages are relative-linked):

```bash
node -e "
const http = require('http'), fs = require('fs'), path = require('path');
const root = process.cwd();
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(root, p);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream'});
    res.end(data);
  });
}).listen(8791, '127.0.0.1');
"
```

Windows-detached variant (used for the live preview):

```powershell
powershell -NoProfile -Command "(Start-Process -FilePath 'node.exe' -ArgumentList '-e','<the script above, single-quoted>' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
```

Notes:
- Entry points: `/index.html` (home) and `/pages/*.html` (galleries, chat, profile).
- Login state lives in localStorage per origin; the chat page requires a logged-in session.
- Supabase Realtime requires the page to be served over http://127.0.0.1 (localhost) — which this is.
