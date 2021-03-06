module.exports.db = require("./dbClient");
module.exports.api = require("./apiProvider");
module.exports.ss58 = require("./covert_ss58");

// Return array chunks of n size
module.exports.chunker = (a, n) =>
  Array.from({ length: Math.ceil(a.length / n) }, (_, i) =>
    a.slice(i * n, i * n + n)
  );

module.exports.shortHash = (hash) =>
  `${hash.substring(0, 6)}…${hash.substring(hash.length - 4, hash.length)}`;

module.exports.wait = async (ms) =>
  new Promise((resolve) => {
    return setTimeout(resolve, ms);
  });

module.exports.getRandom = (arr, n) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
};

// Return a reverse ordered array filled from range
module.exports.reverseRange = (start, stop, step) =>
  Array.from({ length: (stop - start) / step + 1 }, (_, i) => stop - i * step);

// Return filled array from range
module.exports.range = (start, stop, step) =>
  Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);
