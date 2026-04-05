import express from 'express';
import {spawn} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const rendersDir = path.join(projectRoot, 'renders');
const tempDir = path.join(projectRoot, '.tmp');

const app = express();
app.use(express.json({limit: '5mb'}));
app.use('/renders', express.static(rendersDir));

const port = Number(process.env.PORT || 3000);

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

const getRemotionBin = () => {
  if (process.platform === 'win32') {
    return path.join(projectRoot, 'node_modules', '.bin', 'remotion.cmd');
  }

  return path.join(projectRoot, 'node_modules', '.bin', 'remotion');
};

app.get('/health', (_req, res) => {
  res.json({ok: true});
});

app.get('/sample-payload', (_req, res) => {
  res.json({props: defaultProps});
});

app.post('/render', async (req, res) => {
  try {
    await mkdir(rendersDir, {recursive: true});
    await mkdir(tempDir, {recursive: true});

    const props = req.body?.props ?? defaultProps;
    const safeName = (req.body?.fileName || `render-${Date.now()}.mp4`).replace(/[^a-zA-Z0-9._-]/g, '-');
    const outputPath = path.join(rendersDir, safeName);
    const propsPath = path.join(tempDir, `${crypto.randomUUID()}.json`);

    await writeFile(propsPath, JSON.stringify(props), 'utf8');

    const remotionBin = getRemotionBin();
    const args = [
      'render',
      'src/index.jsx',
      'ExplainerDeck',
      outputPath,
      '--props',
      propsPath
    ];

    if (process.env.BROWSER_EXECUTABLE) {
      args.push('--browser-executable', process.env.BROWSER_EXECUTABLE);
    }

    const child = spawn(remotionBin, args, {
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

      const origin = `${req.protocol}://${req.get('host')}`;
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

app.listen(port, '0.0.0.0', () => {
  console.log(`Remotion render service listening on :${port}`);
});
