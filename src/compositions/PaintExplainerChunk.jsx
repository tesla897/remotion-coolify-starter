import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {wipe} from '@remotion/transitions/wipe';

const defaultFps = 24;
const defaultWidth = 1280;
const defaultHeight = 720;
const transitionDurationSec = 0.35;

const normalizeTransition = (transition) => {
  const value = String(transition || '').toLowerCase();
  if (!value) {
    return null;
  }

  if (value === 'fade' || value === 'dissolve') {
    return {type: 'fade'};
  }

  if (value === 'wipeleft') {
    return {type: 'wipe', direction: 'from-right'};
  }

  if (value === 'wiperight') {
    return {type: 'wipe', direction: 'from-left'};
  }

  return {type: 'fade'};
};

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

const SegmentImage = ({src, zoom, chapterTitle}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, width, height, fps} = useVideoConfig();
  const isSubtleZoom = zoom === 'subtle';
  const progress = spring({
    frame,
    fps,
    config: {
      damping: 200,
      stiffness: 80,
      mass: 0.8,
    },
    durationInFrames,
    durationRestThreshold: 0.001,
  });

  const scale = isSubtleZoom
    ? interpolate(progress, [0, 1], [1, 1.05], {extrapolateRight: 'clamp'})
    : 1;

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
          transform: `scale(${scale})`,
        }}
      >
        <Img
          src={src}
          style={{
            width,
            height,
            objectFit: 'contain',
            backgroundColor: '#f4f0e8',
          }}
        />
      </AbsoluteFill>
      {chapterTitle ? (
        <div
          style={{
            position: 'absolute',
            top: 28,
            left: 28,
            padding: '12px 20px',
            borderRadius: 999,
            border: '4px solid #111',
            backgroundColor: 'rgba(255,255,255,0.9)',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 700,
            fontSize: 26,
            color: '#111',
            textTransform: 'uppercase',
          }}
        >
          {chapterTitle}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const SegmentAsset = ({segment}) => {
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
      src={segment.src}
      zoom={segment.zoom}
      chapterTitle={segment.chapterTitle}
    />
  );
};

export const PaintExplainerChunk = ({segments = [], audioUrl = null}) => {
  const {fps} = useVideoConfig();
  const transitionFrames = Math.max(1, Math.round(transitionDurationSec * fps));

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {audioUrl ? <Audio src={audioUrl} /> : null}
      <TransitionSeries name="PaintExplainerChunk">
        {segments.map((segment, index) => {
          const normalizedTransition =
            index > 1 ? normalizeTransition(segment.transition) : null;
          const durationFrames =
            Math.max(1, Math.round((segment.durationSec || 0) * fps)) +
            (normalizedTransition ? transitionFrames : 0);
          const transition = getPresentation(normalizedTransition, transitionFrames);

          return (
            <React.Fragment key={`${segment.segmentId}-${segment.src}`}>
              <TransitionSeries.Sequence durationInFrames={durationFrames}>
                <Sequence durationInFrames={durationFrames}>
                  <SegmentAsset segment={segment} />
                </Sequence>
              </TransitionSeries.Sequence>
              {index < segments.length - 1 && transition ? (
                <TransitionSeries.Transition
                  presentation={transition.presentation}
                  timing={transition.timing}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};

export const calculateChunkMetadata = ({props}) => {
  const fps = Number(props?.fps || defaultFps);
  const width = Number(props?.width || defaultWidth);
  const height = Number(props?.height || defaultHeight);
  const segments = props?.segments ?? [];
  const transitionFrames = Math.max(1, Math.round(transitionDurationSec * fps));

  const durationInFrames = segments.reduce((acc, segment, index) => {
    const normalizedTransition =
      index > 1 ? normalizeTransition(segment.transition) : null;
    const segmentFrames = Math.max(1, Math.round((segment.durationSec || 0) * fps));
    return acc + segmentFrames + (normalizedTransition ? transitionFrames : 0);
  }, 0);

  return {
    fps,
    width,
    height,
    durationInFrames: Math.max(durationInFrames, fps),
  };
};
