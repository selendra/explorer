const utils = require("../utils");

async function insertCommisonAvg(client, era) {
  const queryAvg = [
    {
      $match: {
        era: era,
      },
    },
    {
      $group: {
        _id: "$_id",
        avgCommission: { $avg: "$commission" },
      },
    },
  ];

  const eraCommissionCol = await utils.db.getEraCommissionColCollection(client);
  let res = await eraCommissionCol.aggregate(queryAvg).toArray();

  if (res.length != 0) {
    const data = {
      $set: {
        era: era,
        avgCommission: res[0].avgCommission,
      },
    };
    const query = {
      era: era,
    };
    const options = { upsert: true };

    const eraCommissionAvgCol = await utils.db.getEraCommissionAvgColCollection(
      client
    );
    await eraCommissionAvgCol.updateOne(query, data, options);
  }
}

async function insertSelfStakAvg(client, era) {
  const queryAvg = [
    {
      $match: {
        era: era,
      },
    },
    {
      $group: {
        _id: null,
        avgSelfStake: { $avg: "$selfStake" },
      },
    },
  ];

  const eraSelfStakCol = await utils.db.getEraSelfStakeColCollection(client);
  let res = await eraSelfStakCol.aggregate(queryAvg).toArray();

  if (res.length != 0) {
    const data = {
      $set: {
        era: era,
        avgSelfStake: res[0].avgSelfStake,
      },
    };
    const query = {
      era: era,
    };
    const options = { upsert: true };

    const eraSelfStakeAvg = await utils.db.getEraSelfStakeAvgColCollection(
      client
    );
    await eraSelfStakeAvg.updateOne(query, data, options);
  }
}

async function insertAvgPerformance(client, era) {
  const queryAvg = [
    {
      $match: {
        era: era,
      },
    },
    {
      $group: {
        _id: null,
        avgPerformance: { $avg: "$relativePerformance" },
      },
    },
  ];

  const eraPerformanceCol = await utils.db.getEraRPColCollection(client);
  let res = await eraPerformanceCol.aggregate(queryAvg).toArray();

  if (res.length != 0) {
    const data = {
      $set: {
        era: era,
        avgSelfStake: res[0].avgPerformance,
      },
    };
    const query = {
      era: era,
    };
    const options = { upsert: true };

    const eraPerformanceAvg = await utils.db.getEraRPAvgColCollection(client);
    await eraPerformanceAvg.updateOne(query, data, options);
  }
}

async function insertAvgPoint(client, era) {
  const queryAvg = [
    {
      $match: {
        era: era,
      },
    },
    {
      $group: {
        _id: null,
        avgPoints: { $avg: "$points" },
      },
    },
  ];

  const eraPointCol = await utils.db.getEraPointsColCollection(client);
  let res = await eraPointCol.aggregate(queryAvg).toArray();

  if (res.length != 0) {
    const data = {
      $set: {
        era: era,
        avgPoints: res[0].avgPoints,
      },
    };
    const query = {
      era: era,
    };
    const options = { upsert: true };

    const eraPointAvg = await utils.db.getEraPointsAvgColCollection(client);
    await eraPointAvg.updateOne(query, data, options);
  }
}

module.exports = {
  insertCommisonAvg,
  insertSelfStakAvg,
  insertAvgPerformance,
  insertAvgPoint,
};
