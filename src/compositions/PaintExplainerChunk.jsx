import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {wipe} from '@remotion/transitions/wipe';
import {
  defaultPaintExplainerChunkProps,
  getChunkTransitionDurationInFrames,
  getPaintExplainerChunkDurationInFrames,
  normalizeChunkTransition,
  PAINT_EXPLAINER_CHUNK_CONFIG,
} from './schemas';

const getPresentation = (transition, durationInFrames) => {
  if (!transition) {
    return null;
  }

  if (transition.type === 'fade') {
    return {
      presentation: fade(),
      timing: linearTiming({durationInFrames}),
    };
  }

  return {
    presentation: wipe({direction: transition.direction}),
    timing: linearTiming({durationInFrames}),
  };
};

const resolveMotion = (segment) => {
  const explicitMode = String(segment.motionMode || '').trim();
  if (explicitMode) {
    return {
      mode: explicitMode,
      changeAtSec:
        segment.motionChangeAtSec == null ? null : Number(segment.motionChangeAtSec),
      direction: segment.motionDirection || 'in',
    };
  }

  return {
    mode: segment.zoom === 'subtle' ? 'subtle' : 'static',
    changeAtSec: null,
    direction: segment.zoom === 'subtle' ? 'in' : 'none',
  };
};

const SegmentImage = ({segment, logoUrl}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, width, height, fps} = useVideoConfig();
  const motion = resolveMotion(segment);
  const fullProgress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    easing: Easing.bezier(0.22, 0.61, 0.36, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const changeFrame =
    motion.changeAtSec == null
      ? Math.round(durationInFrames / 2)
      : Math.max(
          1,
          Math.min(durationInFrames - 1, Math.round(motion.changeAtSec * fps)),
        );

  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let transformOrigin = '50% 50%';

  if (motion.mode === 'subtle') {
    scale = interpolate(fullProgress, [0, 1], [1, 1.04], {extrapolateRight: 'clamp'});
  } else if (motion.mode === 'two_beat') {
    if (frame < changeFrame) {
      const firstProgress = interpolate(frame, [0, changeFrame], [0, 1], {
        easing: Easing.bezier(0.22, 0.61, 0.36, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });

      scale = interpolate(firstProgress, [0, 1], [1, 1.02], {extrapolateRight: 'clamp'});
    } else {
      const secondProgress = interpolate(
        frame,
        [changeFrame, Math.max(changeFrame + 1, durationInFrames - 1)],
        [0, 1],
        {
          easing: Easing.bezier(0.22, 0.61, 0.36, 1),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        },
      );

      scale = interpolate(secondProgress, [0, 1], [1.08, 1.14], {
        extrapolateRight: 'clamp',
      });
      translateX = interpolate(secondProgress, [0, 1], [0, -14], {
        extrapolateRight: 'clamp',
      });
      translateY = interpolate(secondProgress, [0, 1], [0, 8], {
        extrapolateRight: 'clamp',
      });
      transformOrigin = motion.direction === 'in' ? '55% 45%' : '50% 50%';
    }
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#f4f0e8',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          transformOrigin,
        }}
      >
        <Img
          src={segment.src}
          style={{
            width,
            height,
            objectFit: 'contain',
            backgroundColor: '#f4f0e8',
          }}
        />
      </AbsoluteFill>
      {logoUrl ? (
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 72,
            height: 72,
            padding: 4,
            border: '4px solid #111',
            backgroundColor: 'rgba(255,255,255,0.96)',
            boxSizing: 'border-box',
          }}
        >
          <Img
            src={logoUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const SegmentAsset = ({segment, logoUrl}) => {
  if (segment.assetType === 'video') {
    return (
      <AbsoluteFill style={{backgroundColor: '#000'}}>
        <OffthreadVideo
          src={segment.src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </AbsoluteFill>
    );
  }

  return (
    <SegmentImage
      segment={segment}
      logoUrl={logoUrl}
    />
  );
};

const normalizeCaptionWords = (words) => {
  return (Array.isArray(words) ? words : [])
    .map((word, index) => {
      const text = String(word?.text ?? word?.word ?? '').trim();
      if (!text) {
        return null;
      }

      const rawStart = Number(word?.startSec ?? word?.start ?? word?.start_ms ?? 0);
      const rawEnd = Number(word?.endSec ?? word?.end ?? word?.end_ms ?? rawStart);
      const startSec =
        Number.isFinite(rawStart) && rawStart > 1000 ? rawStart / 1000 : rawStart;
      const endSec =
        Number.isFinite(rawEnd) && rawEnd > 1000 ? rawEnd / 1000 : rawEnd;

      return {
        id: `${index}-${text}`,
        text,
        startSec: Math.max(0, startSec || 0),
        endSec: Math.max(startSec || 0, endSec || startSec || 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.startSec - b.startSec);
};

const buildCaptionChunks = (words) => {
  const chunks = [];

  for (
    let index = 0;
    index < words.length;
    index += PAINT_EXPLAINER_CHUNK_CONFIG.captionChunkSize
  ) {
    const slice = words.slice(index, index + PAINT_EXPLAINER_CHUNK_CONFIG.captionChunkSize);
    if (!slice.length) {
      continue;
    }

    chunks.push({
      id: `chunk-${index}`,
      startSec: slice[0].startSec,
      endSec: slice[slice.length - 1].endSec,
      words: slice,
    });
  }

  return chunks;
};

const CaptionOverlay = ({words = []}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const currentSec = frame / fps;
  const normalizedWords = normalizeCaptionWords(words);
  const chunks = buildCaptionChunks(normalizedWords);

  if (!chunks.length) {
    return null;
  }

  const activeChunk =
    chunks.find((chunk) => currentSec >= chunk.startSec && currentSec <= chunk.endSec + 0.05) ??
    chunks.find((chunk) => currentSec < chunk.startSec) ??
    chunks[chunks.length - 1];

  return (
    <div
      style={{
        position: 'absolute',
        left: 64,
        right: 64,
        bottom: 44,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: '88%',
          padding: '18px 24px',
          borderRadius: 24,
          backgroundColor: 'rgba(0, 0, 0, 0.68)',
          boxShadow: '0 10px 24px rgba(0, 0, 0, 0.28)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0 12px',
        }}
      >
        {activeChunk.words.map((word) => {
          const isActive = currentSec >= word.startSec && currentSec <= word.endSec + 0.04;
          const scale = isActive
            ? interpolate(
                currentSec,
                [word.startSec, Math.max(word.startSec + 0.001, word.endSec)],
                [1.04, 1.0],
                {
                  easing: Easing.out(Easing.quad),
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                },
              )
            : 1;

          return (
            <span
              key={word.id}
              style={{
                fontFamily: 'Arial, sans-serif',
                fontWeight: 900,
                fontSize: 46,
                lineHeight: 1.12,
                letterSpacing: 0.3,
                color: isActive ? '#ffd84d' : '#ffffff',
                textTransform: 'uppercase',
                transform: `scale(${scale})`,
                transformOrigin: 'center bottom',
                textShadow:
                  '0 4px 0 rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.55), 0 0 16px rgba(0,0,0,0.35)',
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const PaintExplainerChunk = ({
  segments = [],
  audioUrl = null,
  logoUrl = null,
  captions = null,
}) => {
  const {fps} = useVideoConfig();
  const transitionFrames = getChunkTransitionDurationInFrames(fps);

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {audioUrl ? <Audio src={audioUrl} /> : null}
      <TransitionSeries name="PaintExplainerChunk">
        {segments.map((segment, index) => {
          const normalizedTransition =
            index > 0 ? normalizeChunkTransition(segment.transition) : null;
          const durationFrames = Math.max(1, Math.round((segment.durationSec || 0) * fps));
          const transition = getPresentation(normalizedTransition, transitionFrames);

          return (
            <React.Fragment key={`${segment.segmentId}-${segment.src}`}>
              {index > 0 && transition ? (
                <TransitionSeries.Transition
                  presentation={transition.presentation}
                  timing={transition.timing}
                />
              ) : null}
              <TransitionSeries.Sequence durationInFrames={durationFrames}>
                <SegmentAsset segment={segment} logoUrl={logoUrl} />
              </TransitionSeries.Sequence>
            </React.Fragment>
          );
        })}
      </TransitionSeries>
      <CaptionOverlay words={captions?.words ?? []} />
    </AbsoluteFill>
  );
};

export const calculateChunkMetadata = ({props}) => {
  const fps = Number(props?.fps || PAINT_EXPLAINER_CHUNK_CONFIG.fps);
  const width = Number(props?.width || PAINT_EXPLAINER_CHUNK_CONFIG.width);
  const height = Number(props?.height || PAINT_EXPLAINER_CHUNK_CONFIG.height);
  const segments = props?.segments ?? defaultPaintExplainerChunkProps.segments;
  const durationInFrames = getPaintExplainerChunkDurationInFrames({segments, fps});

  return {
    fps,
    width,
    height,
    durationInFrames,
  };
};
