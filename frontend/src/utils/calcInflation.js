export function calcInflation (totalStaked, totalIssuance) {
  const falloff = 0.05;
  const maxInflation = 0.044;
  const minInflation = 0.025;
  const stakeTarget = 0.75;

  const stakedFraction = totalStaked / totalIssuance ;
  const idealStake = stakeTarget;
  const idealInterest = maxInflation / idealStake;
  const inflation = 100 * (minInflation + (
    stakedFraction <= idealStake
      ? (stakedFraction * (idealInterest - (minInflation / idealStake)))
      : (((idealInterest * idealStake) - minInflation) * Math.pow(2, (idealStake - stakedFraction) / falloff))
  ));

  return {
    idealInterest,
    idealStake,
    inflation,
    stakedFraction,
    stakedReturn: stakedFraction
      ? (inflation / stakedFraction)
      : 0
  };
}
