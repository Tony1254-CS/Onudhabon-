REVOKE EXECUTE ON FUNCTION public.is_classroom_teacher(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_classroom_member(uuid, uuid) FROM anon, authenticated, public;