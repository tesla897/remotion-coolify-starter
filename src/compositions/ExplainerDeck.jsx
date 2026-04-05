import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {wipe} from '@remotion/transitions/wipe';
import {fade} from '@remotion/transitions/fade';

const defaultSlideDuration = 90;
const defaultTransitionDuration = 10;

const getTransition = (slide) => {
  const transition = slide.transition ?? null;
  if (!transition) {
    return null;
  }

  const durationInFrames = transition.durationInFrames ?? defaultTransitionDuration;

  if (transition.type === 'fade') {
    return {
      presentation: fade(),
      timing: linearTiming({durationInFrames})
    };
  }

  return {
    presentation: wipe({direction: transition.direction ?? 'from-right'}),
    timing: linearTiming({durationInFrames})
  };
};

const Slide = ({title, subtitle, background, accent}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: background ?? '#f5f5f5',
        color: '#101010',
        fontFamily: 'Arial, sans-serif',
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
            textTransform: 'uppercase'
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
            gap: 40
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
              textTransform: 'uppercase'
            }}
          >
            Remotion + Coolify Starter
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ExplainerDeck = ({slides}) => {
  return (
    <TransitionSeries name="ExplainerDeck">
      {slides.map((slide, index) => {
        const transition = getTransition(slide);
        const durationInFrames = slide.durationInFrames ?? defaultSlideDuration;

        return (
          <React.Fragment key={`${slide.title}-${index}`}>
            <TransitionSeries.Sequence durationInFrames={durationInFrames}>
              <Sequence durationInFrames={durationInFrames}>
                <Slide {...slide} />
              </Sequence>
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
  const slides = props?.slides ?? [];
  const durationInFrames = slides.reduce((acc, slide) => {
    return acc + (slide.durationInFrames ?? defaultSlideDuration);
  }, 0);

  return {
    durationInFrames: Math.max(durationInFrames, defaultSlideDuration),
    fps: 30,
    width: 1920,
    height: 1080
  };
};
