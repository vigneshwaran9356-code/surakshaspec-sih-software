import { describe, expect, it } from 'vitest';
import { evaluateReadings } from '../app/rules.js';
import { buildVoiceSentence } from '../app/voice.js';
import en from '../app/locales/en.json';
import ta from '../app/locales/ta.json';
import hi from '../app/locales/hi.json';

const localeKeys = ['voiceQualityGood', 'voiceQualityModerate', 'voiceQualityPoor', 'voiceQualityUnsafe', 'voiceNoProblem', 'voiceLimited', 'voiceNoSensorData', 'voiceProblemNames', 'voiceProblemAdvice'];

describe('voice locales and sentence builder', () => {
  it('has every voice sentence key in all three languages', () => {
    localeKeys.forEach((key) => {
      expect(en).toHaveProperty(key);
      expect(ta).toHaveProperty(key);
      expect(hi).toHaveProperty(key);
    });
    Object.keys(en.voiceProblemNames).forEach((key) => {
      expect(ta.voiceProblemNames).toHaveProperty(key);
      expect(hi.voiceProblemNames).toHaveProperty(key);
    });
    Object.keys(en.voiceProblemAdvice).forEach((key) => {
      expect(ta.voiceProblemAdvice).toHaveProperty(key);
      expect(hi.voiceProblemAdvice).toHaveProperty(key);
    });
  });

  it('returns no speech when there are no readings', () => {
    expect(buildVoiceSentence({ measuredCount: 0, quality: null, problems: [], limited: true }, en)).toBe('');
  });
});

 describe('evaluateReadings', () => {
  it('stops without a quality result when no sensor is measured', () => {
    const result = evaluateReadings({ temp: null, hum: null, ftemp: null });
    expect(result.quality).toBeNull();
    expect(result.measuredCount).toBe(0);
  });

  it('returns Good only for measured values with no problem', () => {
    const result = evaluateReadings({ temp: 25, hum: 60, ftemp: 27 });
    expect(result.quality).toBe('Good');
    expect(result.problems).toHaveLength(0);
  });

  it('marks a five degree feed difference as Poor', () => {
    expect(evaluateReadings({ temp: 25, ftemp: 30 }).quality).toBe('Poor');
  });

  it('does not mark a four point nine degree difference as Poor', () => {
    expect(evaluateReadings({ temp: 25, ftemp: 29.9 }).quality).toBe('Good');
  });

  it('checks air temperature strictly above 35 C', () => {
    expect(evaluateReadings({ temp: 35 }).quality).toBe('Good');
    expect(evaluateReadings({ temp: 35.1 }).quality).toBe('Moderate');
  });

  it('checks humidity strictly above 70 percent', () => {
    expect(evaluateReadings({ hum: 70 }).quality).toBe('Good');
    expect(evaluateReadings({ hum: 70.1 }).quality).toBe('Moderate');
  });

  it('checks pH boundaries', () => {
    expect(evaluateReadings({ ph: 4.5 }).quality).toBe('Moderate');
    expect(evaluateReadings({ ph: 4.49 }).quality).toBe('Good');
    expect(evaluateReadings({ ph: 5.0 }).quality).toBe('Poor');
  });

  it('ignores missing values instead of treating them as zero', () => {
    const result = evaluateReadings({ temp: null, hum: undefined, ftemp: null, ph: null });
    expect(result.measuredCount).toBe(0);
    expect(result.quality).toBeNull();
  });
});
