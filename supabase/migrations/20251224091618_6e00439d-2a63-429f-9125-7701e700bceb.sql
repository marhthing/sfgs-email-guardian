-- Drop existing restrictive insert policy
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

-- Allow authenticated users to insert their own admin role (for first-time setup)
CREATE POLICY "Users can insert their own admin role" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);