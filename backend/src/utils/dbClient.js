const { MongoClient } = require("mongodb");
const { backendConfig } = require("../config");
const logger = require("./logger");

async function mongodbConnect() {
  try {
    const client = new MongoClient(backendConfig.MongodbConnParams.url, {
      useUnifiedTopology: true,
    });
    await client.connect();
    logger.info(`Connecting to Mongodb success`);
    return client;
  } catch (error) {
    logger.error(`Connecting to mongodb fail: ${error}`);
  }
}

async function initDB(client) {
  let db = await client.db(backendConfig.MongodbConnParams.db);
  return db;
}

async function initVDB(client) {
  let db = await client.db(backendConfig.MongodbConnParams.vdb);
  return db;
}

async function getBlockCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.block);
  collection.createIndex("blockNumber", { unique: true });
  return collection;
}

async function getEventCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.event);
  collection.createIndex({ blockNumber: 1, eventIndex: 1 }, { unique: true });
  return collection;
}

async function getExtrinsicCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.extrinsic);
  collection.createIndex({ blockNumber: 1, hash: "" }, { unique: true });
  return collection;
}

async function getSignedExtrinsicCol(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.signedExtrinsic);
  collection.createIndex({ blockNumber: 1, hash: "" }, { unique: true });
  return collection;
}

async function getAccountsCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.account);
  return collection;
}

async function gettotalLockCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.totalLock);
  return collection;
}

async function getTransferColCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.transfer);
  collection.createIndex({ blockNumber: 1, hash: "" }, { unique: true });
  return collection;
}

async function getRuntimeColCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.runtime);
  return collection;
}

async function getStakinRewardColCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.stakingReward);
  collection.createIndex({ blockNumber: 1, eventIndex: 1 }, { unique: true });
  return collection;
}

async function getStakingSlashColCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.stakingSlash);
  return collection;
}

async function getLogColCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.log);
  collection.createIndex({ blockNumber: 1, index: 1 }, { unique: true });
  return collection;
}

async function getValidatorColCollection(client) {
  const db = await initVDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.validator);
  return collection;
}

async function getValidatorRankingColCollection(client) {
  const db = await initVDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.validatorRanking);
  return collection;
}

async function getEraCommissionColCollection(client) {
  const db = await initVDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.eraCommission);
  return collection;
}

async function getEraVRCColCollection(client) {
  const db = await initVDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.eraValidatorScore);
  return collection;
}

async function getEraRPColCollection(client) {
  const db = await initVDB(client);
  const collection = db.collection(
    backendConfig.MongoDbCol.eraRelativePerformance
  );
  return collection;
}

async function getEraSelfStakeColCollection(client) {
  const db = await initVDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.eraSelfStake);
  return collection;
}

async function getEraPointsColCollection(client) {
  const db = await initVDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.eraPoints);
  return collection;
}
//
async function getEraCommissionAvgColCollection(client) {
  const db = await initVDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.eraCommissionAvg);
  return collection;
}

async function getEraVRCAvgColCollection(client) {
  const db = await initVDB(client);
  const collection = db.collection(
    backendConfig.MongoDbCol.eraValidatorScoreAvg
  );
  return collection;
}

async function getEraRPAvgColCollection(client) {
  const db = await initVDB(client);
  const collection = db.collection(
    backendConfig.MongoDbCol.eraRelativePerformanceAvg
  );
  return collection;
}

async function getEraSelfStakeAvgColCollection(client) {
  const db = await initVDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.eraSelfStakeAvg);
  return collection;
}

async function getEraPointsAvgColCollection(client) {
  const db = await initVDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.eraPointsAvg);
  return collection;
}

async function getFeatureColCollection(client) {
  const db = await initVDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.validatorFeature);
  return collection;
}

module.exports = {
  mongodbConnect,
  getBlockCollection,
  getEventCollection,
  getAccountsCollection,
  getExtrinsicCollection,
  getSignedExtrinsicCol,
  getTransferColCollection,
  getRuntimeColCollection,
  getStakinRewardColCollection,
  getStakingSlashColCollection,
  getLogColCollection,
  getValidatorColCollection,
  getEraCommissionColCollection,
  getEraVRCColCollection,
  getEraRPColCollection,
  getEraSelfStakeColCollection,
  getEraPointsColCollection,
  getEraCommissionAvgColCollection,
  getEraVRCAvgColCollection,
  getEraRPAvgColCollection,
  getEraSelfStakeAvgColCollection,
  getEraPointsAvgColCollection,
  getValidatorRankingColCollection,
  getFeatureColCollection,
  gettotalLockCollection
};
