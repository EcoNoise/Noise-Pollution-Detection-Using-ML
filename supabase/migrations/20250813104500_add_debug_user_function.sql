-- Add debug function to check if user exists
CREATE OR REPLACE FUNCTION public.check_user_exists(user_email TEXT)
RETURNS TABLE(user_id UUID, email TEXT, email_confirmed_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.email_confirmed_at
    FROM auth.users u
    WHERE u.email = user_email;
END;
$$;

-- Grant execute permission to all roles for testing
GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO postgres;