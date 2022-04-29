const utils = require("../utils");
const { backendConfig } = require("../config");

async function removeEraValidatorStats(client, currentEra) {
  let depthHistory = currentEra - backendConfig.historySize;
  const query = { $or: [{ era: { $lt: depthHistory } }, { era: null }] };

  const eraVrcCol = await utils.db.getEraVRCColCollection(client);
  const eraCommissionCol = await utils.db.getEraCommissionColCollection(client);
  const eraRPCol = await utils.db.getEraRPColCollection(client);
  const eraSSCol = await utils.db.getEraSelfStakeColCollection(client);
  const eraEraPointsCol = await utils.db.getEraPointsColCollection(client);

  await eraVrcCol.deleteMany(query);
  await eraCommissionCol.deleteMany(query);
  await eraRPCol.deleteMany(query);
  await eraSSCol.deleteMany(query);
  await eraEraPointsCol.deleteMany(query);
}

async function removeEraValidatorAvgStats(client, currentEra) {
  let depthHistory = currentEra - backendConfig.historySize;
  const query = { era: { $lt: depthHistory } };

  const eraCommissionAvgCol = await utils.db.getEraCommissionAvgColCollection(
    client
  );
  const eraSelfStakeAvg = await utils.db.getEraSelfStakeAvgColCollection(
    client
  );
  const eraPerformanceAvg = await utils.db.getEraRPAvgColCollection(client);
  const eraPointAvg = await utils.db.getEraPointsAvgColCollection(client);

  await eraCommissionAvgCol.deleteMany(query);
  await eraSelfStakeAvg.deleteMany(query);
  await eraPerformanceAvg.deleteMany(query);
  await eraPointAvg.deleteMany(query);
}

module.exports = {
  removeEraValidatorStats,
  removeEraValidatorAvgStats,
};
