-- Create function to confirm user email for testing purposes
CREATE OR REPLACE FUNCTION public.confirm_user_email(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update email_confirmed_at for the user
    UPDATE auth.users 
    SET email_confirmed_at = NOW(),
        updated_at = NOW()
    WHERE email = user_email;
    
    -- Return true if user was found and updated
    RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated and anon users for testing
GRANT EXECUTE ON FUNCTION public.confirm_user_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_user_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.confirm_user_email(TEXT) TO service_role;