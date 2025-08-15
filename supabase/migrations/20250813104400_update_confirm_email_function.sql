-- Update function to confirm user email for testing purposes with proper permissions
CREATE OR REPLACE FUNCTION public.confirm_user_email(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update email_confirmed_at for the user (remove the NULL check to allow re-confirmation)
    UPDATE auth.users 
    SET email_confirmed_at = NOW(),
        updated_at = NOW()
    WHERE email = user_email;
    
    -- Return true if user was found and updated
    RETURN FOUND;
END;
$$;

-- Grant execute permission to all roles for testing
GRANT EXECUTE ON FUNCTION public.confirm_user_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_user_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.confirm_user_email(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_user_email(TEXT) TO postgres;