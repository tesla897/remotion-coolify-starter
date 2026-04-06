import {z} from 'zod';

export const EXPLAINER_DECK_CONFIG = {
  fps: 30,
  width: 1920,
  height: 1080,
  defaultSlideDuration: 90,
  defaultTransitionDuration: 10,
};

export const PAINT_EXPLAINER_CHUNK_CONFIG = {
  fps: 24,
  width: 1280,
  height: 720,
  transitionDurationSec: 0.35,
  captionChunkSize: 5,
};

const slideTransitionSchema = z.object({
  type: z.enum(['fade', 'wipe']),
  direction: z
    .enum(['from-left', 'from-right', 'from-top', 'from-bottom'])
    .optional(),
  durationInFrames: z.number().int().positive().optional(),
});

const explainerSlideSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  background: z.string().min(1).optional(),
  accent: z.string().min(1).optional(),
  durationInFrames: z.number().int().positive().optional(),
  transition: slideTransitionSchema.optional(),
});

export const ExplainerDeckPropsSchema = z.object({
  slides: z.array(explainerSlideSchema).min(1),
});

const captionWordSchema = z
  .object({
    text: z.string().min(1).optional(),
    word: z.string().min(1).optional(),
    startSec: z.number().nonnegative().optional(),
    endSec: z.number().nonnegative().optional(),
    start: z.number().nonnegative().optional(),
    end: z.number().nonnegative().optional(),
    start_ms: z.number().nonnegative().optional(),
    end_ms: z.number().nonnegative().optional(),
  })
  .passthrough()
  .refine((value) => Boolean(value.text ?? value.word), {
    message: 'Each caption word needs text or word.',
  });

const captionSchema = z.object({
  words: z.array(captionWordSchema).default([]),
});

const segmentSchema = z.object({
  segmentId: z.union([z.string(), z.number()]),
  segmentType: z.string().optional(),
  assetType: z.enum(['image', 'video']),
  src: z.string().min(1),
  durationSec: z.number().positive(),
  transition: z.string().optional(),
  zoom: z.string().optional(),
  chapterTitle: z.string().optional(),
  motionMode: z.string().optional(),
  motionChangeAtSec: z.number().nonnegative().optional().nullable(),
  motionDirection: z.string().optional(),
});

export const PaintExplainerChunkPropsSchema = z.object({
  fps: z.number().int().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  audioUrl: z.string().min(1).nullable().optional(),
  logoUrl: z.string().min(1).nullable().optional(),
  captions: captionSchema.nullable().optional(),
  segments: z.array(segmentSchema).min(1),
});

export const defaultExplainerDeckProps = {
  slides: [
    {
      title: 'FRESH AIR AFTER TIBERIUS',
      subtitle: 'A new face seems like a reset for Rome.',
      background: '#f3f0e8',
      accent: '#f4c542',
      durationInFrames: 90,
      transition: {type: 'wipe', direction: 'from-right', durationInFrames: 10},
    },
    {
      title: 'YEAR 1 GOES WRONG',
      subtitle: 'Optimism turns into instability.',
      background: '#f5f5f5',
      accent: '#e05454',
      durationInFrames: 90,
      transition: {type: 'fade', durationInFrames: 10},
    },
    {
      title: 'ILLNESS OR POWER?',
      subtitle: 'Two explanations compete to define the emperor.',
      background: '#f3f0e8',
      accent: '#7f65d6',
      durationInFrames: 90,
    },
  ],
};

export const defaultPaintExplainerChunkProps = {
  fps: 24,
  width: 1280,
  height: 720,
  audioUrl: null,
  captions: {
    words: [
      {text: 'Fresh', startSec: 0.2, endSec: 0.55},
      {text: 'air', startSec: 0.55, endSec: 0.82},
      {text: 'after', startSec: 0.82, endSec: 1.18},
      {text: 'Tiberius', startSec: 1.18, endSec: 1.82},
      {text: 'arrives', startSec: 1.82, endSec: 2.25},
    ],
  },
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
};

export const normalizeChunkTransition = (transition) => {
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

export const getExplainerDeckTransitionDuration = (slide, index, slides) => {
  if (index >= slides.length - 1 || !slide?.transition) {
    return 0;
  }

  return slide.transition.durationInFrames ?? EXPLAINER_DECK_CONFIG.defaultTransitionDuration;
};

export const getExplainerDeckDurationInFrames = (slides = []) => {
  const totalSequenceDuration = slides.reduce((acc, slide) => {
    return acc + (slide.durationInFrames ?? EXPLAINER_DECK_CONFIG.defaultSlideDuration);
  }, 0);

  const totalTransitionDuration = slides.reduce((acc, slide, index) => {
    return acc + getExplainerDeckTransitionDuration(slide, index, slides);
  }, 0);

  return Math.max(
    totalSequenceDuration - totalTransitionDuration,
    EXPLAINER_DECK_CONFIG.defaultSlideDuration,
  );
};

export const getChunkTransitionDurationInFrames = (fps) => {
  return Math.max(
    1,
    Math.round(PAINT_EXPLAINER_CHUNK_CONFIG.transitionDurationSec * fps),
  );
};

export const getPaintExplainerChunkDurationInFrames = ({segments = [], fps}) => {
  const totalSequenceDuration = segments.reduce((acc, segment, index) => {
    const segmentFrames = Math.max(1, Math.round((segment.durationSec || 0) * fps));
    const hasTrailingTransition =
      index > 1 &&
      index < segments.length - 1 &&
      Boolean(normalizeChunkTransition(segment.transition));

    return acc + segmentFrames + (hasTrailingTransition ? getChunkTransitionDurationInFrames(fps) : 0);
  }, 0);

  return Math.max(totalSequenceDuration, fps);
};
