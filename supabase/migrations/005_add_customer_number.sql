-- Add customer_number to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS customer_number TEXT;

-- Create function to auto-generate customer number
-- Starts at BP2 (since BP1 already exists)
CREATE OR REPLACE FUNCTION generate_customer_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  max_num INTEGER;
BEGIN
  -- Find the highest existing customer number
  SELECT COALESCE(MAX(CAST(SUBSTRING(customer_number FROM 3) AS INTEGER)), 0)
  INTO max_num
  FROM public.clients
  WHERE customer_number ~ '^BP[0-9]+$';
  
  -- Start at 2 if no numbers exist, otherwise use max + 1
  IF max_num = 0 THEN
    next_num := 2;
  ELSE
    next_num := max_num + 1;
  END IF;
  
  RETURN 'BP' || next_num::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign customer number on insert
CREATE OR REPLACE FUNCTION assign_customer_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_number IS NULL OR NEW.customer_number = '' THEN
    NEW.customer_number := generate_customer_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_client_created
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION assign_customer_number();

-- Update existing clients without customer_number
-- Start at BP2 (BP1 already exists)
DO $$
DECLARE
  client_rec RECORD;
  next_num INTEGER;
  max_num INTEGER;
BEGIN
  -- Find the highest existing number
  SELECT COALESCE(MAX(CAST(SUBSTRING(customer_number FROM 3) AS INTEGER)), 0)
  INTO max_num
  FROM public.clients
  WHERE customer_number ~ '^BP[0-9]+$';
  
  -- Start at 2 if no numbers exist, otherwise use max + 1
  IF max_num = 0 THEN
    next_num := 2;
  ELSE
    next_num := max_num + 1;
  END IF;
  
  -- Assign numbers to clients without customer_number
  FOR client_rec IN 
    SELECT id FROM public.clients 
    WHERE customer_number IS NULL OR customer_number = ''
    ORDER BY created_at
  LOOP
    UPDATE public.clients
    SET customer_number = 'BP' || next_num::TEXT
    WHERE id = client_rec.id;
    next_num := next_num + 1;
  END LOOP;
END $$;
