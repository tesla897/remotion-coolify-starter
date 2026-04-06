import express from 'express';
import {spawn} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {mkdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import http from 'node:http';
import httpProxy from 'http-proxy';
import {GetObjectCommand, PutObjectCommand, S3Client} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const rendersDir = path.join(projectRoot, 'renders');
const tempDir = path.join(projectRoot, '.tmp');

const port = Number(process.env.PORT || 3000);
const studioPort = Number(process.env.STUDIO_PORT || 3100);
const studioEnabled = process.env.STUDIO_ENABLED === 'true';
const studioTarget = `http://127.0.0.1:${studioPort}`;
const renderApiKey = process.env.RENDER_API_KEY?.trim() || '';
const s3Endpoint = process.env.S3_ENDPOINT_URL?.trim() || '';
const s3AccessKey = process.env.S3_ACCESS_KEY?.trim() || '';
const s3SecretKey = process.env.S3_SECRET_KEY?.trim() || '';
const s3BucketName = process.env.S3_BUCKET_NAME?.trim() || '';
const s3RegionValue = process.env.S3_REGION?.trim();
const s3Region = !s3RegionValue || s3RegionValue.toLowerCase() === 'none' ? 'us-east-1' : s3RegionValue;
const s3ForcePathStyle = process.env.S3_FORCE_PATH_STYLE !== 'false';
const s3ObjectPrefix = (process.env.S3_OBJECT_PREFIX || 'remotion-renders').replace(/^\/+|\/+$/g, '');
const s3SignedUrlTtlSeconds = Number(process.env.S3_SIGNED_URL_TTL_SECONDS || 3600);
const storageEnabled = Boolean(s3Endpoint && s3AccessKey && s3SecretKey && s3BucketName);

const s3Client = storageEnabled
  ? new S3Client({
      endpoint: s3Endpoint,
      region: s3Region,
      forcePathStyle: s3ForcePathStyle,
      credentials: {
        accessKeyId: s3AccessKey,
        secretAccessKey: s3SecretKey
      }
    })
  : null;

const app = express();
app.use(express.json({limit: '5mb'}));

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

  if (providedKey && providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    next();
    return;
  }

  res.status(401).json({
    ok: false,
    message: 'Unauthorized',
    hint: 'Provide x-api-key or Authorization: Bearer <key>'
  });
};

app.use('/renders', requireRenderApiKey, express.static(rendersDir));

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

const safeRemoveFile = async (filePath) => {
  if (!filePath) {
    return;
  }

  try {
    await rm(filePath, {force: true});
  } catch {
    // Best-effort cleanup.
  }
};

const getObjectKey = (fileName) => {
  return [s3ObjectPrefix, fileName].filter(Boolean).join('/');
};

const uploadRenderAndGetUrl = async ({fileName, filePath}) => {
  if (!s3Client) {
    return null;
  }

  const objectKey = getObjectKey(fileName);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: s3BucketName,
      Key: objectKey,
      Body: createReadStream(filePath),
      ContentType: 'video/mp4'
    })
  );

  const signedUrl = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: s3BucketName,
      Key: objectKey,
      ResponseContentType: 'video/mp4',
      ResponseContentDisposition: `inline; filename="${fileName}"`
    }),
    {expiresIn: s3SignedUrlTtlSeconds}
  );

  return {
    bucket: s3BucketName,
    key: objectKey,
    signedUrl
  };
};

const getOriginFromRequest = (req) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = typeof forwardedProto === 'string' ? forwardedProto : req.protocol;
  return `${protocol}://${req.get('host')}`;
};

app.get('/health', (_req, res) => {
  res.json({ok: true});
});

app.get('/sample-payload', (_req, res) => {
  res.json({props: defaultProps});
});

app.post('/render', requireRenderApiKey, async (req, res) => {
  await mkdir(rendersDir, {recursive: true});
  await mkdir(tempDir, {recursive: true});

  const props = req.body?.props ?? defaultProps;
  const safeName = (req.body?.fileName || `render-${Date.now()}.mp4`).replace(/[^a-zA-Z0-9._-]/g, '-');
  const outputPath = path.join(rendersDir, safeName);
  const propsPath = path.join(tempDir, `${crypto.randomUUID()}.json`);

  try {
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
    let responseSent = false;

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', async (error) => {
      if (responseSent) {
        return;
      }

      responseSent = true;
      await safeRemoveFile(propsPath);
      res.status(500).json({
        ok: false,
        message: error instanceof Error ? error.message : 'Render process failed to start'
      });
    });

    child.on('close', async (code) => {
      if (responseSent) {
        return;
      }

      responseSent = true;

      try {
        await safeRemoveFile(propsPath);

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

        let url = `${getOriginFromRequest(req)}/renders/${safeName}`;
        let storage = {mode: 'local'};

        if (storageEnabled) {
          const uploaded = await uploadRenderAndGetUrl({fileName: safeName, filePath: outputPath});
          url = uploaded.signedUrl;
          storage = {
            mode: 's3',
            bucket: uploaded.bucket,
            key: uploaded.key,
            expiresInSeconds: s3SignedUrlTtlSeconds
          };
          await safeRemoveFile(outputPath);
        }

        res.json({
          ok: true,
          fileName: safeName,
          outputPath,
          url,
          storage,
          stdout
        });
      } catch (error) {
        res.status(500).json({
          ok: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          stdout,
          stderr
        });
      }
    });
  } catch (error) {
    await safeRemoveFile(propsPath);
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
  console.log(`Render storage mode: ${storageEnabled ? 's3-signed-url' : 'local'}`);
  if (storageEnabled) {
    console.log(`S3 bucket: ${s3BucketName}`);
    console.log(`S3 object prefix: ${s3ObjectPrefix || '(root)'}`);
  }
  if (studioEnabled) {
    console.log(`Remotion Studio proxied via :${port} -> ${studioTarget}`);
  }
});
