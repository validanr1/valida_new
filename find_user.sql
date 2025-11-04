select id, email
from public.profiles
where lower(email) = lower('5fiveagencia@gmail.com')
limit 5;
