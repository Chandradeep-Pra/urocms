const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const student = process.argv[2] === 'student';
const root = path.resolve(__dirname, '..');
const cwd = student ? path.resolve(root, '../testing-zone') : root;
const port = student ? 3101 : 3100;
const probe = net.createServer();
probe.once('error', error => { console.error(`Port ${port}: ${error.code}`); process.exitCode = 1; });
probe.listen(port, '127.0.0.1', () => probe.close(() => {
  const log = fs.openSync(path.join(__dirname, student ? 'student-preview.log' : 'admin-preview.log'), 'a');
  const child = spawn(process.execPath, [path.join(cwd, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd, detached: true, windowsHide: true, stdio: ['ignore', log, log],
    env: { ...process.env, UROLOGICS_API_BASE: 'http://127.0.0.1:3100' },
  });
  child.unref();
  console.log(JSON.stringify({ pid: child.pid, url: `http://127.0.0.1:${port}${student ? '/web/courses' : ''}` }));
}));
