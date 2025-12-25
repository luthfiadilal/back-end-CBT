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

        // Check if user has already finished this exam
        const { data: existingAttempts } = await supabase
            .from('exam_attempts')
            .select('id, finished_at')
            .eq('exam_id', exam_id)
            .eq('user_uid', user_uid)
            .not('finished_at', 'is', null); // Only get finished attempts

        if (existingAttempts && existingAttempts.length > 0) {
            console.log('User has already completed this exam');
            return res.status(400).json({
                error: 'Ujian ini sudah pernah dikerjakan',
                message: 'Anda sudah menyelesaikan ujian ini sebelumnya.'
            });
        }

        // Check if user has an ongoing (unfinished) attempt
        const { data: ongoingAttempt } = await supabase
            .from('exam_attempts')
            .select('id, started_at')
            .eq('exam_id', exam_id)
            .eq('user_uid', user_uid)
            .is('finished_at', null)
            .maybeSingle();

        if (ongoingAttempt) {
            console.log('User has an ongoing attempt, returning existing attempt_id');
            return res.status(200).json({
                message: "Melanjutkan ujian yang sedang berlangsung",
                attempt_id: ongoingAttempt.id,
                is_resumed: true
            });
        }


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
        // 1. Fetch question details to get max_point
        const { data: questionData, error: questionError } = await supabase
            .from('questions')
            .select('max_point')
            .eq('id', question_id)
            .single();

        if (questionError) {
            console.error('Error fetching question:', questionError);
            throw questionError;
        }

        const maxPoint = questionData.max_point || 1;
        console.log(`Question max_point: ${maxPoint}`);

        // 2. Check if answer is correct
        let isCorrect = false;

        // Check which option is correct
        const { data: correctOption } = await supabase
            .from('question_options')
            .select('is_correct')
            .eq('id', selected_option_id)
            .single();

        if (correctOption && correctOption.is_correct) {
            isCorrect = true;
        }

        console.log(`Answer is ${isCorrect ? 'correct' : 'incorrect'}`);

        // 3. Calculate auto_score based on max_point and correctness
        const auto_score = isCorrect ? maxPoint : 0;
        console.log(`Calculated auto_score: ${auto_score}`);

        // 4. Check if answer already exists
        const { data: existingAnswer } = await supabase
            .from('student_answers')
            .select('id')
            .eq('attempt_id', attempt_id)
            .eq('question_id', question_id)
            .maybeSingle();

        let error;

        if (existingAnswer) {
            // Update existing answer
            console.log('Updating existing answer...');
            const updateResult = await supabase
                .from('student_answers')
                .update({
                    selected_option_id,
                    answer_text,
                    is_correct: isCorrect,
                    auto_score: auto_score,
                    answered_at: new Date().toISOString()
                })
                .eq('id', existingAnswer.id);
            error = updateResult.error;
        } else {
            // Insert new answer
            console.log('Inserting new answer...');
            const insertResult = await supabase
                .from('student_answers')
                .insert({
                    attempt_id,
                    question_id,
                    selected_option_id,
                    answer_text,
                    is_correct: isCorrect,
                    auto_score: auto_score,
                    answered_at: new Date().toISOString()
                });
            error = insertResult.error;
        }

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

// GET /api/student/exam/:exam_id/status
export const getExamStatus = async (req, res) => {
    const { exam_id } = req.params;
    const user_uid = req.query.user_uid || req.body.user_uid;

    console.log('=== GET EXAM STATUS REQUEST ===');
    console.log('exam_id:', exam_id);
    console.log('user_uid:', user_uid);

    try {
        if (!user_uid) {
            return res.status(400).json({ error: 'user_uid is required' });
        }

        // Check for finished attempts
        const { data: finishedAttempts } = await supabase
            .from('exam_attempts')
            .select('id, finished_at, duration_minutes')
            .eq('exam_id', exam_id)
            .eq('user_uid', user_uid)
            .not('finished_at', 'is', null)
            .order('finished_at', { ascending: false })
            .limit(1);

        if (finishedAttempts && finishedAttempts.length > 0) {
            return res.status(200).json({
                status: 'completed',
                message: 'Ujian sudah pernah diselesaikan',
                attempt: finishedAttempts[0]
            });
        }

        // Check for ongoing attempts
        const { data: ongoingAttempt } = await supabase
            .from('exam_attempts')
            .select('id, started_at')
            .eq('exam_id', exam_id)
            .eq('user_uid', user_uid)
            .is('finished_at', null)
            .maybeSingle();

        if (ongoingAttempt) {
            return res.status(200).json({
                status: 'in_progress',
                message: 'Ujian sedang berlangsung',
                attempt: ongoingAttempt
            });
        }

        return res.status(200).json({
            status: 'not_started',
            message: 'Ujian belum dimulai'
        });

    } catch (err) {
        console.error('=== GET EXAM STATUS ERROR ===');
        console.error('Error:', err);
        return res.status(500).json({ error: err.message });
    }
};
