const { MongoClient } = require('mongodb');
const { backendConfig } = require('../config');
const logger = require('./logger');

async function mongodbConnect() {
  try {
    const client = new MongoClient(
      backendConfig.MongodbConnParams.url,
        { 
          useUnifiedTopology: true 
        }
    );
    await client.connect();
    logger.info(`Connecting to Mongodb success`);
    return client
  } catch (error) {
    logger.error(`Connecting to mongodb fail: ${error}`);
  }
  
}

async function initDB(client) {
  let db = await client.db(backendConfig.MongodbConnParams.db);
  return db
}

async function getBlockCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.block);
  return collection
};

async function getEventCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.event);
  return collection;
};

async function getExtrinsicCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.extrinsic);
  return collection;
}

async function getSignedExtrinsicCol(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.signedExtrinsic);
  return collection;
}

async function getAccountsCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.account);
  return collection;
};

async function getTransferColCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.transfer);
  return collection;
};

async function getRuntimeColCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.runtime);
  return collection;
}

async function getStakinRewardColCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.stakingReward);
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
  return collection;
}

async function getValidatorColCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.validator);
  return collection;
}

async function getEraCommissionColCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.eraCommission);
  return collection;
}

async function getEraVRCColCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.eraValidatorScore);
  return collection;
}

async function getEraRPColCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.eraRelativePerformance);
  return collection;
}

async function getEraSelfStakeColCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.eraSelfStake);
  return collection;
}

async function getEraPointsColCollection(client) {
  const db = await initDB(client);
  const collection = db.collection(backendConfig.MongoDbCol.eraPoints);
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
  getEraPointsColCollection
}
