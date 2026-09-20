import { RULE_CONFIG, SENSOR_KEYS } from './rules-config.js';

function isMeasured(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function evaluateReadings(readings, feedType = 'pellet') {
  const safeReadings = readings && typeof readings === 'object' ? readings : {};
  const measuredKeys = SENSOR_KEYS.filter((key) => isMeasured(safeReadings[key]));
  const checksDone = [];
  const checksNotDone = [];
  const problems = [];
  let quality = 'Good';

  function done(key, name) {
    if (measuredKeys.includes(key)) checksDone.push(name);
    else checksNotDone.push(name);
  }

  function problem(level, name, advice) {
    problems.push({ level, name, advice });
    if (level === 'Poor' || (level === 'Unsafe' && quality !== 'Poor')) quality = level;
    else if (level === 'Moderate' && quality === 'Good') quality = level;
  }

  const hasAirTemperature = isMeasured(safeReadings.temp);
  const hasHumidity = isMeasured(safeReadings.hum);
  const hasFeedTemperature = isMeasured(safeReadings.ftemp);

  if (hasAirTemperature && hasFeedTemperature) {
    done('temp', 'feedTemperatureDifference');
    done('ftemp', 'feedTemperatureDifference');
    if (safeReadings.ftemp - safeReadings.temp >= RULE_CONFIG.feedTemperatureDifferenceC) {
      problem('Poor', 'feedTemperatureDifference', 'feedTemperatureHigh');
    }
  } else {
    checksNotDone.push('feedTemperatureDifference');
  }

  if (hasAirTemperature) {
    done('temp', 'airTemperatureStorage');
    if (safeReadings.temp > RULE_CONFIG.highAirTemperatureC) problem('Moderate', 'airTemperatureStorage', 'airTemperatureHigh');
  } else checksNotDone.push('airTemperatureStorage');

  if (hasHumidity) {
    done('hum', 'humidityStorage');
    if (safeReadings.hum > RULE_CONFIG.highHumidityPercent) problem('Moderate', 'humidityStorage', 'humidityHigh');
  } else checksNotDone.push('humidityStorage');

  if (isMeasured(safeReadings.ph)) {
    done('ph', 'silagePh');
    if (safeReadings.ph >= RULE_CONFIG.silagePhSpoilageMinimum) problem('Poor', 'silagePhSpoilage', 'silagePhSpoilage');
    else if (safeReadings.ph >= RULE_CONFIG.silagePhWeakMinimum) problem('Moderate', 'silagePhWeak', 'silagePhWeak');
  } else checksNotDone.push('silagePh');

  if (isMeasured(safeReadings.moist)) {
    done('moist', 'moisture');
    const limit = RULE_CONFIG.moistureLimitsPercent[feedType] ?? RULE_CONFIG.moistureLimitsPercent.pellet;
    if (safeReadings.moist > limit) problem('Poor', 'moisture', 'moistureHigh');
  } else checksNotDone.push('moisture');

  if (isMeasured(safeReadings.tds)) {
    done('tds', 'salt');
    if (safeReadings.tds > RULE_CONFIG.highTds) problem('Moderate', 'saltHigh', 'saltHigh');
  } else checksNotDone.push('salt');

  if (isMeasured(safeReadings.gas)) {
    done('gas', 'gas');
    if (safeReadings.gas > RULE_CONFIG.gasIncreaseRatio) problem('Poor', 'gasHigh', 'gasHigh');
  } else checksNotDone.push('gas');

  return {
    quality: measuredKeys.length ? quality : null,
    measuredCount: measuredKeys.length,
    possibleCount: SENSOR_KEYS.length,
    checksDone: [...new Set(checksDone)],
    checksNotDone: [...new Set(checksNotDone)],
    problems,
    limited: measuredKeys.length < SENSOR_KEYS.length
  };
}
