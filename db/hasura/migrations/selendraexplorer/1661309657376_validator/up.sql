CREATE TABLE IF NOT EXISTS public.validator (
  block_id BIGINT NOT NULL,
  rank INT NOT NULL,
  active BOOLEAN NOT NULL,
  active_rating INT NOT NULL,
  name TEXT NOT NULL,
  identity TEXT NOT NULL,
  has_sub_identity BOOLEAN NOT NULL,
  sub_accounts_rating INT NOT NULL,
  verified_identity BOOLEAN NOT NULL,
  identity_rating INT NOT NULL,
  stash_address TEXT NOT NULL,
  stash_address_creation_block BIGINT NOT NULL,
  stash_parent_address_creation_block BIGINT NOT NULL,
  address_creation_rating INT NOT NULL,
  controller_address TEXT NOT NULL,
  part_of_cluster BOOLEAN NOT NULL,
  cluster_name TEXT NOT NULL,
  cluster_members INT NOT NULL,
  show_cluster_member BOOLEAN NOT NULL,
  nominators INT NOT NULL,
  nominators_rating INT NOT NULL,
  nominations TEXT NOT NULL,
  commission TEXT NOT NULL,
  commission_history TEXT NOT NULL,
  commission_rating INT NOT NULL,
  active_eras INT NOT NULL,
  era_points_history TEXT NOT NULL,
  era_points_percent TEXT NOT NULL,
  era_points_rating INT NOT NULL,
  performance TEXT NOT NULL,
  performance_history TEXT NOT NULL,
  relative_performance TEXT NOT NULL,
  relative_performance_history TEXT NOT NULL,
  slashed BOOLEAN NOT NULL,
  slash_rating INT NOT NULL,
  slashes TEXT NOT NULL,
  council_backing BOOLEAN NOT NULL,
  active_in_governance BOOLEAN NOT NULL,
  governance_rating INT NOT NULL,
  payout_history TEXT NOT NULL,
  payout_rating INT NOT NULL,
  self_stake NUMERIC(40,0) NOT NULL,
  other_stake NUMERIC(40,0) NOT NULL,
  total_stake NUMERIC(40,0) NOT NULL,
  stake_history TEXT NOT NULL,
  total_rating INT NOT NULL,
  dominated BOOLEAN NOT NULL,
  "timestamp" timestamp with time zone NOT NULL,
  PRIMARY KEY ( block_id, stash_address )
);

CREATE TABLE IF NOT EXISTS public.era_vrc_score (  
  stash_address TEXT NOT NULL,
  era INT NOT NULL,
  vrc_score INT NOT NULL,
  PRIMARY KEY ( stash_address, era )
);

CREATE TABLE IF NOT EXISTS public.era_commission (  
  stash_address TEXT NOT NULL,
  era INT NOT NULL,
  commission FLOAT NOT NULL,
  PRIMARY KEY ( stash_address, era )
);

CREATE TABLE IF NOT EXISTS public.era_commission_avg (  
  era INT NOT NULL,
  commission_avg FLOAT NOT NULL,
  PRIMARY KEY ( era )
);

CREATE TABLE IF NOT EXISTS public.era_self_stake (  
  stash_address TEXT NOT NULL,
  era INT NOT NULL,
  self_stake NUMERIC(40,0) NOT NULL,
  PRIMARY KEY ( stash_address, era )
);

CREATE TABLE IF NOT EXISTS public.era_self_stake_avg (  
  era INT NOT NULL,
  self_stake_avg BIGINT NOT NULL,
  PRIMARY KEY ( era )
);

CREATE TABLE IF NOT EXISTS public.era_relative_performance (  
  stash_address TEXT NOT NULL,
  era INT NOT NULL,
  relative_performance FLOAT NOT NULL,
  PRIMARY KEY ( stash_address, era )
);

CREATE TABLE IF NOT EXISTS public.era_relative_performance_avg (
  era INT NOT NULL,
  relative_performance_avg FLOAT NOT NULL,
  PRIMARY KEY ( era )
);

CREATE TABLE IF NOT EXISTS public.era_points (  
  stash_address TEXT NOT NULL,
  era INT NOT NULL,
  points INT NOT NULL,
  PRIMARY KEY ( stash_address, era )
);

CREATE TABLE IF NOT EXISTS public.era_points_avg (
  era INT NOT NULL,
  points_avg FLOAT NOT NULL,
  PRIMARY KEY ( era )
);