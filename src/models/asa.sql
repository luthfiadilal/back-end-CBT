-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin (
  id bigint NOT NULL DEFAULT nextval('admin_id_seq'::regclass),
  user_uid uuid NOT NULL UNIQUE,
  nama character varying NOT NULL,
  email character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_pkey PRIMARY KEY (id),
  CONSTRAINT admin_user_uid_fkey FOREIGN KEY (user_uid) REFERENCES public.app_users(uid)
);
CREATE TABLE public.app_users (
  uid uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['siswa'::text, 'teacher'::text, 'admin'::text])),
  created_at timestamp with time zone DEFAULT now(),
  email character varying UNIQUE,
  password_hash character varying,
  CONSTRAINT app_users_pkey PRIMARY KEY (uid),
  CONSTRAINT app_users_uid_fkey FOREIGN KEY (uid) REFERENCES auth.users(id)
);

CREATE TABLE public.siswa (
  id bigint NOT NULL DEFAULT nextval('siswa_id_seq'::regclass),
  user_uid uuid NOT NULL UNIQUE,
  nama character varying NOT NULL,
  tanggal_lahir character varying,
  alamat text,
  kelas character varying,
  nis character varying,
  email character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT siswa_pkey PRIMARY KEY (id),
  CONSTRAINT siswa_user_uid_fkey FOREIGN KEY (user_uid) REFERENCES public.app_users(uid)
);

CREATE TABLE public.teacher (
  id bigint NOT NULL DEFAULT nextval('teacher_id_seq'::regclass),
  user_uid uuid NOT NULL UNIQUE,
  nama character varying NOT NULL,
  nip character varying,
  email character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT teacher_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_user_uid_fkey FOREIGN KEY (user_uid) REFERENCES public.app_users(uid)
);
