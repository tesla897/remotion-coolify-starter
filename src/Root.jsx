import React from 'react';
import {Composition} from 'remotion';
import {ExplainerDeck, calculateMetadata} from './compositions/ExplainerDeck';
import {
  PaintExplainerChunk,
  calculateChunkMetadata,
} from './compositions/PaintExplainerChunk';

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
      <Composition
        id="PaintExplainerChunk"
        component={PaintExplainerChunk}
        width={1280}
        height={720}
        fps={24}
        durationInFrames={120}
        defaultProps={{
          fps: 24,
          width: 1280,
          height: 720,
          audioUrl: null,
          segments: [
            {
              segmentId: 1,
              segmentType: 'intro_animation',
              assetType: 'video',
              src: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
              durationSec: 2,
              transition: '',
              zoom: '',
              chapterTitle: 'Demo',
            },
            {
              segmentId: 2,
              segmentType: 'ai_image',
              assetType: 'image',
              src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1280&q=80',
              durationSec: 2.5,
              transition: 'wipeleft',
              zoom: 'subtle',
              chapterTitle: 'Demo',
            },
            {
              segmentId: 3,
              segmentType: 'b_roll',
              assetType: 'image',
              src: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1280&q=80',
              durationSec: 3,
              transition: 'fade',
              zoom: '',
              chapterTitle: 'Demo',
            },
          ],
        }}
        calculateMetadata={calculateChunkMetadata}
      />
    </>
  );
};
