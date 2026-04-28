REVOKE EXECUTE ON FUNCTION public.is_classroom_teacher(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_classroom_member(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_classroom_teacher(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_classroom_member(uuid, uuid) TO authenticated;