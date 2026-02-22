-- Setup script to create login code 2248 for a user
-- Run this manually after identifying the user_id
-- Example:
-- SELECT public.create_login_code('USER_ID_HERE', '2248');

-- Create login code 2248 for ALL users in the system
-- (You can modify this to target a specific user by email or ID)
DO $$
DECLARE
  user_rec RECORD;
  code_count INTEGER := 0;
BEGIN
  -- Loop through all users and create code 2248 for each
  FOR user_rec IN 
    SELECT id, email 
    FROM auth.users
    ORDER BY created_at
  LOOP
    -- Create login code 2248 for this user
    PERFORM public.create_login_code(user_rec.id, '2248');
    code_count := code_count + 1;
    RAISE NOTICE 'Login code 2248 created for user: % (email: %)', user_rec.id, user_rec.email;
  END LOOP;

  IF code_count = 0 THEN
    RAISE NOTICE 'No users found in the system';
  ELSE
    RAISE NOTICE 'Successfully created login code 2248 for % user(s)', code_count;
  END IF;
END $$;
