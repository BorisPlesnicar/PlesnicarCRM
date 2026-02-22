-- Add invoice_type to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'it' 
CHECK (invoice_type IN ('it', 'bau'));

-- Update existing invoices to have default type
UPDATE public.invoices
SET invoice_type = 'it'
WHERE invoice_type IS NULL;
