-- Create a PostgreSQL sequence for atomic invoice number generation.
-- This replaces the unsafe count()+1 approach.
-- The sequence starts after the last existing invoice number.

CREATE SEQUENCE IF NOT EXISTS sale_invoice_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Set the sequence to start after the last invoice number
DO $$
DECLARE
  max_inv integer;
BEGIN
  SELECT COALESCE(
    MAX(NULLIF(regexp_replace("invoiceNo", '\D', '', 'g'), '')::integer),
    0
  )
  INTO max_inv
  FROM "Sale"
  WHERE "invoiceNo" LIKE 'INV-%';

  PERFORM setval('sale_invoice_seq', GREATEST(max_inv + 1, 1), false);
END $$;
