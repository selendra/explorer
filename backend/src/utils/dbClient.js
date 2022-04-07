const { MongoClient } = require('mongodb');
const constants = require('../config');

let client;
let db;

let chainCol;
let blockCol;
let extrinsicCol;
let eventCol;
let statusCol;
let accountsCol;
let transferCol;

const genesisHeight = 1;

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
  chainCol = db.collection('chain');
  eventCol = db.collection('event');
  extrinsicCol = db.collection('extrinsic');
  statusCol = db.collection('status');
  transferCol = db.collection('transfer')

  await _createIndexes();
};

async function _createIndexes() {
  if (!db) {
    console.error('Please call initDb first');
    process.exit(1);
  }

  await blockCol.createIndex({ 'header.number': -1 });
  await extrinsicCol.createIndex({
    'indexer.blockHeight': -1,
    'indexer.index': -1
  });
  await eventCol.createIndex({ 'indexer.blockHeight': -1, index: -1 });
};

async function tryInit(col) {
  if(!col) {
    await initDB();
  }
};

async function getChainCollection() {
  await tryInit(chainCol);
  return chainCol;
};
async function getStatusCollection() {
  await tryInit(statusCol);
  return statusCol;
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
async function getAccountsCollection() {
  await tryInit(accountsCol);
  return accountsCol;
};
async function getTransferColCollection() {
  await tryInit(transferCol)
  return transferCol
}


async function getFirstScanHeight() {
  const statusCol = await getStatusCollection();
  const heightInfo = await statusCol.findOne({ name: 'main-scan-height' });
  if(!heightInfo) {
    return genesisHeight;
  } else if(typeof heightInfo.value === 'number') {
    return heightInfo.value + 1;
  } else {
    console.error('The scan height information in the database is wrong!');
    process.exit(1);
  }
};

async function updateScanHeight(height) {
  const statusCol = await getStatusCollection()
  await statusCol.findOneAndUpdate(
    { name: 'main-scan-height' },
    { $set: { value: height } },
    { upsert: true }
  )
}

module.exports = {
  getFirstScanHeight,
  updateScanHeight,
  getChainCollection,
  getBlockCollection,
  getEventCollection,
  getAccountsCollection,
  getExtrinsicCollection,
  getTransferColCollection
}
