import { interpolateRgb } from 'd3-interpolate';
import { scaleOrdinal, scaleSequential } from 'd3-scale';
import type { Database } from '@/lib/supabase/types';

type YearsCategory = '0-5' | '6-10' | '11-15' | '16-20' | '20+';
type LearningStyle = Database['public']['Tables']['survey_responses']['Row']['learning_style'];
type ShapedBy = Database['public']['Tables']['survey_responses']['Row']['shaped_by'];
type PeakPerformance = Database['public']['Tables']['survey_responses']['Row']['peak_performance'];
type Motivation = Database['public']['Tables']['survey_responses']['Row']['motivation'];

// Theme colors
export const theme = {
  primary: '#0077CC', // Medtronic blue
  secondary: '#00A3E0',
  accent: '#FF6B6B',
  background: '#0A0A0F', // Dark theme background
  surface: '#1A1A1F',
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0A0',
    muted: '#707070',
  },
  border: '#2A2A2F',
  error: '#FF4D4D',
  success: '#4CAF50',
  warning: '#FFC107',
};

// Years to color mapping
export const yearsColorScale = scaleOrdinal<YearsCategory, string>()
  .domain(['0-5' as YearsCategory, '6-10' as YearsCategory, '11-15' as YearsCategory, '16-20' as YearsCategory, '20+' as YearsCategory])
  .range([
    interpolateRgb(theme.primary, theme.secondary)(0.2),
    interpolateRgb(theme.primary, theme.secondary)(0.4),
    interpolateRgb(theme.primary, theme.secondary)(0.6),
    interpolateRgb(theme.primary, theme.secondary)(0.8),
    interpolateRgb(theme.primary, theme.secondary)(1),
  ])
  .unknown(theme.surface);

// Attribute color scales
export const learningStyleColors = scaleOrdinal<NonNullable<LearningStyle>, string>()
  .domain(['visual' as NonNullable<LearningStyle>, 'auditory' as NonNullable<LearningStyle>, 'kinesthetic' as NonNullable<LearningStyle>, 'reading_writing' as NonNullable<LearningStyle>])
  .range(['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'])
  .unknown(theme.surface);

export const shapedByColors = scaleOrdinal<NonNullable<ShapedBy>, string>()
  .domain([
    'mentor' as NonNullable<ShapedBy>,
    'challenge' as NonNullable<ShapedBy>,
    'failure' as NonNullable<ShapedBy>,
    'success' as NonNullable<ShapedBy>,
    'team' as NonNullable<ShapedBy>,
    'other' as NonNullable<ShapedBy>,
  ])
  .range(['#FF9F1C', '#2EC4B6', '#E71D36', '#011627', '#FF6B6B', '#4ECDC4'])
  .unknown(theme.surface);

export const peakPerformanceColors = scaleOrdinal<NonNullable<PeakPerformance>, string>()
  .domain([
    'Extrovert, Morning' as NonNullable<PeakPerformance>,
    'Extrovert, Evening' as NonNullable<PeakPerformance>,
    'Introvert, Morning' as NonNullable<PeakPerformance>,
    'Introvert, Night' as NonNullable<PeakPerformance>,
    'Ambivert, Morning' as NonNullable<PeakPerformance>,
    'Ambivert, Night' as NonNullable<PeakPerformance>,
  ])
  .range(['#FFD166', '#06D6A0', '#118AB2', '#073B4C', '#FF6B6B', '#4ECDC4'])
  .unknown(theme.surface);

export const motivationColors = scaleOrdinal<NonNullable<Motivation>, string>()
  .domain([
    'impact' as NonNullable<Motivation>,
    'growth' as NonNullable<Motivation>,
    'recognition' as NonNullable<Motivation>,
    'autonomy' as NonNullable<Motivation>,
    'purpose' as NonNullable<Motivation>,
  ])
  .range(['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FF9F1C'])
  .unknown(theme.surface);

// Sequential color scale for continuous data
export const sequentialColorScale = scaleSequential(interpolateRgb(theme.primary, theme.secondary))
  .domain([0, 1]);

// Accessibility utilities
export function getContrastRatio(foreground: string, background: string): number {
  const getLuminance = (color: string) => {
    const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
    const [r, g, b] = rgb.map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isAccessible(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 4.5;
}

// Color interpolation
export function interpolateColors(color1: string, color2: string, t: number): string {
  return interpolateRgb(color1, color2)(t);
}

// Theme constants
export const colorConstants = {
  node: {
    default: theme.surface,
    hover: theme.secondary,
    selected: theme.primary,
  },
  edge: {
    default: theme.border,
    hover: theme.secondary,
    selected: theme.primary,
  },
  text: {
    default: theme.text.primary,
    secondary: theme.text.secondary,
    muted: theme.text.muted,
  },
  background: {
    default: theme.background,
    surface: theme.surface,
  },
};

export function getYearsCategory(years: number): YearsCategory {
  if (years <= 5) return '0-5';
  if (years <= 10) return '6-10';
  if (years <= 15) return '11-15';
  if (years <= 20) return '16-20';
  return '20+';
} 