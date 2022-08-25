export * from './db';
export * from './utils';
export * from './types';

export const getRandom = (arr: any[], n: number): any[] => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
};
