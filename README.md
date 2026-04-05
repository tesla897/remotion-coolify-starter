# Remotion Coolify Starter

A minimal self-hosted Remotion render service for Coolify + Pangolin.

## What this gives you

- A simple Remotion composition with `wipe` and `fade` transitions
- An HTTP API to render videos on demand
- A Dockerfile that is straightforward to deploy in Coolify
- Static hosting for rendered files from `/renders`

## Endpoints

- `GET /health`
- `POST /render`
- `GET /renders/<file>.mp4`

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
6. Deploy.
7. Route your Pangolin domain to the Coolify service.

## Notes

- This is a starter, not a finished render farm.
- Rendered videos are written to `/app/renders`.
- For production, you will likely want:
  - object storage upload after render
  - request queueing
  - auth
  - cleanup of old renders
  - concurrency limits
