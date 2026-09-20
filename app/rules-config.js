export const RULE_CONFIG = {
  feedTemperatureDifferenceC: 5,
  highAirTemperatureC: 35,
  highHumidityPercent: 70,
  silagePhWeakMinimum: 4.5,
  silagePhSpoilageMinimum: 5.0,
  moistureLimitsPercent: {
    pellet: 12,
    mash: 14,
    silage: 70,
    mineral: 5
  },
  highTds: 1500,
  gasIncreaseRatio: 1.4
};

export const SENSOR_KEYS = ['temp', 'hum', 'ftemp', 'moist', 'ph', 'tds', 'gas'];
