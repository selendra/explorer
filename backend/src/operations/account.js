const Sentry = require("@sentry/node");
const { BigNumber } = require("bignumber.js");
const _ = require("lodash");

const utils = require("../utils");
const logger = require("../utils/logger");
const { backendConfig } = require("../config");

Sentry.init({
  dsn: backendConfig.sentryDSN,
  tracesSampleRate: 1.0,
});

function getAccountIdFromArgs(account) {
  return account.map(({ args }) => args).map(([e]) => e.toHuman());
}

async function fetchAccountIds(api) {
  return getAccountIdFromArgs(await api.query.system.account.keys());
}

async function processAccountsChunk(client, api, accountId) {
  try {
    const timestamp = Math.floor(parseInt(Date.now().toString(), 10) / 1000);
    const [block, identity, balances] = await Promise.all([
      api.rpc.chain
        .getBlock()
        .then((result) => result.block.header.number.toNumber()),
      api.derive.accounts.identity(accountId),
      api.derive.balances.all(accountId),
    ]);

    const availableBalance = new BigNumber(balances.availableBalance)
      .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
      .toNumber();
    const freeBalance = new BigNumber(balances.freeBalance)
      .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
      .toNumber();
    const lockedBalance = new BigNumber(balances.lockedBalance)
      .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
      .toNumber();
    const reservedBalance = new BigNumber(balances.reservedBalance)
      .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
      .toNumber();
    const totalBalance = new BigNumber(
      balances.freeBalance.add(balances.reservedBalance)
    )
      .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
      .toNumber();
    
    const vestBalance = new BigNumber(balances.vestingTotal)
      .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
      .toNumber();
    const vestedClaimable = new BigNumber(balances.vestedClaimable)
      .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
      .toNumber();
    const vestingTotal = new BigNumber(balances.vestingTotal)
      .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
      .toNumber();
    const vestingList = JSON.stringify(balances.vesting);

    let vestingDetails = {
      vestBalance: vestBalance,
      vestedClaimable: vestedClaimable,
      vestingTotal: vestingTotal,
      vestingList: vestingList
    };

    const identityDisplay = identity.display ? identity.display.toString() : "";
    const identityDisplayParent = identity.displayParent
      ? identity.displayParent.toString()
      : "";
    const identityDisplaylegal = identity.legal
      ? identity.legal.toString()
      : "";
    const identityDisplayEmail = identity.email
      ? identity.email.toString()
      : "";
    const identityDisplayTwitter = identity.twitter
      ? identity.twitter.toString()
      : "";
    const identityDisplayWeb = identity.web
      ? identity.web.toString()
      : "";
    const identityDisplayRiot = identity.riot
      ? identity.riot.toString()
      : "";
    const identityDisplayOther = identity.other ? JSON.stringify(identity.other) : "";
    const identityJudgements = identity.judgements
      ? identity.judgements.toString()
      : "";
    
    const identityDetail = {
        identityDisplay: identityDisplay,
        identityDisplayParent: identityDisplayParent,
        identityDisplaylegal: identityDisplaylegal,
        identityDisplayEmail: identityDisplayEmail,
        identityDisplayTwitter: identityDisplayTwitter,
        identityDisplayWeb: identityDisplayWeb,
        identityDisplayRiot: identityDisplayRiot,
        identityDisplayOther: identityDisplayOther,
        identityJudgements: identityJudgements,
    };
    
    const nonce = parseInt(balances.accountNonce);
    const query = { accountId: accountId };
    const update = {
      $set: {
        accountId: accountId,
        identityDetail: identityDetail,
        availableBalance: availableBalance,
        freeBalance: freeBalance,
        lockedBalance: lockedBalance,
        reservedBalance: reservedBalance,
        totalBalance: totalBalance,
        vestingDetails: vestingDetails,
        nonce,
        timestamp,
        blockHeight: block,
      },
    };
    const options = { upsert: true };
    try {
      const accountCol = await utils.db.getAccountsCollection(client);
      await accountCol.updateOne(query, update, options);
    } catch (error) {
      logger.error(`Error adding account: #${accountId}: ${error}`);
      const scope = new Sentry.Scope();
      scope.setTag("AccountAddress", accountId);
      Sentry.captureException(error, scope);
    }
  } catch (error) {
    logger.error(
      `Error fetching account: ${accountId}: ${JSON.stringify(error)}`
    );
    const scope = new Sentry.Scope();
    scope.setTag("AccountAddress", accountId);
    Sentry.captureException(error, scope);
  }
}

