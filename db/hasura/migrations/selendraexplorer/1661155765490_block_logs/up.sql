CREATE TABLE IF NOT EXISTS public.log  (  
  block_id BIGINT NOT NULL,
  index INT NOT NULL,
  type TEXT,
  engine TEXT DEFAULT NULL,
  data TEXT DEFAULT NULL,
  "timestamp" timestamp with time zone NOT NULL,
  PRIMARY KEY ( block_id, index ),
  CONSTRAINT fk_block
    FOREIGN KEY (block_id)
      REFERENCES public.block(id)
      ON DELETE CASCADE
);

CREATE FUNCTION public.log_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chain_info SET count = count + 1 WHERE name = 'logs';
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chain_info SET count = count - 1 WHERE name = 'logs';
    RETURN OLD;
  ELSE
    UPDATE chain_info SET count = 0 WHERE name = 'logs';
    RETURN NULL;
  END IF;

END;$$;
CREATE CONSTRAINT TRIGGER log_count_mod
  AFTER INSERT OR DELETE ON log
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE PROCEDURE log_count();
-- TRUNCATE triggers must be FOR EACH STATEMENT
CREATE TRIGGER log_count_trunc AFTER TRUNCATE ON log
  FOR EACH STATEMENT EXECUTE PROCEDURE log_count();
-- initialize the counter table
UPDATE chain_info SET count = (SELECT count(*) FROM log) WHERE name = 'logs';
COMMIT;