const { MongoClient } = require('mongodb');
const constants = require('../config');

let client;
let db;

let blockCol;
let extrinsicCol;
let eventCol;
let runtimeCol;
let accountsCol;
let transferCol;
let signedExtrinsicCol;
let stakingRewardCol;

async function initDB() {
  client = await MongoClient.connect(
    constants.MONGOURI,
    { 
      useUnifiedTopology: true 
    }
  );
  db = client.db(constants.DATABASE);

  accountsCol = db.collection('accounts');
  blockCol = db.collection('block');
  eventCol = db.collection('event');
  extrinsicCol = db.collection('extrinsic');
  signedExtrinsicCol = db.collection('signed_extrinsic');
  runtimeCol = db.collection('runtime');
  transferCol = db.collection('transfer');
  stakingRewardCol = db.collection('staking_reward')

  await _createIndexes();
};

async function _createIndexes() {
  if (!db) {
    console.error('Please call initDb first');
    process.exit(1);
  }
  await blockCol.createIndex({ 'header.number': -1 });
  await extrinsicCol.createIndex({'indexer.blockHeight': -1,'indexer.index': -1});
  await signedExtrinsicCol.createIndex({ 'indexer.blockHeight': -1, index: -1 });
  await eventCol.createIndex({ 'indexer.blockHeight': -1, index: -1 });
  await runtimeCol.createIndex({ 'indexer.blockHeight': -1, index: -1 });
  await accountsCol.createIndex({ 'indexer.blockHeight': -1, index: -1 });  
};

async function tryInit(col) {
  if(!col) {
    await initDB();
  }
};

async function getBlockCollection() {
  await tryInit(blockCol);
  return blockCol;
};

async function getEventCollection() {
  await tryInit(eventCol);
  return eventCol;
};

async function getExtrinsicCollection() {
  await tryInit(extrinsicCol);
  return extrinsicCol;
}

async function getSignedExtrinsicCol() {
  await tryInit(signedExtrinsicCol);
  return signedExtrinsicCol;
}

async function getAccountsCollection() {
  await tryInit(accountsCol);
  return accountsCol;
};

async function getTransferColCollection() {
  await tryInit(transferCol)
  return transferCol
};

async function getRuntimeColCollection() {
  await tryInit(runtimeCol)
  return runtimeCol
}

async function getStakinRewardColCollection() {
  await tryInit(stakingRewardCol)
  return stakingRewardCol
}

module.exports = {
  getBlockCollection,
  getEventCollection,
  getAccountsCollection,
  getExtrinsicCollection,
  getSignedExtrinsicCol,
  getTransferColCollection,
  getRuntimeColCollection,
  getStakinRewardColCollection,
}
