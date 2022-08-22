CREATE TABLE IF NOT EXISTS public.log  (  
  block_id BIGINT NOT NULL,
  index INT NOT NULL,
  type TEXT,
  engine TEXT DEFAULT NULL,
  data TEXT DEFAULT NULL,
  timestamp BIGINT NOT NULL,
  PRIMARY KEY ( block_id, index ),
  CONSTRAINT fk_block
    FOREIGN KEY (block_id)
      REFERENCES public.block(id)
      ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS log_block_id ON public.log (block_id);
CREATE INDEX IF NOT EXISTS log_index ON public.log (index);
CREATE INDEX IF NOT EXISTS log_type ON public.log (type);
