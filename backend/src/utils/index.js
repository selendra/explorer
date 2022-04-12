module.exports.db = require("./dbClient");
module.exports.api = require("./apiProvider");

// Return array chunks of n size
module.exports.chunker = (a, n) =>
  Array.from({ length: Math.ceil(a.length / n) }, (_, i) =>
    a.slice(i * n, i * n + n),
  );

module.exports.shortHash = (hash) =>
  `${hash.substring(0, 6)}…${hash.substring(hash.length - 4, hash.length)}`;

module.exports.wait = async (ms) => new Promise((resolve) => {
  return setTimeout(resolve, ms);
});
