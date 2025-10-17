-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.domains (
  id integer NOT NULL DEFAULT nextval('domains_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT domains_pkey PRIMARY KEY (id)
);
CREATE TABLE public.games (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  admin_id uuid,
  lambda double precision NOT NULL DEFAULT 0.5,
  beta double precision NOT NULL DEFAULT 0.2,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  current_round_number integer DEFAULT 0,
  CONSTRAINT games_pkey PRIMARY KEY (id),
  CONSTRAINT games_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.hostels (
  id integer NOT NULL DEFAULT nextval('hostels_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  CONSTRAINT hostels_pkey PRIMARY KEY (id)
);
CREATE TABLE public.lobbies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  name text NOT NULL,
  CONSTRAINT lobbies_pkey PRIMARY KEY (id),
  CONSTRAINT lobbies_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id)
);
CREATE TABLE public.lobby_participants (
  lobby_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  CONSTRAINT lobby_participants_pkey PRIMARY KEY (lobby_id, profile_id),
  CONSTRAINT lobby_participants_lobby_id_fkey FOREIGN KEY (lobby_id) REFERENCES public.lobbies(id),
  CONSTRAINT lobby_participants_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.player_actions (
  id bigint NOT NULL DEFAULT nextval('player_actions_id_seq'::regclass),
  round_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  action_type text NOT NULL,
  delegated_to_id uuid,
  solve_attempt text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT player_actions_pkey PRIMARY KEY (id),
  CONSTRAINT player_actions_delegated_to_id_fkey FOREIGN KEY (delegated_to_id) REFERENCES public.profiles(id),
  CONSTRAINT player_actions_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id),
  CONSTRAINT player_actions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.player_ratings (
  id bigint NOT NULL DEFAULT nextval('player_ratings_id_seq'::regclass),
  profile_id uuid NOT NULL,
  domain_id integer NOT NULL,
  rating integer NOT NULL CHECK (rating >= 0 AND rating <= 10),
  justification text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT player_ratings_pkey PRIMARY KEY (id),
  CONSTRAINT player_ratings_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT player_ratings_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.domains(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text NOT NULL UNIQUE,
  updated_at timestamp with time zone DEFAULT now(),
  hostel_id integer,
  role USER-DEFINED NOT NULL DEFAULT 'player'::user_role,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES public.hostels(id)
);
CREATE TABLE public.round_scores (
  id bigint NOT NULL DEFAULT nextval('round_scores_id_seq'::regclass),
  round_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  score_change double precision NOT NULL,
  final_score_after_round double precision NOT NULL,
  CONSTRAINT round_scores_pkey PRIMARY KEY (id),
  CONSTRAINT round_scores_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id),
  CONSTRAINT round_scores_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.rounds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  round_number integer NOT NULL,
  question_text text NOT NULL,
  domain_id integer NOT NULL,
  correct_answer text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  CONSTRAINT rounds_pkey PRIMARY KEY (id),
  CONSTRAINT rounds_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id),
  CONSTRAINT rounds_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.domains(id)
);