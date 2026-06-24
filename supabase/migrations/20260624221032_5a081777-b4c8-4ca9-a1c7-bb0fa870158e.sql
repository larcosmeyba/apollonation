REVOKE EXECUTE ON FUNCTION public.cleanup_stale_push_tokens() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_push_tokens() TO service_role;