ALTER TABLE public.expenses ADD COLUMN type text NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense'));

UPDATE public.expenses SET type = 'expense' WHERE type = 'expense';