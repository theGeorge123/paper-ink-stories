-- Remove unused demo tables that lack RLS protection
-- These tables are not used by the application (which uses sessionStorage for demo mode)
-- Removing them reduces attack surface

DROP TABLE IF EXISTS public.demo_preferences CASCADE;
DROP TABLE IF EXISTS public.demo_episodes CASCADE;
DROP TABLE IF EXISTS public.demo_hero CASCADE;
DROP TABLE IF EXISTS public.demo_profiles CASCADE;