import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
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

const SegmentImage = ({src, zoom, logoUrl}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, width, height} = useVideoConfig();
  const isSubtleZoom = zoom === 'subtle';
  const zoomProgress = interpolate(
    frame,
    [0, Math.max(1, durationInFrames - 1)],
    [0, 1],
    {
      easing: Easing.bezier(0.22, 0.61, 0.36, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  const scale = isSubtleZoom
    ? interpolate(zoomProgress, [0, 1], [1, 1.05], {extrapolateRight: 'clamp'})
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
      src={segment.src}
      zoom={segment.zoom}
      logoUrl={logoUrl}
    />
  );
};

export const PaintExplainerChunk = ({segments = [], audioUrl = null, logoUrl = null}) => {
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
                  <SegmentAsset segment={segment} logoUrl={logoUrl} />
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
