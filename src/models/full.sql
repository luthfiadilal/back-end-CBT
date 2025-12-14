-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin (
  id bigint NOT NULL DEFAULT nextval('admin_id_seq'::regclass),
  user_uid uuid NOT NULL UNIQUE,
  nama character varying NOT NULL,
  email character varying,
  created_at timestamp with time zone DEFAULT now(),
  image_url text,
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
CREATE TABLE public.exam_attempts (
  id bigint NOT NULL DEFAULT nextval('exam_attempts_id_seq'::regclass),
  exam_id bigint NOT NULL,
  user_uid uuid NOT NULL,
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  duration_minutes integer,
  total_correct integer DEFAULT 0,
  total_score integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exam_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT exam_attempts_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id),
  CONSTRAINT exam_attempts_user_uid_fkey FOREIGN KEY (user_uid) REFERENCES public.app_users(uid)
);
CREATE TABLE public.exams (
  id bigint NOT NULL DEFAULT nextval('exams_id_seq'::regclass),
  title text NOT NULL,
  description text,
  total_time_minutes integer,
  total_questions integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exams_pkey PRIMARY KEY (id)
);
CREATE TABLE public.hasil_cbt (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  siswa_id bigint,
  jumlah_benar integer NOT NULL,
  skor_kesulitan integer NOT NULL,
  pasangan_benar integer NOT NULL,
  waktu_menit integer NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  exam_id bigint,
  attempt_id bigint,
  user_uid uuid,
  CONSTRAINT hasil_cbt_pkey PRIMARY KEY (id),
  CONSTRAINT hasil_cbt_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id),
  CONSTRAINT hasil_cbt_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.exam_attempts(id),
  CONSTRAINT hasil_cbt_user_uid_fkey FOREIGN KEY (user_uid) REFERENCES public.app_users(uid)
);
CREATE TABLE public.ketepatan_jawaban (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  kriteria text,
  crips text,
  min_benar integer,
  max_benar integer,
  bobot integer,
  CONSTRAINT ketepatan_jawaban_pkey PRIMARY KEY (id)
);
CREATE TABLE public.konsistensi_jawaban (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  kriteria text,
  crips text,
  min_pasangan integer,
  max_pasangan integer,
  bobot integer,
  CONSTRAINT konsistensi_jawaban_pkey PRIMARY KEY (id)
);
CREATE TABLE public.kriteria (
  kode_kriteria text NOT NULL,
  nama_kriteria text NOT NULL,
  atribut text NOT NULL CHECK (atribut = ANY (ARRAY['Benefit'::text, 'Cost'::text])),
  bobot double precision NOT NULL,
  CONSTRAINT kriteria_pkey PRIMARY KEY (kode_kriteria)
);
CREATE TABLE public.nilai_saw (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  siswa_id bigint,
  c1 integer NOT NULL,
  c2 integer NOT NULL,
  c3 integer NOT NULL,
  c4 integer NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  exam_id bigint,
  attempt_id bigint,
  user_uid uuid,
  CONSTRAINT nilai_saw_pkey PRIMARY KEY (id),
  CONSTRAINT nilai_saw_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id),
  CONSTRAINT nilai_saw_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.exam_attempts(id),
  CONSTRAINT nilai_saw_user_uid_fkey FOREIGN KEY (user_uid) REFERENCES public.app_users(uid)
);
CREATE TABLE public.question_options (
  id bigint NOT NULL DEFAULT nextval('question_options_id_seq'::regclass),
  question_id bigint NOT NULL,
  option_text text,
  is_correct boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT question_options_pkey PRIMARY KEY (id),
  CONSTRAINT question_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id)
);
CREATE TABLE public.questions (
  id bigint NOT NULL DEFAULT nextval('questions_id_seq'::regclass),
  exam_id bigint NOT NULL,
  question_text text NOT NULL,
  difficulty_level integer,
  max_point integer DEFAULT 1,
  pair_group text,
  created_at timestamp with time zone DEFAULT now(),
  question_type text NOT NULL DEFAULT 'mcq'::text CHECK (question_type = ANY (ARRAY['mcq'::text, 'essay'::text, 'pair'::text, 'truefalse'::text])),
  image_url text,
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id)
);
CREATE TABLE public.ranking_saw (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  siswa_id bigint,
  nilai_preferensi double precision NOT NULL,
  nilai_konversi double precision NOT NULL,
  ranking integer NOT NULL,
  status text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  exam_id bigint,
  attempt_id bigint,
  user_uid uuid,
  CONSTRAINT ranking_saw_pkey PRIMARY KEY (id),
  CONSTRAINT ranking_saw_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id),
  CONSTRAINT ranking_saw_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.exam_attempts(id),
  CONSTRAINT ranking_saw_user_uid_fkey FOREIGN KEY (user_uid) REFERENCES public.app_users(uid)
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
  image_url text,
  CONSTRAINT siswa_pkey PRIMARY KEY (id),
  CONSTRAINT siswa_user_uid_fkey FOREIGN KEY (user_uid) REFERENCES public.app_users(uid)
);
CREATE TABLE public.student_answers (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  attempt_id bigint NOT NULL,
  question_id bigint NOT NULL,
  selected_option_id bigint,
  answer_text text,
  is_correct boolean,
  auto_score numeric DEFAULT 0,
  answered_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_answers_pkey PRIMARY KEY (id),
  CONSTRAINT student_answers_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.exam_attempts(id),
  CONSTRAINT student_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id),
  CONSTRAINT student_answers_selected_option_id_fkey FOREIGN KEY (selected_option_id) REFERENCES public.question_options(id)
);
CREATE TABLE public.teacher (
  id bigint NOT NULL DEFAULT nextval('teacher_id_seq'::regclass),
  user_uid uuid NOT NULL UNIQUE,
  nama character varying NOT NULL,
  nip character varying,
  email character varying,
  created_at timestamp with time zone DEFAULT now(),
  image_url text,
  CONSTRAINT teacher_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_user_uid_fkey FOREIGN KEY (user_uid) REFERENCES public.app_users(uid)
);
CREATE TABLE public.tingkat_kesulitan (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  kriteria text,
  crips text,
  min_skor integer,
  max_skor integer,
  bobot integer,
  CONSTRAINT tingkat_kesulitan_pkey PRIMARY KEY (id)
);
CREATE TABLE public.waktu_pengerjaan (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  kriteria text,
  crips text,
  min_menit integer,
  max_menit integer,
  bobot integer,
  CONSTRAINT waktu_pengerjaan_pkey PRIMARY KEY (id)
);