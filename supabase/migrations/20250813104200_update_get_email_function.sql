-- Update function to get email by username from profiles table
CREATE OR REPLACE FUNCTION get_email_by_username(username_param TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Get email directly from profiles table
    SELECT email INTO user_email
    FROM profiles
    WHERE username = username_param;
    
    RETURN user_email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_email_by_username(TEXT) TO authenticated;