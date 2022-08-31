SET check_function_bodies = false;
CREATE TYPE public.contracttype AS ENUM (
    'ERC20',
    'ERC721',
    'ERC1155',
    'other'
);
CREATE TYPE public.evmeventstatus AS ENUM (
    'Success',
    'Error'
);
CREATE TYPE public.evmeventtype AS ENUM (
    'Verified',
    'Unverified'
);
CREATE TYPE public.extrinsicstatus AS ENUM (
    'success',
    'error',
    'unknown'
);
CREATE TYPE public.extrinsictype AS ENUM (
    'signed',
    'unsigned',
    'inherent'
);
CREATE TYPE public.stakingtype AS ENUM (
    'Reward',
    'Slash'
);
CREATE TYPE public.tokenholdertype AS ENUM (
    'Account',
    'Contract'
);
CREATE TYPE public.transfertype AS ENUM (
    'Native',
    'ERC20',
    'ERC721',
    'ERC1155'
);
CREATE FUNCTION public.account_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chain_info SET count = count + 1 WHERE name = 'accounts';
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chain_info SET count = count - 1 WHERE name = 'accounts';
    RETURN OLD;
  ELSE
    UPDATE chain_info SET count = 0 WHERE name = 'accounts';
    RETURN NULL;
  END IF;
END;$$;
CREATE FUNCTION public.block_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chain_info SET count = count + 1 WHERE name = 'blocks';
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chain_info SET count = count - 1 WHERE name = 'blocks';
    RETURN OLD;
  ELSE
    UPDATE chain_info SET count = 0 WHERE name = 'blocks';
    RETURN NULL;
  END IF;
END;$$;
CREATE FUNCTION public.contract_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chain_info SET count = count + 1 WHERE name = 'contracts';
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chain_info SET count = count - 1 WHERE name = 'contracts';
    RETURN OLD;
  ELSE
    UPDATE chain_info SET count = 0 WHERE name = 'contracts';
    RETURN NULL;
  END IF;
END;$$;
CREATE FUNCTION public.event_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chain_info SET count = count + 1 WHERE name = 'events';
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chain_info SET count = count - 1 WHERE name = 'events';
    RETURN OLD;
  ELSE
    UPDATE chain_info SET count = 0 WHERE name = 'events';
    RETURN NULL;
  END IF;
END;$$;
CREATE FUNCTION public.extrinsic_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chain_info SET count = count + 1 WHERE name = 'extrinsics';
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chain_info SET count = count - 1 WHERE name = 'extrinsics';
    RETURN OLD;
  ELSE
    UPDATE chain_info SET count = 0 WHERE name = 'extrinsics';
    RETURN NULL;
  END IF;
END;$$;
CREATE FUNCTION public.new_verified_contract_found() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	INSERT INTO newly_verified_contract_queue (address) VALUES (NEW.address);
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.transfer_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chain_info SET count = count + 1 WHERE name = 'transfers';
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chain_info SET count = count - 1 WHERE name = 'transfers';
    RETURN OLD;
  ELSE
    UPDATE chain_info SET count = 0 WHERE name = 'transfers';
    RETURN NULL;
  END IF;
