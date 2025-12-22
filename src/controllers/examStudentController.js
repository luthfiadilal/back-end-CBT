import supabase from '../config/supabase.js';

// POST /api/student/exam/start
export const startExam = async (req, res) => {
    const { user_uid, exam_id } = req.body;

    try {
        // 1. Cek apakah user sudah pernah mulai (optional, tergantung rules)

        // 2. Insert ke exam_attempts
        const { data, error } = await supabase
            .from('exam_attempts')
            .insert([{
                exam_id: exam_id,
                user_uid: user_uid,
                started_at: new Date().toISOString(), // Waktu mulai
                total_correct: 0,
                total_score: 0
            }])
            .select('id') // Ambil ID attempt yang baru dibuat
            .single();

        if (error) throw error;

        return res.status(200).json({
            message: "Ujian dimulai",
            attempt_id: data.id
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

// GET /api/student/exam/:exam_id/questions
export const getExamQuestions = async (req, res) => {
    const { exam_id } = req.params;

    try {
        // Ambil Pertanyaan beserta Opsinya
        const { data, error } = await supabase
            .from('questions')
            .select(`
                id, 
                question_text, 
                question_type, 
                difficulty_level, -- Untuk info frontend jika perlu, tapi jgn dipakai hitung skor di FE
                image_url,
                question_options (
                    id,
                    option_text
                    -- JANGAN SELECT is_correct DI SINI
                )
            `)
            .eq('exam_id', exam_id);

        if (error) throw error;

        return res.status(200).json({ questions: data });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

// POST /api/student/exam/answer
export const submitAnswer = async (req, res) => {
    const { attempt_id, question_id, selected_option_id, answer_text } = req.body;

    try {
        // 1. Cek Kunci Jawaban (Backend Validation)
        // Kita butuh tahu apakah jawaban ini benar untuk update kolom is_correct
        let isCorrect = false;

        // Cek ke DB opsi mana yang benar
        const { data: correctOption } = await supabase
            .from('question_options')
            .select('is_correct')
            .eq('id', selected_option_id)
            .single();

        if (correctOption && correctOption.is_correct) {
            isCorrect = true;
        }

        // 2. Upsert (Insert atau Update jika user ganti jawaban)
        const { error } = await supabase
            .from('student_answers')
            .upsert({
                attempt_id,
                question_id,
                selected_option_id,
                answer_text, // Untuk essay
                is_correct: isCorrect,
                answered_at: new Date().toISOString()
            }, { onConflict: 'attempt_id, question_id' }); // Pastikan 1 soal 1 jawaban per attempt

        if (error) throw error;

        return res.status(200).json({ message: "Jawaban tersimpan" });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}