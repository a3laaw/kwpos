-- Create a PostgreSQL sequence for atomic invoice number generation.
-- This replaces the count()+1 approach which is unsafe under concurrency.
-- Usage: SELECT nextval('sale_invoice_seq')
-- The sale transaction calls this inside the Prisma $transaction.

-- Start from 1 (first invoice will be INV-00001)
CREATE SEQUENCE IF NOT EXISTS sale_invoice_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;
