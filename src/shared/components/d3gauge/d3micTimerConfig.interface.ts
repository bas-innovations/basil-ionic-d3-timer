export interface IMicTimerConfig {
    countdownFor: number;  // countdown time in ms
    warmUpFor: number;  // countdown time in ms
    warningFor: number; // countdown time in ms
}

export interface RingerTimeData {
  idx: number;
  t: string;
  s: number;
  max: number;
  value: number;
  baseZeroToOne: number;
  singleDecValue: number;
}