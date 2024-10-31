// Return array chunks of n size
export const chunker = (a: any[], n: number): any[] =>
  Array.from({ length: Math.ceil(a.length / n) }, (_, i) =>
    a.slice(i * n, i * n + n),
  );
