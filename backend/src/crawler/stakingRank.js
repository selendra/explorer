const Sentry = require('@sentry/node');
const { BigNumber } = require('bignumber.js');

const { backendConfig } = require('../config');
const utils = require('../utils');
const logger = require('../utils/logger');
const { insertEraValidatorStats } = require("../operatons/staking")

Sentry.init({
    dsn: backendConfig.sentryDSN,
    tracesSampleRate: 1.0,
});

const config = backendConfig.crawlers.find(
    ({ name }) => name === "ranking",
);

async function crawler(delayedStart){
    if (delayedStart) {
        logger.info(`Delaying ranking crawler start for ${config.startDelay / 1000}s`);
        await utils.wait(config.startDelay);
    }

    logger.debug('Starting staking ranking crawler...');
    const startTime = new Date().getTime();

    const api = await utils.api.getAPI();
    const client = await utils.db.mongodbConnect();

    let synced = await utils.api.isNodeSynced(api);
    while (!synced) {
      await wait(10000);
      synced = await utils.api.isNodeSynced(api);
    }

    const clusters= [];
    const stakingQueryFlags = {
      withDestination: false,
      withExposure: true,
      withLedger: true,
      withNominations: false,
      withPrefs: true,
    };
    const minMaxEraPerformance = [];
    const participateInGovernance = [];
    let validators = [];
    let intentions = [];
    let maxPerformance = 0;
    let minPerformance = 0;
  
    //
    // data collection
    //
    
    try {
        // chain data
        logger.debug('Fetching chain data ...');
        const withActive = false;

        logger.debug('Step #1');
        const [erasHistoric, chainCurrentEra, chainActiveEra] = await Promise.all([
            api.derive.staking.erasHistoric(withActive),
            api.query.staking.currentEra(),
            api.query.staking.activeEra(),
        ]);

        const eraIndexes = erasHistoric.slice(
            Math.max(erasHistoric.length - config.historySize, 0),
        );
        const { maxNominatorRewardedPerValidator } = api.consts.staking;

        logger.debug('Step #2');
        const [
            { block }, validatorAddresses, waitingInfo, nominators, councilVotes, proposals, referendums,
        ] = await Promise.all([
            api.rpc.chain.getBlock(),
            api.query.session.validators(),
            api.derive.staking.waitingInfo(stakingQueryFlags),
            api.query.staking.nominators.entries(),
            api.derive.council.votes(),
            api.derive.democracy.proposals(),
            api.derive.democracy.referendums(),
        ]);

        logger.debug('Step #3');
        const erasPoints = await api.derive.staking._erasPoints(
            eraIndexes, withActive
        );

        logger.debug('Step #4');
        let erasPreferences = [];
        for (const eraIndex of eraIndexes) {
          const eraPrefs = await api.derive.staking.eraPrefs(eraIndex);
          erasPreferences = erasPreferences.concat(eraPrefs);
        }

        logger.debug('Step #5');
        let erasSlashes  = [];
        for (const eraIndex of eraIndexes) {
            const eraSlashes = await api.derive.staking.eraSlashes(eraIndex);
            erasSlashes = erasSlashes.concat(eraSlashes);
        }

        logger.debug('Step #6');
        let erasExposure = [];
        for (const eraIndex of eraIndexes) {
          const eraExposure = await api.derive.staking.eraExposure(eraIndex);
          erasExposure = erasExposure.concat(eraExposure);
        }

        logger.debug('Step #7');
        validators = await Promise.all(
            validatorAddresses.map((authorityId) =>
                api.derive.staking.query(authorityId, stakingQueryFlags),
            ),
        );

        logger.debug('Step #8');
        validators = await Promise.all(
            validators.map((validator) =>
                api.derive.accounts.info(validator.accountId).then(({ identity }) => ({
                    ...validator,
                    identity,
                    active: true,
                })),
            ),
        );

        logger.debug('Step #9');
        intentions = await Promise.all(
            waitingInfo.info.map((intention) =>
                api.derive.accounts.info(intention.accountId).then(({ identity }) => ({
                    ...intention,
                    identity,
                    active: false,
                })),
            ),
        );

        const dataCollectionEndTime = new Date().getTime();
        const dataCollectionTime = dataCollectionEndTime - startTime;
        logger.debug('Done!');

        //
        // data processing
        //
        logger.debug('Processing data ...');
        const blockHeight = parseInt(block.header.number.toString(), 10);
        const numActiveValidators = validatorAddresses.length;
        const eraPointsHistoryTotals = [];
        erasPoints.forEach(({ eraPoints }) => {
            eraPointsHistoryTotals.push(parseInt(eraPoints.toString(), 10));
        });
        const eraPointsHistoryTotalsSum = eraPointsHistoryTotals.reduce(
            (total, num) => total + num, 0,
        );
        const eraPointsAverage = eraPointsHistoryTotalsSum / numActiveValidators;

        // dashboard metrics
        const activeValidatorCount = validatorAddresses.length;
        const waitingValidatorCount = waitingInfo.info.length;
        const nominatorCount = nominators.length;
        const currentEra = chainCurrentEra.toString();
        const activeEra = JSON.parse(JSON.stringify(chainActiveEra)).index;

        // minimun stake
        logger.debug('Finding minimum stake');
        const nominatorStakes = [];
        for (const validator of validators) {
        for (const nominatorStake of validator.exposure.others) {
            nominatorStakes.push(nominatorStake.value);
            }
        }
        nominatorStakes.sort((a, b) => (a.unwrap().lt(b.unwrap()) ? -1 : 1));
        let minimumStake = nominatorStakes[0];

        minimumStake = new BigNumber(minimumStake).dividedBy(1e18).toNumber();

        logger.debug(`${activeValidatorCount} active validators`);
        logger.debug(`${waitingValidatorCount} waiting validators`);
        logger.debug(`${nominatorCount} nominators`);
        logger.debug(`Current era is ${currentEra}`);
        logger.debug(`Active era is ${activeEra}`);
        logger.debug(`Minimum amount to stake is ${minimumStake}`);

        const query = { };
        const update = { $set: { 
            activeValidatorCount,
            waitingValidatorCount,
            nominatorCount,
            currentEra: parseInt(currentEra),
            activeEra,
            minimumStake
         }
        }
        const options = { upsert: true };

        const validatorCol = await utils.db.getValidatorColCollection(client);
        await validatorCol.updateOne(query, update, options);

        // // We want to store era stats only when there's a new consolidated era in chain history
        // if (parseInt(activeEra, 10) -1 > 10) {
        //     logger.debug('Storing era stats in db...');
        //     await Promise.all(
        //         ranking.map((validator) =>
        //             insertEraValidatorStats(client, validator, activeEra, loggerOptions),
        //         ),
        //     );
        //     // logger.debug(loggerOptions, 'Storing era stats averages in db...');
        //     // await Promise.all(
        //     //     eraIndexes.map((eraIndex) =>
        //     //         insertEraValidatorStatsAvg(client, eraIndex, loggerOptions),
        //     //     ),
        //     // );
        // } else {
        //     logger.debug('Updating era averages is not needed!');
        // }
  
        
        logger.info(`Crawler end`);
    } catch (error) {
        logger.error(`Crawler error: ${error}`);
    }
}

crawler(false)