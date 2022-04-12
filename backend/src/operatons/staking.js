const Sentry = require('@sentry/node');

const utils = require('../utils');
const logger = require('../utils/logger');
const { backendConfig } = require('../config');

Sentry.init({
    dsn: backendConfig.sentryDSN,
    tracesSampleRate: 1.0,
});

function isVerifiedIdentity(identity){
    if (identity.judgements.length === 0) {
      return false;
    }
    return identity.judgements
      .filter(([, judgement]) => !judgement.isFeePaid)
      .some(([, judgement]) => judgement.isKnownGood || judgement.isReasonable);
};
  
function getName(identity){
    if (
      identity.displayParent &&
      identity.displayParent !== '' &&
      identity.display &&
      identity.display !== ''
    ) {
      return `${identity.displayParent}/${identity.display}`;
    }
    return identity.display || '';
};

function getClusterName(identity){
    identity.displayParent || '';
}

function subIdentity(identity){
  if (
    identity.displayParent &&
    identity.displayParent !== '' &&
    identity.display &&
    identity.display !== ''
  ) {
    return true;
  }
  return false;
};

function getIdentityRating(name, verifiedIdentity, hasAllFields){
    if (verifiedIdentity && hasAllFields) {
      return 3;
    }
    if (verifiedIdentity && !hasAllFields) {
      return 2;
    }
    if (name !== '') {
      return 1;
    }
    return 0;
};

function parseIdentity(identity){
    const verifiedIdentity = isVerifiedIdentity(identity);
    const hasSubIdentity = subIdentity(identity);
    const name = getName(identity);
    const hasAllFields =
      identity?.display !== undefined &&
      identity?.legal !== undefined &&
      identity?.web !== undefined &&
      identity?.email !== undefined &&
      identity?.twitter !== undefined &&
      identity?.riot !== undefined;
    const identityRating = getIdentityRating(
      name,
      verifiedIdentity,
      hasAllFields,
    );
    return {
      verifiedIdentity,
      hasSubIdentity,
      name,
      identityRating,
    };
};

function getCommissionHistory(accountId, erasPreferences){
    const commissionHistory = [];
    erasPreferences.forEach(({ era, validators }) => {
      if (validators[accountId]) {
        commissionHistory.push({
          era: new BigNumber(era.toString()).toNumber(10),
          commission: (validators[accountId].commission / 10000000).toFixed(2),
        });
      } else {
        commissionHistory.push({
          era: new BigNumber(era.toString()).toNumber(10),
          commission: null,
        });
      }
    });
    return commissionHistory;
};

function getCommissionRating(commission, commissionHistory){
    if (commission !== 100 && commission !== 0) {
      if (commission > 10) {
        return 1;
      }
      if (commission >= 5) {
        if (
          commissionHistory.length > 1 &&
          commissionHistory[0] > commissionHistory[commissionHistory.length - 1]
        ) {
          return 3;
        }
        return 2;
      }
      if (commission < 5) {
        return 3;
      }
    }
    return 0;
};

function getPayoutRating(config, payoutHistory){
    const pendingEras = payoutHistory.filter(
      (era) => era.status === 'pending',
    ).length;
    if (pendingEras <= config.erasPerDay) {
      return 3;
    }
    if (pendingEras <= 3 * config.erasPerDay) {
      return 2;
    }
    if (pendingEras < 7 * config.erasPerDay) {
      return 1;
    }
    return 0;
};

function getClusterInfo(hasSubIdentity, validators, validatorIdentity){
    if (!hasSubIdentity) {
      // string detection
      if (validatorIdentity.display) {
        const stringSize = 6;
        const clusterMembers = validators.filter(
          ({ identity }) =>
            (identity.display || '').substring(0, stringSize) ===
            validatorIdentity.display.substring(0, stringSize),
        ).length;
        const clusterName = validatorIdentity.display
          .replace(/\d{1,2}$/g, '')
          .replace(/-$/g, '')
          .replace(/_$/g, '');
        return {
          clusterName,
          clusterMembers,
        };
      }
      return {
        clusterName: '',
        clusterMembers: 0,
      };
    }
  
    const clusterMembers = validators.filter(
      ({ identity }) =>
        identity.displayParent === validatorIdentity.displayParent,
    ).length;
    const clusterName = getClusterName(validatorIdentity);
    return {
      clusterName,
      clusterMembers,
    };
};