END;$$;
CREATE TABLE public.account (
    block_id bigint,
    address character varying(49) NOT NULL,
    evm_address character varying(42),
    identity json,
    active boolean NOT NULL,
    free_balance numeric(80,0) NOT NULL,
    locked_balance numeric(80,0) NOT NULL,
    available_balance numeric(80,0) NOT NULL,
    reserved_balance numeric(80,0) NOT NULL,
    vested_balance numeric(80,0) NOT NULL,
    voting_balance numeric(80,0) NOT NULL,
    nonce bigint NOT NULL,
    evm_nonce bigint NOT NULL,
    "timestamp" timestamp with time zone NOT NULL
);
CREATE TABLE public.block (
    id bigint NOT NULL,
    hash text NOT NULL,
    author text NOT NULL,
    state_root text NOT NULL,
    parent_hash text NOT NULL,
    extrinsic_root text NOT NULL,
    finalized boolean NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    crawler_timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.chain_info (
    name text NOT NULL,
    count numeric(80,0) NOT NULL
);
CREATE TABLE public.contract (
    address character varying(49) NOT NULL,
    extrinsic_id bigint,
    signer character varying NOT NULL,
    bytecode text NOT NULL,
    bytecode_context text NOT NULL,
    bytecode_arguments text NOT NULL,
    public boolean NOT NULL, 
    "timestamp" timestamp with time zone NOT NULL
);
CREATE TABLE public.event (
    id bigint NOT NULL,
    block_id bigint,
    extrinsic_id bigint,
    index bigint NOT NULL,
    phase json NOT NULL,
    section text NOT NULL,
    method text NOT NULL,
    data json NOT NULL,
    "timestamp" timestamp with time zone NOT NULL
);
CREATE TABLE public.evm_event (
    id bigint NOT NULL,
    event_id bigint NOT NULL,
    block_id bigint NOT NULL,
    event_index bigint NOT NULL,
    extrinsic_index bigint NOT NULL,
    contract_address character varying NOT NULL,
    data_raw json NOT NULL,
    data_parsed json NOT NULL,
    method character varying NOT NULL,
    type public.evmeventtype NOT NULL,
    status public.evmeventstatus NOT NULL,
    topic_0 character varying,
    topic_1 character varying,
    topic_2 character varying,
    topic_3 character varying
);
CREATE SEQUENCE event_sequence START 1;
CREATE SEQUENCE public.evm_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.evm_event_id_seq OWNED BY public.evm_event.id;
CREATE TABLE public.extrinsic (
    id bigint NOT NULL,
    block_id bigint,
    index bigint NOT NULL,
    hash text NOT NULL,
    args json NOT NULL,
    docs text NOT NULL,
    method text NOT NULL,
    section text NOT NULL,
    signer character varying NOT NULL,
    status public.extrinsicstatus NOT NULL,
    error_message text,
    type public.extrinsictype NOT NULL,
    signed_data json,
    inherent_data json,
    "timestamp" timestamp with time zone NOT NULL
);
CREATE SEQUENCE extrinsic_sequence START 1;
CREATE TABLE public.newly_verified_contract_queue (
    address character varying(49)
);
CREATE TABLE public.staking (
    id bigint NOT NULL,
    signer character varying,
    event_id bigint,
    type public.stakingtype NOT NULL,
    amount numeric(80,0) NOT NULL,
    "timestamp" timestamp with time zone NOT NULL
);
CREATE SEQUENCE public.staking_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.staking_id_seq OWNED BY public.staking.id;
CREATE TABLE public.token_holder (
    token_address character varying NOT NULL,
    signer character varying,
    evm_address character varying,
    nft_id numeric(80,0),
    type public.tokenholdertype NOT NULL,
    balance numeric(80,0) NOT NULL,
    info jsonb NOT NULL,
    "timestamp" timestamp with time zone NOT NULL
);
CREATE TABLE public.transfer (
    id bigint NOT NULL,
    block_id bigint,
    extrinsic_id bigint,
    to_address character varying,
    from_address character varying,
    token_address character varying,
    to_evm_address character varying,
    from_evm_address character varying,
    type public.transfertype NOT NULL,
    amount numeric(80,0) NOT NULL,
    fee_amount numeric(80,0) NOT NULL,
    denom text,
    nft_id numeric(80,0),
    error_message text,
    success boolean NOT NULL,
    "timestamp" timestamp with time zone NOT NULL
);
CREATE SEQUENCE public.transfer_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.transfer_id_seq OWNED BY public.transfer.id;
CREATE TABLE public.verification_request (
    id bigint NOT NULL,
    address character varying(49),
    name text NOT NULL,
    filename text NOT NULL,
    source json NOT NULL,
    runs integer NOT NULL,
    optimization boolean NOT NULL,
    compiler_version text NOT NULL,
    args json NOT NULL,
    target text NOT NULL,
    success boolean NOT NULL,
    message text,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE SEQUENCE public.verification_request_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.verification_request_id_seq OWNED BY public.verification_request.id;
CREATE TABLE public.verified_contract (
    address character varying(49),
    name text NOT NULL,
    filename text NOT NULL,
    source json NOT NULL,
    optimization boolean NOT NULL,
    compiler_version text NOT NULL,
    compiled_data json NOT NULL,
    args json NOT NULL,
    runs integer NOT NULL,
    target text NOT NULL,
    type public.contracttype DEFAULT 'other'::public.contracttype,
    contract_data json,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE ONLY public.evm_event ALTER COLUMN id SET DEFAULT nextval('public.evm_event_id_seq'::regclass);
ALTER TABLE ONLY public.staking ALTER COLUMN id SET DEFAULT nextval('public.staking_id_seq'::regclass);
ALTER TABLE ONLY public.transfer ALTER COLUMN id SET DEFAULT nextval('public.transfer_id_seq'::regclass);
ALTER TABLE ONLY public.verification_request ALTER COLUMN id SET DEFAULT nextval('public.verification_request_id_seq'::regclass);
ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (address);
ALTER TABLE ONLY public.block
    ADD CONSTRAINT block_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.chain_info
    ADD CONSTRAINT chain_info_pkey PRIMARY KEY (name);
ALTER TABLE ONLY public.contract
    ADD CONSTRAINT contract_pkey PRIMARY KEY (address);
ALTER TABLE ONLY public.event
    ADD CONSTRAINT event_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.evm_event
    ADD CONSTRAINT evm_event_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.extrinsic
    ADD CONSTRAINT extrinsic_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staking
    ADD CONSTRAINT staking_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transfer
    ADD CONSTRAINT transfer_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.verification_request
    ADD CONSTRAINT verification_request_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.verified_contract
    ADD CONSTRAINT verified_contract_address_key UNIQUE (address);
CREATE INDEX account_active ON public.account USING btree (active);
CREATE INDEX account_block_id ON public.account USING btree (block_id);
CREATE INDEX account_evm_address ON public.account USING btree (evm_address);
CREATE INDEX block_finalized_idx ON public.block USING btree (finalized);
CREATE INDEX block_hash_idx ON public.block USING btree (hash);
CREATE INDEX contract_extrinsic_id ON public.contract USING btree (extrinsic_id);
CREATE INDEX contract_signer ON public.contract USING btree (signer);
CREATE INDEX event_block_id ON public.event USING btree (block_id);
CREATE INDEX event_method ON public.event USING btree (method);
CREATE INDEX event_section ON public.event USING btree (section);
CREATE INDEX evm_event_block_id ON public.evm_event USING btree (block_id);
CREATE INDEX evm_event_contract_address ON public.evm_event USING btree (contract_address);
CREATE INDEX evm_event_event_id ON public.evm_event USING btree (event_id);
CREATE INDEX evm_event_method ON public.evm_event USING btree (method);
CREATE INDEX evm_event_status ON public.evm_event USING btree (status);
CREATE INDEX evm_event_topic_0 ON public.evm_event USING btree (topic_0);
CREATE INDEX evm_event_topic_1 ON public.evm_event USING btree (topic_1);
CREATE INDEX evm_event_topic_2 ON public.evm_event USING btree (topic_2);
CREATE INDEX evm_event_topic_3 ON public.evm_event USING btree (topic_3);
CREATE INDEX evm_event_type ON public.evm_event USING btree (type);
CREATE INDEX extrinsic_block_id ON public.extrinsic USING btree (block_id);
CREATE INDEX extrinsic_hash ON public.extrinsic USING btree (hash);
CREATE INDEX extrinsic_method ON public.extrinsic USING btree (method);
CREATE INDEX extrinsic_section ON public.extrinsic USING btree (section);
CREATE INDEX extrinsic_signer ON public.extrinsic USING btree (signer);
CREATE INDEX staking_event_id ON public.staking USING btree (event_id);
CREATE INDEX staking_signer ON public.staking USING btree (signer);
CREATE INDEX staking_type ON public.staking USING btree (type);
CREATE INDEX token_holder_balance ON public.token_holder USING btree (balance);
CREATE INDEX token_holder_evm_address ON public.token_holder USING btree (evm_address);
CREATE INDEX token_holder_signer ON public.token_holder USING btree (signer);
CREATE INDEX token_holder_token_address ON public.token_holder USING btree (token_address);
CREATE INDEX transfer_amount ON public.transfer USING btree (amount);
CREATE INDEX transfer_block_id ON public.transfer USING btree (block_id);
CREATE INDEX transfer_denom ON public.transfer USING btree (denom);
CREATE INDEX transfer_extrinsic_id ON public.transfer USING btree (extrinsic_id);
CREATE INDEX transfer_fee_amount ON public.transfer USING btree (fee_amount);
CREATE INDEX transfer_from_address ON public.transfer USING btree (from_address);
CREATE INDEX transfer_from_evm_address ON public.transfer USING btree (from_evm_address);
CREATE INDEX transfer_nft_id ON public.transfer USING btree (nft_id);
CREATE INDEX transfer_success ON public.transfer USING btree (success);
CREATE INDEX transfer_to_address ON public.transfer USING btree (to_address);
CREATE INDEX transfer_to_evm_address ON public.transfer USING btree (to_evm_address);
CREATE INDEX transfer_token_address ON public.transfer USING btree (token_address);
CREATE INDEX transfer_type ON public.transfer USING btree (type);
CREATE UNIQUE INDEX unique_account_nft_holder ON public.token_holder USING btree (token_address, signer, nft_id) WHERE ((evm_address IS NULL) AND (nft_id IS NOT NULL));
CREATE UNIQUE INDEX unique_account_token_holder ON public.token_holder USING btree (token_address, signer) WHERE ((evm_address IS NULL) AND (nft_id IS NULL));
CREATE UNIQUE INDEX unique_contract_nft_holder ON public.token_holder USING btree (token_address, evm_address, nft_id) WHERE ((signer IS NULL) AND (nft_id IS NOT NULL));
CREATE UNIQUE INDEX unique_contract_token_holder ON public.token_holder USING btree (token_address, evm_address) WHERE ((signer IS NULL) AND (nft_id IS NULL));
CREATE INDEX verification_request_address ON public.verification_request USING btree (address);
CREATE INDEX verification_request_filename ON public.verification_request USING btree (filename);
CREATE INDEX verification_request_name ON public.verification_request USING btree (name);
CREATE INDEX verification_request_success ON public.verification_request USING btree (success);
CREATE INDEX verified_contract_address ON public.verified_contract USING btree (address);
CREATE INDEX verified_contract_filename ON public.verified_contract USING btree (filename);
CREATE INDEX verified_contract_name ON public.verified_contract USING btree (name);
CREATE INDEX verified_contract_type ON public.verified_contract USING btree (type);
CREATE CONSTRAINT TRIGGER account_count_mod AFTER INSERT OR DELETE ON public.account DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.account_count();
CREATE TRIGGER account_count_trunc AFTER TRUNCATE ON public.account FOR EACH STATEMENT EXECUTE FUNCTION public.account_count();
CREATE CONSTRAINT TRIGGER block_count_mod AFTER INSERT OR DELETE ON public.block DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.block_count();
CREATE TRIGGER block_count_trunc AFTER TRUNCATE ON public.block FOR EACH STATEMENT EXECUTE FUNCTION public.block_count();
CREATE CONSTRAINT TRIGGER contract_count_mod AFTER INSERT OR DELETE ON public.contract DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.contract_count();
CREATE TRIGGER contract_count_trunc AFTER TRUNCATE ON public.contract FOR EACH STATEMENT EXECUTE FUNCTION public.contract_count();
CREATE CONSTRAINT TRIGGER event_count_mod AFTER INSERT OR DELETE ON public.event DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.event_count();
CREATE TRIGGER event_count_trunc AFTER TRUNCATE ON public.event FOR EACH STATEMENT EXECUTE FUNCTION public.event_count();
CREATE CONSTRAINT TRIGGER extrinsic_count_mod AFTER INSERT OR DELETE ON public.extrinsic DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.extrinsic_count();
CREATE TRIGGER extrinsic_count_trunc AFTER TRUNCATE ON public.extrinsic FOR EACH STATEMENT EXECUTE FUNCTION public.extrinsic_count();
CREATE CONSTRAINT TRIGGER transfer_count_mod AFTER INSERT OR DELETE ON public.transfer DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.transfer_count();
CREATE TRIGGER transfer_count_trunc AFTER TRUNCATE ON public.transfer FOR EACH STATEMENT EXECUTE FUNCTION public.transfer_count();
CREATE TRIGGER verified_contract_found AFTER INSERT ON public.verified_contract FOR EACH ROW EXECUTE FUNCTION public.new_verified_contract_found();
ALTER TABLE ONLY public.verified_contract
    ADD CONSTRAINT fk_address FOREIGN KEY (address) REFERENCES public.contract(address) ON DELETE CASCADE;
ALTER TABLE ONLY public.account
    ADD CONSTRAINT fk_block FOREIGN KEY (block_id) REFERENCES public.block(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.extrinsic
    ADD CONSTRAINT fk_block FOREIGN KEY (block_id) REFERENCES public.block(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.event
    ADD CONSTRAINT fk_block FOREIGN KEY (block_id) REFERENCES public.block(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.evm_event
    ADD CONSTRAINT fk_block FOREIGN KEY (block_id) REFERENCES public.block(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.transfer
    ADD CONSTRAINT fk_block FOREIGN KEY (block_id) REFERENCES public.block(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.evm_event
    ADD CONSTRAINT fk_event FOREIGN KEY (event_id) REFERENCES public.event(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.staking
    ADD CONSTRAINT fk_event FOREIGN KEY (event_id) REFERENCES public.event(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.event
    ADD CONSTRAINT fk_extrinsic FOREIGN KEY (extrinsic_id) REFERENCES public.extrinsic(id);
ALTER TABLE ONLY public.contract
    ADD CONSTRAINT fk_extrinsic FOREIGN KEY (extrinsic_id) REFERENCES public.extrinsic(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.transfer
    ADD CONSTRAINT fk_extrinsic FOREIGN KEY (extrinsic_id) REFERENCES public.extrinsic(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.transfer
    ADD CONSTRAINT fk_from_address FOREIGN KEY (from_address) REFERENCES public.account(address) ON DELETE CASCADE;
ALTER TABLE ONLY public.contract
    ADD CONSTRAINT fk_signer FOREIGN KEY (signer) REFERENCES public.account(address) ON DELETE CASCADE;
ALTER TABLE ONLY public.staking
    ADD CONSTRAINT fk_signer FOREIGN KEY (signer) REFERENCES public.account(address) ON DELETE CASCADE;
ALTER TABLE ONLY public.token_holder
    ADD CONSTRAINT fk_signer FOREIGN KEY (signer) REFERENCES public.account(address) ON DELETE CASCADE;
ALTER TABLE ONLY public.transfer
    ADD CONSTRAINT fk_to_address FOREIGN KEY (to_address) REFERENCES public.account(address) ON DELETE CASCADE;
ALTER TABLE ONLY public.transfer
    ADD CONSTRAINT fk_token_address FOREIGN KEY (token_address) REFERENCES public.contract(address) ON DELETE CASCADE;
ALTER TABLE ONLY public.token_holder
    ADD CONSTRAINT fk_verified_contract FOREIGN KEY (token_address) REFERENCES public.contract(address) ON DELETE CASCADE;
ALTER TABLE ONLY public.newly_verified_contract_queue
    ADD CONSTRAINT fk_verified_contract FOREIGN KEY (address) REFERENCES public.contract(address);

INSERT INTO block
  (id, hash, author, state_root, parent_hash, extrinsic_root, finalized, timestamp)
VALUES
  (-1, '', '', '', '', '', TRUE, '2022-08-01 00:00:00');

INSERT INTO extrinsic
  (id, block_id, index, hash, args, docs, method, section, signer, status, type, timestamp)
VALUES
  (-1, -1, 0, '', '[]', '', '', '', '0x', 'success', 'unsigned', '2022-08-01 00:00:00');

-- Inserting chain account
INSERT INTO account 
  (block_id, evm_address, address, active, available_balance, free_balance, locked_balance, reserved_balance, vested_balance, voting_balance, nonce, evm_nonce, timestamp)
VALUES
  (-1, '0x', '0x', true, 0, 0, 0, 0, 0, 0, 0, 0, '2022-08-01 00:00:00'),
  (-1, 'deleted', 'deleted', true, 0, 0, 0, 0, 0, 0, 0, 0, '2022-08-01 00:00:00');

INSERT INTO chain_info (name, count) VALUES
  ('blocks', 0),
  ('events', 0),
  ('accounts', 0),
  ('contracts', 0),
  ('transfers', 0),
  ('extrinsics', 0),
  ('logs', 0),
  ('active_validator_count', 0),
  ('waiting_validator_count', 0),
  ('nominator_count', 0),
  ('current_era', 0),
  ('active_era', 0),
  ('totalIssuance', 0),
  ('minimum_stake', 0);

-- Genisis contract insert
INSERT INTO contract
  (address, extrinsic_id, signer, bytecode, bytecode_context, bytecode_arguments, public, timestamp)
VALUES
-- SEL
  (
    '0x0000000000000000000100000000000000000000', -- address
    -1, 
    '0x',
    '0x608060405234801561001057600080fd5b50611012806100206000396000f3fe608060405234801561001057600080fd5b50600436106100c95760003560e01c80633950935111610081578063a457c2d71161005b578063a457c2d714610180578063a9059cbb14610193578063dd62ed3e146101a657600080fd5b8063395093511461015257806370a082311461016557806395d89b411461017857600080fd5b806318160ddd116100b257806318160ddd1461010f57806323b872dd14610125578063313ce5671461013857600080fd5b806306fdde03146100ce578063095ea7b3146100ec575b600080fd5b6100d66101ea565b6040516100e39190610ef3565b60405180910390f35b6100ff6100fa366004610dae565b6101f9565b60405190151581526020016100e3565b610117610211565b6040519081526020016100e3565b6100ff610133366004610d73565b61021b565b61014061023f565b60405160ff90911681526020016100e3565b6100ff610160366004610dae565b610249565b610117610173366004610d20565b610293565b6100d66102a4565b6100ff61018e366004610dae565b6102ae565b6100ff6101a1366004610dae565b610382565b6101176101b4366004610d41565b73ffffffffffffffffffffffffffffffffffffffff91821660009081526020818152604080832093909416825291909152205490565b60606101f4610390565b905090565b60003361020781858561046e565b5060019392505050565b60006101f4610620565b6000336102298582856106f6565b6102348585856107cb565b506001949350505050565b60006101f461097b565b3360008181526020818152604080832073ffffffffffffffffffffffffffffffffffffffff87168452909152812054909190610207908290869061028e908790610f44565b61046e565b600061029e82610a51565b92915050565b60606101f4610b70565b3360008181526020818152604080832073ffffffffffffffffffffffffffffffffffffffff8716845290915281205490919083811015610375576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602560248201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f7760448201527f207a65726f00000000000000000000000000000000000000000000000000000060648201526084015b60405180910390fd5b610234828686840361046e565b6000336102078185856107cb565b60408051600481526024810182526020810180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167f06fdde030000000000000000000000000000000000000000000000000000000017905290516060916000918291610400916103fe9190610ed7565b600060405180830381855afa9150503d8060008114610439576040519150601f19603f3d011682016040523d82523d6000602084013e61043e565b606091505b50915091506000821415610453573d60208201fd5b808060200190518101906104679190610dd7565b9250505090565b73ffffffffffffffffffffffffffffffffffffffff8316610510576040517f08c379a0000000000000000000000000000000000000000000000000000000008152602060048201526024808201527f45524332303a20617070726f76652066726f6d20746865207a65726f2061646460448201527f7265737300000000000000000000000000000000000000000000000000000000606482015260840161036c565b73ffffffffffffffffffffffffffffffffffffffff82166105b3576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602260248201527f45524332303a20617070726f766520746f20746865207a65726f20616464726560448201527f7373000000000000000000000000000000000000000000000000000000000000606482015260840161036c565b73ffffffffffffffffffffffffffffffffffffffff8381166000818152602081815260408083209487168084529482529182902085905590518481527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92591015b60405180910390a3505050565b60408051600481526024810182526020810180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167f18160ddd000000000000000000000000000000000000000000000000000000001790529051600091829182916104009161068d9190610ed7565b600060405180830381855afa9150503d80600081146106c8576040519150601f19603f3d011682016040523d82523d6000602084013e6106cd565b606091505b509150915060008214156106e2573d60208201fd5b808060200190518101906104679190610e9e565b73ffffffffffffffffffffffffffffffffffffffff838116600090815260208181526040808320938616835292905220547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff81146107c557818110156107b8576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601d60248201527f45524332303a20696e73756666696369656e7420616c6c6f77616e6365000000604482015260640161036c565b6107c5848484840361046e565b50505050565b73ffffffffffffffffffffffffffffffffffffffff831661086e576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602560248201527f45524332303a207472616e736665722066726f6d20746865207a65726f20616460448201527f6472657373000000000000000000000000000000000000000000000000000000606482015260840161036c565b73ffffffffffffffffffffffffffffffffffffffff8216610911576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602360248201527f45524332303a207472616e7366657220746f20746865207a65726f206164647260448201527f6573730000000000000000000000000000000000000000000000000000000000606482015260840161036c565b61091c838383610bde565b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8360405161061391815260200190565b60408051600481526024810182526020810180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167f313ce56700000000000000000000000000000000000000000000000000000000179052905160009182918291610400916109e89190610ed7565b600060405180830381855afa9150503d8060008114610a23576040519150601f19603f3d011682016040523d82523d6000602084013e610a28565b606091505b50915091506000821415610a3d573d60208201fd5b808060200190518101906104679190610eb6565b60405173ffffffffffffffffffffffffffffffffffffffff821660248201526000908190819061040090604401604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08184030181529181526020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167f70a082310000000000000000000000000000000000000000000000000000000017905251610aff9190610ed7565b600060405180830381855afa9150503d8060008114610b3a576040519150601f19603f3d011682016040523d82523d6000602084013e610b3f565b606091505b50915091506000821415610b54573d60208201fd5b80806020019051810190610b689190610e9e565b949350505050565b60408051600481526024810182526020810180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167f95d89b410000000000000000000000000000000000000000000000000000000017905290516060916000918291610400916103fe9190610ed7565b60405173ffffffffffffffffffffffffffffffffffffffff84811660248301528316604482015260648101829052600090819061040090608401604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08184030181529181526020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167fbeabacc80000000000000000000000000000000000000000000000000000000017905251610c999190610ed7565b6000604051808303816000865af19150503d8060008114610cd6576040519150601f19603f3d011682016040523d82523d6000602084013e610cdb565b606091505b50915091506000821415610cf0573d60208201fd5b5050505050565b803573ffffffffffffffffffffffffffffffffffffffff81168114610d1b57600080fd5b919050565b600060208284031215610d31578081fd5b610d3a82610cf7565b9392505050565b60008060408385031215610d53578081fd5b610d5c83610cf7565b9150610d6a60208401610cf7565b90509250929050565b600080600060608486031215610d87578081fd5b610d9084610cf7565b9250610d9e60208501610cf7565b9150604084013590509250925092565b60008060408385031215610dc0578182fd5b610dc983610cf7565b946020939093013593505050565b600060208284031215610de8578081fd5b815167ffffffffffffffff80821115610dff578283fd5b818401915084601f830112610e12578283fd5b815181811115610e2457610e24610fad565b604051601f82017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0908116603f01168101908382118183101715610e6a57610e6a610fad565b81604052828152876020848701011115610e82578586fd5b610e93836020830160208801610f81565b979650505050505050565b600060208284031215610eaf578081fd5b5051919050565b600060208284031215610ec7578081fd5b815160ff81168114610d3a578182fd5b60008251610ee9818460208701610f81565b9190910192915050565b6020815260008251806020840152610f12816040850160208701610f81565b601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0169190910160400192915050565b60008219821115610f7c577f4e487b710000000000000000000000000000000000000000000000000000000081526011600452602481fd5b500190565b60005b83811015610f9c578181015183820152602001610f84565b838111156107c55750506000910152565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fdfea2646970667358221220fca6efa8cc2443c8dbbbb0216352e2739fd6f5891111a53e6ffcc7f526ee44db64736f6c63430008040033',
    '',
    'a2646970667358221220ca5c764db385f7a72f31e6e1a0ed4e18a4de5062832e0e616ba8b7d30cc6398964736f6c63430006000033',
    true,
    '2022-08-01 00:00:00'
  );

INSERT INTO verified_contract 
  (address, name, filename, source, runs, optimization, compiler_version, compiled_data, args, target, type, contract_data)
VALUES
-- SEL
  (
    '0x0000000000000000000100000000000000000000',
    'SELSRC20',
    'contracts/tmp/SELSRC20.sol',
    '{"contracts/tmp/SELSRC20.sol":"// SPDX-License-Identifier: Apache-2.0\n\n// Based on ERC20 implementation of @openzeppelin/contracts (v2.5.0 and v3.1.0):\n// https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v2.5.0/contracts/token/ERC20/ERC20.sol\n// https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v3.1.0/contracts/token/ERC20/ERC20.sol\n\npragma solidity ^0.6.0;\n\nimport \"@openzeppelin/contracts/math/SafeMath.sol\";\nimport \"@openzeppelin/contracts/token/ERC20/IERC20.sol\";\n\nimport \"../token/IMultiCurrency.sol\";\nimport \"../token/MultiCurrency.sol\";\n\ncontract SELSRC20 is IERC20, IMultiCurrency {\n    using SafeMath for uint256;\n\n    mapping (address => mapping (address => uint256)) private _allowances;\n\n    uint256 private constant _currencyId = 0x0;\n\n    string private constant _name = \"Selendra\";\n    string private constant _symbol = \"SEL\";\n    uint8 private constant _decimals = 18;\n\n    /**\n     * @dev Returns the currencyId of the token.\n     */\n    function currencyId() public view override returns (uint256) {\n        return _currencyId;\n    }\n\n    /**\n     * @dev Returns the name of the token.\n     */\n    function name() public view returns (string memory) {\n        return _name;\n    }\n\n    /**\n     * @dev Returns the symbol of the token, usually a shorter version of the\n     * name.\n     */\n    function symbol() public view returns (string memory) {\n        return _symbol;\n    }\n\n    /**\n     * @dev Returns the number of decimals used to get its user representation.\n     */\n    function decimals() public view returns (uint8) {\n        return _decimals;\n    }\n\n    /**\n     * @dev See {IERC20-totalSupply}.\n     */\n    function totalSupply() public view override returns (uint256) {\n        return MultiCurrency.totalSupply (_currencyId);\n    }\n\n    /**\n     * @dev See {IERC20-balanceOf}.\n     */\n    function balanceOf(address account) public view override returns (uint256) {\n        return MultiCurrency.balanceOf (_currencyId, account);\n    }\n\n    /**\n     * @dev See {IERC20-transfer}.\n     *\n     * Requirements:\n     *\n     * - `recipient` cannot be the zero address.\n     * - the caller must have a balance of at least `amount`.\n     */\n    function transfer(address recipient, uint256 amount) public override returns (bool) {\n        _transfer(msg.sender, recipient, amount);\n        return true;\n    }\n\n    /**\n     * @dev See {IERC20-allowance}.\n     */\n    function allowance(address owner, address spender) public view override returns (uint256) {\n        return _allowances[owner][spender];\n    }\n\n    /**\n     * @dev See {IERC20-approve}.\n     *\n     * Requirements:\n     *\n     * - `spender` cannot be the zero address.\n     */\n    function approve(address spender, uint256 amount) public override returns (bool) {\n        _approve(msg.sender, spender, amount);\n        return true;\n    }\n\n    /**\n     * @dev See {IERC20-transferFrom}.\n     *\n     * Emits an {Approval} event indicating the updated allowance. This is not\n     * required by the EIP. See the note at the beginning of {ERC20};\n     *\n     * Requirements:\n     * - `sender` and `recipient` cannot be the zero address.\n     * - `sender` must have a balance of at least `amount`.\n     * - the caller must have allowance for `sender`\"s tokens of at least\n     * `amount`.\n     */\n    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {\n        _transfer(sender, recipient, amount);\n        _approve(sender, msg.sender, _allowances[sender][msg.sender].sub(amount, \"ERC20: transfer amount exceeds allowance\"));\n        return true;\n    }\n\n    /**\n     * @dev Atomically increases the allowance granted to `spender` by the caller.\n     *\n     * This is an alternative to {approve} that can be used as a mitigation for\n     * problems described in {IERC20-approve}.\n     *\n     * Emits an {Approval} event indicating the updated allowance.\n     *\n     * Requirements:\n     *\n     * - `spender` cannot be the zero address.\n     */\n    function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {\n        _approve(msg.sender, spender, _allowances[msg.sender][spender].add(addedValue));\n        return true;\n    }\n\n    /**\n     * @dev Atomically decreases the allowance granted to `spender` by the caller.\n     *\n     * This is an alternative to {approve} that can be used as a mitigation for\n     * problems described in {IERC20-approve}.\n     *\n     * Emits an {Approval} event indicating the updated allowance.\n     *\n     * Requirements:\n     *\n     * - `spender` cannot be the zero address.\n     * - `spender` must have allowance for the caller of at least\n     * `subtractedValue`.\n     */\n    function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {\n        _approve(msg.sender, spender, _allowances[msg.sender][spender].sub(subtractedValue, \"ERC20: decreased allowance below zero\"));\n        return true;\n    }\n\n    /**\n     * @dev Moves tokens `amount` from `sender` to `recipient`.\n     *\n     * This is internal function is equivalent to {transfer}, and can be used to\n     * e.g. implement automatic token fees, slashing mechanisms, etc.\n     *\n     * Emits a {Transfer} event.\n     *\n     * Requirements:\n     *\n     * - `sender` cannot be the zero address.\n     * - `recipient` cannot be the zero address.\n     * - `sender` must have a balance of at least `amount`.\n     */\n    function _transfer(address sender, address recipient, uint256 amount) internal {\n        require(sender != address(0), \"ERC20: transfer from the zero address\");\n        require(recipient != address(0), \"ERC20: transfer to the zero address\");\n\n        MultiCurrency.transfer(_currencyId, sender, recipient, amount);\n\n        emit Transfer(sender, recipient, amount);\n    }\n\n    /**\n     * @dev Sets `amount` as the allowance of `spender` over the `owner`s tokens.\n     *\n     * This is internal function is equivalent to `approve`, and can be used to\n     * e.g. set automatic allowances for certain subsystems, etc.\n     *\n     * Emits an {Approval} event.\n     *\n     * Requirements:\n     *\n     * - `owner` cannot be the zero address.\n     * - `spender` cannot be the zero address.\n     */\n    function _approve(address owner, address spender, uint256 amount) internal {\n        require(owner != address(0), \"ERC20: approve from the zero address\");\n        require(spender != address(0), \"ERC20: approve to the zero address\");\n\n        _allowances[owner][spender] = amount;\n        emit Approval(owner, spender, amount);\n    }\n}\n","contracts/token/MultiCurrency.sol":"// SPDX-License-Identifier: Apache-2.0\npragma solidity ^0.6.0;\n\nlibrary MultiCurrency {\n    function totalSupply(uint256 currencyId) internal view returns (uint256) {\n        uint256[2] memory input;\n\n        input[0] = 0;\n        input[1] = currencyId;\n\n        uint256[1] memory output;\n\n        assembly {\n            if iszero(\n                staticcall(gas(), 0x0000000000000000400, input, 0x40, output, 0x20)\n            ) {\n                revert(0, 0)\n            }\n        }\n\n        return output[0];\n    }\n\n    function balanceOf(uint256 currencyId, address account) internal view returns (uint256) {\n        uint256[3] memory input;\n\n        input[0] = 1;\n        input[1] = currencyId;\n        input[2] = uint256(account);\n\n        uint256[1] memory output;\n\n        assembly {\n            if iszero(\n                staticcall(gas(), 0x0000000000000000400, input, 0x60, output, 0x20)\n            ) {\n                revert(0, 0)\n            }\n        }\n\n        return output[0];\n    }\n\n    function transfer(uint256 currencyId, address sender, address recipient, uint256 amount) internal view {\n        uint256[5] memory input;\n\n        input[0] = 2;\n        input[1] = currencyId;\n        input[2] = uint256(sender);\n        input[3] = uint256(recipient);\n        input[4] = amount;\n\n        assembly {\n            if iszero(\n                staticcall(gas(), 0x0000000000000000400, input, 0xA0, 0x00, 0x00)\n            ) {\n                revert(0, 0)\n            }\n        }\n    }\n}\n","contracts/token/IMultiCurrency.sol":"// SPDX-License-Identifier: Apache-2.0\npragma solidity ^0.6.0;\n\ninterface IMultiCurrency {\n    function currencyId() external view returns (uint256);\n}\n","@openzeppelin/contracts/math/SafeMath.sol":"pragma solidity ^0.6.0;\n\n/**\n * @dev Wrappers over Solidity\"s arithmetic operations with added overflow\n * checks.\n *\n * Arithmetic operations in Solidity wrap on overflow. This can easily result\n * in bugs, because programmers usually assume that an overflow raises an\n * error, which is the standard behavior in high level programming languages.\n * `SafeMath` restores this intuition by reverting the transaction when an\n * operation overflows.\n *\n * Using this library instead of the unchecked operations eliminates an entire\n * class of bugs, so it\"s recommended to use it always.\n */\nlibrary SafeMath {\n    /**\n     * @dev Returns the addition of two unsigned integers, reverting on\n     * overflow.\n     *\n     * Counterpart to Solidity\"s `+` operator.\n     *\n     * Requirements:\n     * - Addition cannot overflow.\n     */\n    function add(uint256 a, uint256 b) internal pure returns (uint256) {\n        uint256 c = a + b;\n        require(c >= a, \"SafeMath: addition overflow\");\n\n        return c;\n    }\n\n    /**\n     * @dev Returns the subtraction of two unsigned integers, reverting on\n     * overflow (when the result is negative).\n     *\n     * Counterpart to Solidity\"s `-` operator.\n     *\n     * Requirements:\n     * - Subtraction cannot overflow.\n     */\n    function sub(uint256 a, uint256 b) internal pure returns (uint256) {\n        return sub(a, b, \"SafeMath: subtraction overflow\");\n    }\n\n    /**\n     * @dev Returns the subtraction of two unsigned integers, reverting with custom message on\n     * overflow (when the result is negative).\n     *\n     * Counterpart to Solidity\"s `-` operator.\n     *\n     * Requirements:\n     * - Subtraction cannot overflow.\n     */\n    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {\n        require(b <= a, errorMessage);\n        uint256 c = a - b;\n\n        return c;\n    }\n\n    /**\n     * @dev Returns the multiplication of two unsigned integers, reverting on\n     * overflow.\n     *\n     * Counterpart to Solidity\"s `*` operator.\n     *\n     * Requirements:\n     * - Multiplication cannot overflow.\n     */\n    function mul(uint256 a, uint256 b) internal pure returns (uint256) {\n        // Gas optimization: this is cheaper than requiring \"a\" not being zero, but the\n        // benefit is lost if \"b\" is also tested.\n        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522\n        if (a == 0) {\n            return 0;\n        }\n\n        uint256 c = a * b;\n        require(c / a == b, \"SafeMath: multiplication overflow\");\n\n        return c;\n    }\n\n    /**\n     * @dev Returns the integer division of two unsigned integers. Reverts on\n     * division by zero. The result is rounded towards zero.\n     *\n     * Counterpart to Solidity\"s `/` operator. Note: this function uses a\n     * `revert` opcode (which leaves remaining gas untouched) while Solidity\n     * uses an invalid opcode to revert (consuming all remaining gas).\n     *\n     * Requirements:\n     * - The divisor cannot be zero.\n     */\n    function div(uint256 a, uint256 b) internal pure returns (uint256) {\n        return div(a, b, \"SafeMath: division by zero\");\n    }\n\n    /**\n     * @dev Returns the integer division of two unsigned integers. Reverts with custom message on\n     * division by zero. The result is rounded towards zero.\n     *\n     * Counterpart to Solidity\"s `/` operator. Note: this function uses a\n     * `revert` opcode (which leaves remaining gas untouched) while Solidity\n     * uses an invalid opcode to revert (consuming all remaining gas).\n     *\n     * Requirements:\n     * - The divisor cannot be zero.\n     */\n    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {\n        // Solidity only automatically asserts when dividing by 0\n        require(b > 0, errorMessage);\n        uint256 c = a / b;\n        // assert(a == b * c + a % b); // There is no case in which this doesn\"t hold\n\n        return c;\n    }\n\n    /**\n     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),\n     * Reverts when dividing by zero.\n     *\n     * Counterpart to Solidity\"s `%` operator. This function uses a `revert`\n     * opcode (which leaves remaining gas untouched) while Solidity uses an\n     * invalid opcode to revert (consuming all remaining gas).\n     *\n     * Requirements:\n     * - The divisor cannot be zero.\n     */\n    function mod(uint256 a, uint256 b) internal pure returns (uint256) {\n        return mod(a, b, \"SafeMath: modulo by zero\");\n    }\n\n    /**\n     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),\n     * Reverts with custom message when dividing by zero.\n     *\n     * Counterpart to Solidity\"s `%` operator. This function uses a `revert`\n     * opcode (which leaves remaining gas untouched) while Solidity uses an\n     * invalid opcode to revert (consuming all remaining gas).\n     *\n     * Requirements:\n     * - The divisor cannot be zero.\n     */\n    function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {\n        require(b != 0, errorMessage);\n        return a % b;\n    }\n}\n","@openzeppelin/contracts/token/ERC20/IERC20.sol":"pragma solidity ^0.6.0;\n\n/**\n * @dev Interface of the ERC20 standard as defined in the EIP.\n */\ninterface IERC20 {\n    /**\n     * @dev Returns the amount of tokens in existence.\n     */\n    function totalSupply() external view returns (uint256);\n\n    /**\n     * @dev Returns the amount of tokens owned by `account`.\n     */\n    function balanceOf(address account) external view returns (uint256);\n\n    /**\n     * @dev Moves `amount` tokens from the caller\"s account to `recipient`.\n     *\n     * Returns a boolean value indicating whether the operation succeeded.\n     *\n     * Emits a {Transfer} event.\n     */\n    function transfer(address recipient, uint256 amount) external returns (bool);\n\n    /**\n     * @dev Returns the remaining number of tokens that `spender` will be\n     * allowed to spend on behalf of `owner` through {transferFrom}. This is\n     * zero by default.\n     *\n     * This value changes when {approve} or {transferFrom} are called.\n     */\n    function allowance(address owner, address spender) external view returns (uint256);\n\n    /**\n     * @dev Sets `amount` as the allowance of `spender` over the caller\"s tokens.\n     *\n     * Returns a boolean value indicating whether the operation succeeded.\n     *\n     * IMPORTANT: Beware that changing an allowance with this method brings the risk\n     * that someone may use both the old and the new allowance by unfortunate\n     * transaction ordering. One possible solution to mitigate this race\n     * condition is to first reduce the spender\"s allowance to 0 and set the\n     * desired value afterwards:\n     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729\n     *\n     * Emits an {Approval} event.\n     */\n    function approve(address spender, uint256 amount) external returns (bool);\n\n    /**\n     * @dev Moves `amount` tokens from `sender` to `recipient` using the\n     * allowance mechanism. `amount` is then deducted from the caller\"s\n     * allowance.\n     *\n     * Returns a boolean value indicating whether the operation succeeded.\n     *\n     * Emits a {Transfer} event.\n     */\n    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);\n\n    /**\n     * @dev Emitted when `value` tokens are moved from one account (`from`) to\n     * another (`to`).\n     *\n     * Note that `value` may be zero.\n     */\n    event Transfer(address indexed from, address indexed to, uint256 value);\n\n    /**\n     * @dev Emitted when the allowance of a `spender` for an `owner` is set by\n     * a call to {approve}. `value` is the new allowance.\n     */\n    event Approval(address indexed owner, address indexed spender, uint256 value);\n}\n"}',
    200,
    true,
    'v0.6.0+commit.26b70077',
    '{"SELSRC20":[{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[],"name":"currencyId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}],"MultiCurrency":[],"IMultiCurrency":[{"inputs":[],"name":"currencyId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}],"SafeMath":[],"IERC20":[{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}]}',
    '[]',
    '',
    'ERC20',
    '{"name": "Selendra", "symbol": "SEL", "decimals": 18}'
  );
