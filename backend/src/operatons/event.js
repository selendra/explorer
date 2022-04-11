const Sentry = require('@sentry/node');

const utils = require('../utils');
const logger = require('../utils/logger');
const constants = require('../config');
const { process_staking_reward, process_staking_slash } = require('./stakinfg_event');

Sentry.init({
    dsn: constants.SENTRY,
    tracesSampleRate: 1.0,
});

// events chunk size
const chunkSize = 20;

async function processEvent(
    blockNumber,
    activeEra,
    indexedEvent,
    IndexedBlockEvents,
    IndexedBlockExtrinsics,
    timestamp,
){
    const [eventIndex, { event, phase }] = indexedEvent;
    const doc = JSON.stringify(event.meta.docs.toJSON());
    const types = JSON.stringify(event.typeDef);

    let data = {
        blockNumber: blockNumber,
        eventIndex,
        section: event.section,
        method: event.method,
        phase: phase.toString(),
        types,
        doc,
        data: JSON.stringify(event.data),
        timestamp,
    };

    try {
        let eventCol = await utils.db.getEventCollection();
        await eventCol.insertOne(data);
        logger.debug(
          `Added event #${blockNumber}-${eventIndex} ${event.section} ➡ ${event.method}`,
        );
      } catch (error) {
        logger.error(
          `Error adding event #${blockNumber}-${eventIndex}: ${error}`,
        );
        scope.setTag('events', blockNumber);
        Sentry.captureException(error);
    }

    await Promise.all([
      process_staking_reward(
        event,
        eventIndex,
        phase,
        blockNumber,
        IndexedBlockEvents,
        IndexedBlockExtrinsics,
        timestamp
      ),

      process_staking_slash(
        event,
        eventIndex,
        activeEra,
        blockNumber,
        IndexedBlockEvents,
        timestamp,
      )
    ])
}

async function processEvents(
    blockNumber,
    activeEra,
    blockEvents,
    blockExtrinsics,
    timestamp,
  ){
    const startTime = new Date().getTime();
    const IndexedBlockEvents = blockEvents.map(
      (event, index) => [index, event],
    );
    const IndexedBlockExtrinsics = blockExtrinsics.map(
      (extrinsic, index) => [index, extrinsic],
    );
    const chunks = utils.chunker(IndexedBlockEvents, chunkSize);
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map((indexedEvent) =>
          processEvent(
            blockNumber,
            activeEra,
            indexedEvent,
            IndexedBlockEvents,
            IndexedBlockExtrinsics,
            timestamp,
          ),
        ),
      );
    }
    // Log execution time
    const endTime = new Date().getTime();
    logger.info(
      `Added ${blockEvents.length} events in ${((endTime - startTime) / 1000).toFixed(3)}s`,
    );
};

module.exports = {
    processEvents
}