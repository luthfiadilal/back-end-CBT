-- Add image_url column to siswa table
ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to teacher table
ALTER TABLE public.teacher ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to admin table
ALTER TABLE public.admin ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('siswa', 'teacher', 'admin') 
AND column_name = 'image_url';
