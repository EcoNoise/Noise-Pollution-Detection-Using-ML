-- Create function to get email by username
CREATE OR REPLACE FUNCTION get_email_by_username(username_param TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Get email from auth.users by joining with profiles
    SELECT au.email INTO user_email
    FROM auth.users au
    JOIN profiles p ON au.id = p.id
    WHERE p.username = username_param;
    
    RETURN user_email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_email_by_username(TEXT) TO authenticated;