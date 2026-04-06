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
   - `S3_ENDPOINT_URL=https://your-minio-or-s3-endpoint`
   - `S3_ACCESS_KEY=...`
   - `S3_SECRET_KEY=...`
   - `S3_BUCKET_NAME=remotion-renders`
   - `S3_REGION=us-east-1`
   - `S3_FORCE_PATH_STYLE=true`
   - `S3_OBJECT_PREFIX=remotion-renders`
   - `S3_SIGNED_URL_TTL_SECONDS=3600`
6. Deploy.
7. Route your Pangolin domain to the Coolify service.

## Notes

- This is a starter, not a finished render farm.
- Rendered videos are written to `/app/renders`.
- If the S3 env vars are configured, the app uploads the finished MP4 to object storage and returns a signed URL instead of the local `/renders/...` URL.
- Studio is disabled by default. Set `STUDIO_ENABLED=true` only when you want temporary browser access to Remotion Studio.
- If `RENDER_API_KEY` is set, `/render` and the local `/renders/*` fallback route require either:
  - `x-api-key: your-secret-key`
  - `Authorization: Bearer your-secret-key`
- For production, you will likely want:
  - object storage upload after render
  - request queueing
  - cleanup of old renders
  - concurrency limits
