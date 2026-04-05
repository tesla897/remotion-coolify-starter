import React from 'react';
import {Composition} from 'remotion';
import {ExplainerDeck, calculateMetadata} from './compositions/ExplainerDeck';

export const Root = () => {
  return (
    <>
      <Composition
        id="ExplainerDeck"
        component={ExplainerDeck}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={300}
        defaultProps={{
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
        }}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};
