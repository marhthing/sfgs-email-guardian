-- Add admin_password column to system_settings
ALTER TABLE public.system_settings 
ADD COLUMN admin_password text NOT NULL DEFAULT 'sfgsadmin';

-- Update the existing row if any
UPDATE public.system_settings SET admin_password = 'sfgsadmin' WHERE admin_password IS NULL;