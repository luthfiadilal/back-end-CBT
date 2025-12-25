import supabase from '../config/supabase.js';

// POST /api/student/exam/start
export const startExam = async (req, res) => {
    const { user_uid, exam_id } = req.body;

    console.log('=== START EXAM REQUEST ===');
    console.log('Request body:', req.body);
    console.log('user_uid:', user_uid);
    console.log('exam_id:', exam_id);

    try {
        // Validate input
        if (!user_uid || !exam_id) {
            console.error('Missing required fields:', { user_uid, exam_id });
            return res.status(400).json({
                error: 'Missing required fields',
                details: { user_uid: !!user_uid, exam_id: !!exam_id }
            });
        }

        // 1. Cek apakah user sudah pernah mulai (optional, tergantung rules)

        // 2. Insert ke exam_attempts
        console.log('Attempting to insert exam_attempts...');
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

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Exam attempt created successfully:', data);

        return res.status(200).json({
            message: "Ujian dimulai",
            attempt_id: data.id
        });

    } catch (err) {
        console.error('=== START EXAM ERROR ===');
        console.error('Error message:', err.message);
        console.error('Error details:', err);
        console.error('Stack trace:', err.stack);
        return res.status(500).json({
            error: err.message,
            details: process.env.NODE_ENV === 'development' ? err : undefined
        });
    }
}

// GET /api/student/exam/:exam_id/questions
export const getExamQuestions = async (req, res) => {
    const { exam_id } = req.params;

    console.log('=== GET EXAM QUESTIONS REQUEST ===');
    console.log('exam_id:', exam_id);

    try {
        // Ambil Pertanyaan beserta Opsinya (tanpa is_correct untuk keamanan)
        const { data, error } = await supabase
            .from('questions')
            .select(`
                id, 
                question_text, 
                question_type, 
                difficulty_level,
                image_url,
                question_options (
                    id,
                    option_text
                )
            `)
            .eq('exam_id', exam_id);

        if (error) {
            console.error('Supabase error in getExamQuestions:', error);
            throw error;
        }

        console.log(`Found ${data?.length || 0} questions for exam ${exam_id}`);

        return res.status(200).json({ questions: data });

    } catch (err) {
        console.error('=== GET EXAM QUESTIONS ERROR ===');
        console.error('Error:', err);
        return res.status(500).json({ error: err.message });
    }
}

// POST /api/student/exam/answer
export const submitAnswer = async (req, res) => {
    const { attempt_id, question_id, selected_option_id, answer_text } = req.body;

    console.log('=== SUBMIT ANSWER REQUEST ===');
    console.log('Request body:', req.body);

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

        console.log(`Answer is ${isCorrect ? 'correct' : 'incorrect'}`);

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

        if (error) {
            console.error('Supabase error in submitAnswer:', error);
            throw error;
        }

        console.log('Answer saved successfully');

        return res.status(200).json({
            message: "Jawaban tersimpan",
            is_correct: isCorrect
        });

    } catch (err) {
        console.error('=== SUBMIT ANSWER ERROR ===');
        console.error('Error:', err);
        return res.status(500).json({ error: err.message });
    }
}