# Remotion Coolify Starter

A minimal self-hosted Remotion render service for Coolify + Pangolin.

## What this gives you

- A simple Remotion composition with `wipe` and `fade` transitions
- An HTTP API to render videos on demand
- Optional API key protection for `/render`
- A Dockerfile that is straightforward to deploy in Coolify
- Local fallback hosting for rendered files from `/renders`
- Optional MinIO/S3 upload with signed download URLs

## Endpoints

- `GET /health`
- `GET /sample-payload`
- `POST /render`
- `GET /renders/<file>.mp4`
  This local fallback route uses the same API key middleware when `RENDER_API_KEY` is set.

`/sample-payload` now returns two example payloads:
- `explainerDeck`
- `paintExplainerChunk`

## Local setup

```bash
npm install
npm run dev
```

Open Remotion Studio locally and edit the composition.

To run the API locally:

```bash
npm start
```

Then open:
- `http://localhost:3000/health` for the API health check

Studio is disabled by default in `npm start`. To temporarily enable it:

```bash
STUDIO_ENABLED=true npm start
```

Then open `http://localhost:3000/` for Studio.

## Sample render request

```bash
curl -X POST http://localhost:3000/render \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "demo.mp4",
    "props": {
      "slides": [
        {
          "title": "FRESH AIR AFTER TIBERIUS",
          "subtitle": "A hopeful new emperor replaces a paranoid old one.",
          "background": "#f3f0e8",
          "accent": "#f4c542",
          "transition": {
            "type": "wipe",
            "direction": "from-right",
            "durationInFrames": 10
          }
        },
        {
          "title": "YEAR 1 GOES WRONG",
          "subtitle": "The optimistic start begins to unravel.",
          "background": "#f5f5f5",
          "accent": "#e05454",
          "transition": {
            "type": "fade",
            "durationInFrames": 10
          }
        },
        {
          "title": "ILLNESS OR POWER?",
          "subtitle": "Two competing explanations fight for the story.",
          "background": "#f3f0e8",
          "accent": "#7f65d6"
        }
      ]
    }
  }'
```

## Coolify deployment

1. Push this folder to a Git repository.
2. In Coolify, create a new application from that repo.
3. Choose Dockerfile-based deployment.
4. Expose port `3000`.
5. Optional env vars:
   - `PORT=3000`
   - `BROWSER_EXECUTABLE=/usr/bin/chromium`
   - `STUDIO_ENABLED=true`
   - `STUDIO_PORT=3100`
   - `RENDER_API_KEY=your-secret-key`
   - `ALWAYS_UNIQUE_FILE_NAMES=true`
   - `S3_ENDPOINT_URL=https://your-minio-or-s3-endpoint`
   - `S3_ACCESS_KEY=...`
   - `S3_SECRET_KEY=...`
   - `S3_BUCKET_NAME=remotion-renders`
   - `S3_REGION=us-east-1`
   - `S3_FORCE_PATH_STYLE=true`
   - `S3_OBJECT_PREFIX=remotion-renders`
   - `S3_SIGNED_URL_TTL_SECONDS=3600`
   - `TEMP_FILE_TTL_SECONDS=86400`
   - `LOCAL_RENDER_TTL_SECONDS=0`
6. Deploy.
7. Route your Pangolin domain to the Coolify service.

## Notes

- This is a starter, not a finished render farm.
- Rendered videos are written to `/app/renders`.
- If the S3 env vars are configured, the app uploads the finished MP4 to object storage and returns a signed URL instead of the local `/renders/...` URL.
- The API supports both:
  - `ExplainerDeck` for the original demo slides
  - `PaintExplainerChunk` for the image/video segment payload used by the new Paint Explainer workflows
- Studio is disabled by default. Set `STUDIO_ENABLED=true` only when you want temporary browser access to Remotion Studio.
- If `RENDER_API_KEY` is set, `/render` and the local `/renders/*` fallback route require either:
  - `x-api-key: your-secret-key`
  - `Authorization: Bearer your-secret-key`
- By default, returned output filenames are made unique to avoid accidental overwrites. Set `ALWAYS_UNIQUE_FILE_NAMES=false` if you need exact filenames.
- Temporary JSON props are cleaned up automatically. You can tune retention with `TEMP_FILE_TTL_SECONDS`.
- In local-file mode, old renders are kept forever by default. Set `LOCAL_RENDER_TTL_SECONDS` if you want automatic cleanup there too.
- For production, you will likely want:
  - object storage upload after render
  - request queueing
  - cleanup of old renders
  - concurrency limits

## Making It A Real Render Farm

To turn this from a useful starter into a production render farm, the usual next steps are:

1. Add a queue.
   Put render jobs into Redis, Postgres, or NATS instead of rendering inline inside the HTTP request.

2. Split API and workers.
   The API should accept jobs and return a job ID. One or more worker containers should do the actual rendering.

3. Add job status endpoints.
   Typical flow:
   - `POST /render-jobs`
   - `GET /render-jobs/:id`
   - `GET /render-jobs/:id/result`

4. Limit concurrency.
   Set a max number of simultaneous renders per worker so one burst of requests does not exhaust CPU or RAM.

5. Persist job metadata.
   Store:
   - requested props
   - status
   - start/end times
   - failure reason
   - storage key
   - signed URL expiry

6. Add retries and dead-letter handling.
   Some jobs will fail due to browser crashes, timeouts, or bad inputs. A finished system needs controlled retries.

7. Move cleanup into a scheduled process.
   Expired temp files, old local renders, and stale job records should be cleaned by a worker or cron task.

8. Add structured logging and metrics.
   Track render duration, queue depth, failures, memory usage, and worker saturation.

9. Add input validation.
   Validate composition props and reject bad payloads before they hit the renderer.

10. Add horizontal scaling.
   Run multiple workers behind one API so you can scale render capacity independently from the control plane.
