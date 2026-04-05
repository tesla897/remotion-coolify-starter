import express from 'express';
import {spawn} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import http from 'node:http';
import httpProxy from 'http-proxy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const rendersDir = path.join(projectRoot, 'renders');
const tempDir = path.join(projectRoot, '.tmp');

const app = express();
app.use(express.json({limit: '5mb'}));
app.use('/renders', express.static(rendersDir));

const port = Number(process.env.PORT || 3000);
const studioPort = Number(process.env.STUDIO_PORT || 3100);
const studioEnabled = process.env.STUDIO_ENABLED !== 'false';
const studioTarget = `http://127.0.0.1:${studioPort}`;
const renderApiKey = process.env.RENDER_API_KEY?.trim() || '';

const defaultProps = {
  slides: [
    {
      title: 'FRESH AIR AFTER TIBERIUS',
      subtitle: 'A new face seems like a reset for Rome.',
      background: '#f3f0e8',
      accent: '#f4c542',
      durationInFrames: 90,
      transition: {type: 'wipe', direction: 'from-right', durationInFrames: 10}
    },
    {
      title: 'YEAR 1 GOES WRONG',
      subtitle: 'Optimism turns into instability.',
      background: '#f5f5f5',
      accent: '#e05454',
      durationInFrames: 90,
      transition: {type: 'fade', durationInFrames: 10}
    },
    {
      title: 'ILLNESS OR POWER?',
      subtitle: 'Two explanations compete to define the emperor.',
      background: '#f3f0e8',
      accent: '#7f65d6',
      durationInFrames: 90
    }
  ]
};

const getRemotionCommand = (subcommandArgs) => {
  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/c', path.join(projectRoot, 'node_modules', '.bin', 'remotion.cmd'), ...subcommandArgs]
    };
  }

  return {
    command: path.join(projectRoot, 'node_modules', '.bin', 'remotion'),
    args: subcommandArgs
  };
};

const proxy = httpProxy.createProxyServer({
  target: studioTarget,
  ws: true,
  changeOrigin: true,
});

proxy.on('error', (error, req, res) => {
  const message = error instanceof Error ? error.message : 'Unknown proxy error';
  if (res && typeof res.writeHead === 'function' && !res.headersSent) {
    res.writeHead(502, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ok: false, message: 'Studio proxy failed', error: message}));
  }
});

const getRequestApiKey = (req) => {
  const headerValue = req.get('x-api-key');
  if (headerValue) {
    return headerValue.trim();
  }

  const authHeader = req.get('authorization');
  if (!authHeader) {
    return '';
  }

  const [scheme, token] = authHeader.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return '';
  }

  return token.trim();
};

const requireRenderApiKey = (req, res, next) => {
  if (!renderApiKey) {
    next();
    return;
  }

  const providedKey = getRequestApiKey(req);
  const providedBuffer = Buffer.from(providedKey);
  const expectedBuffer = Buffer.from(renderApiKey);

  if (providedKey && providedBuffer.length == expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    next();
    return;
  }

  res.status(401).json({
    ok: false,
    message: 'Unauthorized',
    hint: 'Provide x-api-key or Authorization: Bearer <key>'
  });
};

const startStudio = () => {
  if (!studioEnabled) {
    console.log('Studio disabled.');
    return null;
  }

  const {command, args} = getRemotionCommand(['studio', 'src/index.jsx', '--port', String(studioPort)]);

  const child = spawn(command, args, {
    cwd: projectRoot,
    env: {
      ...process.env,
      BROWSER: 'none',
      CI: '1'
    },
      stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[studio] ${chunk.toString()}`);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[studio] ${chunk.toString()}`);
  });

  child.on('close', (code) => {
    console.log(`Studio process exited with code ${code}`);
  });

  return child;
};

app.get('/health', (_req, res) => {
  res.json({ok: true});
});

app.get('/sample-payload', (_req, res) => {
  res.json({props: defaultProps});
});

app.post('/render', requireRenderApiKey, async (req, res) => {
  try {
    await mkdir(rendersDir, {recursive: true});
    await mkdir(tempDir, {recursive: true});

    const props = req.body?.props ?? defaultProps;
    const safeName = (req.body?.fileName || `render-${Date.now()}.mp4`).replace(/[^a-zA-Z0-9._-]/g, '-');
    const outputPath = path.join(rendersDir, safeName);
    const propsPath = path.join(tempDir, `${crypto.randomUUID()}.json`);

    await writeFile(propsPath, JSON.stringify(props), 'utf8');

    const renderArgs = [
      'render',
      'src/index.jsx',
      'ExplainerDeck',
      outputPath,
      '--props',
      propsPath
    ];

    if (process.env.BROWSER_EXECUTABLE) {
      renderArgs.push('--browser-executable', process.env.BROWSER_EXECUTABLE);
    }

    const {command, args} = getRemotionCommand(renderArgs);

    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        res.status(500).json({
          ok: false,
          message: 'Render failed',
          code,
          stdout,
          stderr
        });
        return;
      }

      const forwardedProto = req.headers['x-forwarded-proto'];
      const protocol = typeof forwardedProto === 'string' ? forwardedProto : req.protocol;
      const origin = `${protocol}://${req.get('host')}`;
      res.json({
        ok: true,
        fileName: safeName,
        outputPath,
        url: `${origin}/renders/${safeName}`,
        stdout
      });
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.use((req, res) => {
  if (!studioEnabled) {
    res.status(404).json({ok: false, message: 'Studio disabled'});
    return;
  }

  proxy.web(req, res, {target: studioTarget});
});

const studioProcess = startStudio();

const server = http.createServer(app);
server.on('upgrade', (req, socket, head) => {
  if (!studioEnabled) {
    socket.destroy();
    return;
  }

  proxy.ws(req, socket, head, {target: studioTarget});
});

const shutdown = () => {
  if (studioProcess && !studioProcess.killed) {
    studioProcess.kill();
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(port, '0.0.0.0', () => {
  console.log(`Remotion render service listening on :${port}`);
  if (studioEnabled) {
    console.log(`Remotion Studio proxied via :${port} -> ${studioTarget}`);
  }
});
