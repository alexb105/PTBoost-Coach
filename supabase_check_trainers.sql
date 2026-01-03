-- Check what trainers exist in the database
SELECT 
  id,
  email,
  full_name,
  business_name,
  subscription_tier,
  subscription_status,
  max_clients,
  created_at
FROM trainers
ORDER BY created_at DESC;






