ALTER TABLE public.categories ADD COLUMN type text NOT NULL DEFAULT 'expense';

-- Ensure all existing categories are set to 'expense'
UPDATE public.categories SET type = 'expense' WHERE type IS NULL OR type = '';