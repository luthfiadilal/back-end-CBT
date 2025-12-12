import supabase from '../config/supabase.js';

// Start an exam attempt
export const createAttempt = async (req, res) => {
    try {
        const { exam_id, user_uid } = req.body;

        // Check if there is already an unfinished attempt for this user and exam
        const { data: existingAttempt, error: existingError } = await supabase
            .from('exam_attempts')
            .select('*')
            .eq('exam_id', exam_id)
            .eq('user_uid', user_uid)
            .is('finished_at', null)
            .single();

        if (existingAttempt) {
            return res.status(200).json({
                message: 'Active attempt found',
                data: existingAttempt
            });
        }

        const { data, error } = await supabase
            .from('exam_attempts')
            .insert([{
                exam_id,
                user_uid,
                started_at: new Date().toISOString()
            }])
            .select();

        if (error) throw error;

        res.status(201).json({ message: 'Exam attempt started', data: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAttemptById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('exam_attempts')
            .select(`
                *,
                exam:exams (*),
                student_answers (*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAttemptsByUser = async (req, res) => {
    try {
        const { uid } = req.params;

        const { data, error } = await supabase
            .from('exam_attempts')
            .select(`
                *,
                exam:exams (title)
            `)
            .eq('user_uid', uid)
            .order('started_at', { ascending: false });

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Save a single answer
export const saveAnswer = async (req, res) => {
    try {
        const { attempt_id } = req.params;
        const { question_id, selected_option_id, answer_text } = req.body;

        // Check if correct (simple auto-grading for MCQ)
        let is_correct = null;
        let auto_score = 0;

        if (selected_option_id) {
            const { data: option } = await supabase
                .from('question_options')
                .select('is_correct')
                .eq('id', selected_option_id)
                .single();

            if (option) {
                is_correct = option.is_correct;
                // Fetch max point for question
                const { data: question } = await supabase
                    .from('questions')
                    .select('max_point')
                    .eq('id', question_id)
                    .single();

                if (is_correct && question) {
                    auto_score = question.max_point || 1;
                }
            }
        }

        // Upsert answer
        const { data, error } = await supabase
            .from('student_answers')
            .upsert({
                attempt_id,
                question_id,
                selected_option_id,
                answer_text,
                is_correct,
                auto_score,
                answered_at: new Date().toISOString()
            }, { onConflict: 'attempt_id, question_id' })
            .select();

        if (error) throw error;

        res.status(200).json({ message: 'Answer saved', data: data[0] });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const submitAttempt = async (req, res) => {
    try {
        const { id } = req.params;

        // Calculate final score
        // 1. Get all answers for this attempt
        const { data: answers, error: answersError } = await supabase
            .from('student_answers')
            .select('auto_score, is_correct')
            .eq('attempt_id', id);

        if (answersError) throw answersError;

        let total_score = 0;
        let total_correct = 0;

        answers.forEach(ans => {
            total_score += (ans.auto_score || 0);
            if (ans.is_correct) total_correct++;
        });

        // Update attempt execution
        const { data, error } = await supabase
            .from('exam_attempts')
            .update({
                finished_at: new Date().toISOString(),
                total_score,
                total_correct
            })
            .eq('id', id)
            .select();

        if (error) throw error;

        res.status(200).json({ message: 'Exam submitted successfully', data: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
