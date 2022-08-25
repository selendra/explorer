export interface ClusterInfo {
  clusterName: string;
  clusterMembers: number;
}

export interface CommisionHistoryItem {
  era: string;
  commission: string;
}

export interface IdentityInfo {
  verifiedIdentity: boolean;
  hasSubIdentity: boolean;
  name: string;
  identityRating: number;
}
