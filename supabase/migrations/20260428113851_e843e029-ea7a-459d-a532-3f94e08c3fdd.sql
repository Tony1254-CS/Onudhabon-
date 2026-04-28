
REVOKE EXECUTE ON FUNCTION public.find_student_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_student_by_code(text) TO authenticated;
