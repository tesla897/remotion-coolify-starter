import React from 'react';
import {Composition, Folder} from 'remotion';
import {ExplainerDeck, calculateMetadata} from './compositions/ExplainerDeck';
import {
  PaintExplainerChunk,
  calculateChunkMetadata,
} from './compositions/PaintExplainerChunk';
import {
  defaultExplainerDeckProps,
  defaultPaintExplainerChunkProps,
  EXPLAINER_DECK_CONFIG,
  ExplainerDeckPropsSchema,
  PAINT_EXPLAINER_CHUNK_CONFIG,
  PaintExplainerChunkPropsSchema,
} from './compositions/schemas';

export const Root = () => {
  return (
    <Folder name="starter-compositions">
      <Composition
        id="ExplainerDeck"
        component={ExplainerDeck}
        width={EXPLAINER_DECK_CONFIG.width}
        height={EXPLAINER_DECK_CONFIG.height}
        fps={EXPLAINER_DECK_CONFIG.fps}
        durationInFrames={EXPLAINER_DECK_CONFIG.defaultSlideDuration}
        defaultProps={defaultExplainerDeckProps}
        schema={ExplainerDeckPropsSchema}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="PaintExplainerChunk"
        component={PaintExplainerChunk}
        width={PAINT_EXPLAINER_CHUNK_CONFIG.width}
        height={PAINT_EXPLAINER_CHUNK_CONFIG.height}
        fps={PAINT_EXPLAINER_CHUNK_CONFIG.fps}
        durationInFrames={PAINT_EXPLAINER_CHUNK_CONFIG.fps}
        defaultProps={defaultPaintExplainerChunkProps}
        schema={PaintExplainerChunkPropsSchema}
        calculateMetadata={calculateChunkMetadata}
      />
    </Folder>
  );
};