async function updateAccountInfo(client, api, blockNumber, timestamp, address) {
  try {
    const [balances, { identity }] = await Promise.all([
      api.derive.balances.all(address),
      api.derive.accounts.info(address),
    ]);
    const availableBalance = new BigNumber(balances.availableBalance)
      .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
      .toNumber();
    const freeBalance = new BigNumber(balances.freeBalance)
      .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
      .toNumber();
    const lockedBalance = new BigNumber(balances.lockedBalance)
      .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
      .toNumber();
    const reservedBalance = new BigNumber(balances.reservedBalance)
      .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
      .toNumber();
    const totalBalance = new BigNumber(
      balances.freeBalance.add(balances.reservedBalance)
    )
      .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
      .toNumber();
    
    
    const vestBalance = new BigNumber(balances.vestingTotal)
      .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
      .toNumber();
    const vestedClaimable = new BigNumber(balances.vestedClaimable)
      .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
      .toNumber();
    const vestingTotal = JSON.stringify(balances.vestingTotal);
    const vestingList = JSON.stringify(balances.vesting);

    let vestingDetails = {
      vestBalance: vestBalance,
      vestedClaimable: vestedClaimable,
      vestingTotal: vestingTotal,
      vestingList: vestingList
    };

    const identityDisplay = identity.display ? identity.display.toString() : "";
    const identityDisplayParent = identity.displayParent
      ? identity.displayParent.toString()
      : "";
    const identityDisplaylegal = identity.legal
      ? identity.legal.toString()
      : "";
    const identityDisplayEmail = identity.email
      ? identity.email.toString()
      : "";
    const identityDisplayTwitter = identity.twitter
      ? identity.twitter.toString()
      : "";
    const identityDisplayWeb = identity.web
      ? identity.web.toString()
      : "";
    const identityDisplayRiot = identity.riot
      ? identity.riot.toString()
      : "";
    const identityDisplayOther = identity.other ? JSON.stringify(identity.other) : "";
    const identityJudgements = identity.judgements
      ? identity.judgements.toString()
      : "";
    
    const identityDetail = {
        identityDisplay: identityDisplay,
        identityDisplayParent: identityDisplayParent,
        identityDisplaylegal: identityDisplaylegal,
        identityDisplayEmail: identityDisplayEmail,
        identityDisplayTwitter: identityDisplayTwitter,
        identityDisplayWeb: identityDisplayWeb,
        identityDisplayRiot: identityDisplayRiot,
        identityDisplayOther: identityDisplayOther,
        identityJudgements: identityJudgements,
    };

    const nonce = parseInt(balances.accountNonce);
    const addressQuery = { accountId: address };
    const update = {
      $set: {
        accountId: address,
        identityDetail: identityDetail,
        availableBalance: availableBalance,
        freeBalance: freeBalance,
        lockedBalance: lockedBalance,
        reservedBalance: reservedBalance,
        totalBalance: totalBalance,
        vestingDetails: vestingDetails,
        nonce,
        timestamp,
        blockHeight: block,
      },
    };
    const options = { upsert: true };

    try {
      const accountCol = await utils.db.getAccountsCollection(client);
      await accountCol.updateOne(addressQuery, update, options);

      logger.debug(
        `Updated account info for event/s involved address ${address}`
      );
    } catch (error) {
      logger.error(`Error update account: #${address}: ${error}`);
      const scope = new Sentry.Scope();
      scope.setTag("AccountAddress", address);
      Sentry.captureException(error, scope);
    }
  } catch (error) {
    logger.error(
      `Error updating account info for event/s involved address: ${JSON.stringify(
        error
      )}`
    );
    const scope = new Sentry.Scope();
    scope.setTag("AccountAddress", accountId);
    Sentry.captureException(error, scope);
  }
}

async function updateAccountsInfo(
  client,
  api,
  blockNumber,
  timestamp,
  blockEvents
) {
  const startTime = new Date().getTime();
  const involvedAddresses = [];

  blockEvents.forEach(({ event }) => {
    const types = event.typeDef;
    event.data.forEach((data, index) => {
      if (types[index].type === "AccountId32") {
        involvedAddresses.push(data.toString());
      }
    });
  });
  const uniqueAddresses = _.uniq(involvedAddresses);
  await Promise.all(
    uniqueAddresses.map((address) =>
      updateAccountInfo(client, api, blockNumber, timestamp, address)
    )
  );

  // Log execution time
  const endTime = new Date().getTime();
  logger.info(
    `Updated ${uniqueAddresses.length} accounts in ${(
      (endTime - startTime) /
      1000
    ).toFixed(3)}s`
  );
}

async function getTotalLockBalance(client) {
  const queryTotalLock = [
    {
      $group: {
        _id: null,
        totalLock: { $sum: "$lockedBalance" },
      },
    },
  ];

  try {
    const accountCol = await utils.db.getAccountsCollection(client);
    let lockBalance = await accountCol.aggregate(queryTotalLock).toArray();

    const query = {};
    const update = {
      $set: {
        totalLockBalances: lockBalance[0].totalLock,
      },
    };
    const options = { upsert: true };

    const lockBalanceCol = await utils.db.gettotalLockCollection(client);
    await lockBalanceCol.updateOne(query, update, options);

    logger.debug(
      `Update total lock balance`
    );
  } catch (error) {
    logger.error(`Error update total lock balance: ${error}`);
    const scope = new Sentry.Scope();
    scope.setTag("lockbalance");
    Sentry.captureException(error, scope);
  }
}


module.exports = {
  processAccountsChunk,
  updateAccountsInfo,
  fetchAccountIds,
  getTotalLockBalance,
};
