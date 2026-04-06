import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {wipe} from '@remotion/transitions/wipe';
import {fade} from '@remotion/transitions/fade';
import {
  defaultExplainerDeckProps,
  EXPLAINER_DECK_CONFIG,
  getExplainerDeckDurationInFrames,
  getExplainerDeckTransitionDuration,
} from './schemas';

const getTransition = (slide) => {
  const transition = slide.transition ?? null;
  if (!transition) {
    return null;
  }

  const durationInFrames =
    transition.durationInFrames ?? EXPLAINER_DECK_CONFIG.defaultTransitionDuration;

  if (transition.type === 'fade') {
    return {
      presentation: fade(),
      timing: linearTiming({durationInFrames}),
    };
  }

  return {
    presentation: wipe({direction: transition.direction ?? 'from-right'}),
    timing: linearTiming({durationInFrames}),
  };
};

const Slide = ({title, subtitle, background, accent}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const titleReveal = spring({
    frame,
    fps,
    durationInFrames: 24,
    config: {damping: 200},
  });
  const bodyReveal = spring({
    frame: frame - 6,
    fps,
    durationInFrames: 28,
    config: {damping: 200},
  });
  const badgeReveal = spring({
    frame: frame - 12,
    fps,
    durationInFrames: 20,
    config: {damping: 200},
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: background ?? '#f5f5f5',
        color: '#101010',
        fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
        padding: 80,
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          border: '8px solid #111',
          borderRadius: 30,
          padding: 48,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#f8f8f3'
        }}
      >
        <div
          style={{
            fontSize: 78,
            fontWeight: 900,
            textAlign: 'center',
            letterSpacing: 1,
            textTransform: 'uppercase',
            opacity: titleReveal,
            transform: `translateY(${interpolate(titleReveal, [0, 1], [48, 0], {
              easing: Easing.out(Easing.cubic),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })}px)`,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
            opacity: bodyReveal,
            transform: `translateY(${interpolate(bodyReveal, [0, 1], [24, 0], {
              easing: Easing.out(Easing.cubic),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })}px)`,
          }}
        >
          <div
            style={{
              width: 280,
              height: 280,
              borderRadius: '50%',
              border: '10px solid #111',
              background: '#fff',
              position: 'relative'
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: -28,
                borderRadius: '50%',
                border: `18px solid ${accent ?? '#f4c542'}`,
                opacity: 0.3
              }}
            />
          </div>

          <div
            style={{
              maxWidth: 900,
              border: '8px solid #111',
              borderRadius: 24,
              background: '#fff',
              padding: '32px 40px',
              fontSize: 48,
              lineHeight: 1.2,
              textAlign: 'center'
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              backgroundColor: accent ?? '#f4c542',
              color: '#111',
              border: '6px solid #111',
              borderRadius: 999,
              padding: '12px 28px',
              fontSize: 32,
              fontWeight: 700,
              textTransform: 'uppercase',
              opacity: badgeReveal,
              transform: `scale(${interpolate(badgeReveal, [0, 1], [0.92, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })})`,
            }}
          >
            Remotion + Coolify Starter
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ExplainerDeck = ({slides = defaultExplainerDeckProps.slides}) => {
  return (
    <TransitionSeries name="ExplainerDeck">
      {slides.map((slide, index) => {
        const transition = getTransition(slide);
        const durationInFrames =
          slide.durationInFrames ?? EXPLAINER_DECK_CONFIG.defaultSlideDuration;

        return (
          <React.Fragment key={`${slide.title}-${index}`}>
            <TransitionSeries.Sequence durationInFrames={durationInFrames}>
              <Slide {...slide} />
            </TransitionSeries.Sequence>
            {index < slides.length - 1 && transition ? (
              <TransitionSeries.Transition
                presentation={transition.presentation}
                timing={transition.timing}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </TransitionSeries>
  );
};

export const calculateMetadata = ({props}) => {
  const slides = props?.slides ?? defaultExplainerDeckProps.slides;
  const durationInFrames = getExplainerDeckDurationInFrames(slides);

  return {
    durationInFrames,
    fps: EXPLAINER_DECK_CONFIG.fps,
    width: EXPLAINER_DECK_CONFIG.width,
    height: EXPLAINER_DECK_CONFIG.height,
    props: {
      slides: slides.map((slide, index) => ({
        ...slide,
        durationInFrames:
          slide.durationInFrames ?? EXPLAINER_DECK_CONFIG.defaultSlideDuration,
        transition: slide.transition
          ? {
              ...slide.transition,
              durationInFrames: getExplainerDeckTransitionDuration(slide, index, slides),
            }
          : undefined,
      })),
    },
  };
};
