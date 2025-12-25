import supabase from '../config/supabase.js';

// GET /api/exam/result/:attempt_id
export const getExamResultByAttempt = async (req, res) => {
    const { attempt_id } = req.params;
    const { user_uid, user_role } = req.query; // Pass from frontend

    try {
        console.log('=== GET EXAM RESULT BY ATTEMPT ===');
        console.log('attempt_id:', attempt_id);
        console.log('requesting user_uid:', user_uid);
        console.log('requesting user_role:', user_role);

        // Get attempt details
        const { data: attemptData, error: attemptError } = await supabase
            .from('exam_attempts')
            .select('*')
            .eq('id', attempt_id)
            .single();

        if (attemptError || !attemptData) {
            return res.status(404).json({ error: 'Exam attempt not found' });
        }

        // Authorization check: 
        // - Teachers can view all results
        // - Students can only view their own results
        if (user_role === 'siswa' && attemptData.user_uid !== user_uid) {
            return res.status(403).json({
                error: 'Akses ditolak',
                message: 'Anda tidak memiliki izin untuk melihat hasil ujian siswa lain'
            });
        }

        const { exam_id } = attemptData;

        // Get raw data from hasil_cbt
        const { data: hasilData } = await supabase
            .from('hasil_cbt')
            .select('*')
            .eq('attempt_id', attempt_id)
            .single();

        // Get SAW values
        const { data: sawData } = await supabase
            .from('nilai_saw')
            .select('*')
            .eq('attempt_id', attempt_id)
            .single();

        // Get ranking/final results
        const { data: rankingData } = await supabase
            .from('ranking_saw')
            .select('*')
            .eq('attempt_id', attempt_id)
            .single();

        // Get detailed answers
        const { data: detailedAnswers } = await supabase
            .from('student_answers')
            .select(`
                id,
                is_correct,
                auto_score,
                selected_option_id,
                questions (
                    id,
                    question_text,
                    difficulty_level,
                    max_point,
                    pair_group,
                    question_options (
                        id,
                        option_text,
                        is_correct
                    )
                )
            `)
            .eq('attempt_id', attempt_id);

        // Build response similar to finishExam
        return res.status(200).json({
            message: "Exam result retrieved successfully",
            attempt_id: parseInt(attempt_id),

            // Basic totals
            total_questions: detailedAnswers?.length || 0,
            total_correct: attemptData.total_correct || 0,
            total_score: attemptData.total_score || 0,
            duration_minutes: attemptData.duration_minutes || 0,

            // Raw SAW data (C1-C4)
            raw_data: hasilData ? {
                jumlah_benar: hasilData.jumlah_benar,
                skor_kesulitan: hasilData.skor_kesulitan,
                pasangan_benar: hasilData.pasangan_benar,
                waktu_menit: hasilData.waktu_menit
            } : null,

            // SAW crips values (1-5)
            saw_values: sawData ? {
                c1: sawData.c1,
                c2: sawData.c2,
                c3: sawData.c3,
                c4: sawData.c4
            } : null,

            // Final SAW results
            saw_result: rankingData ? {
                nilai_preferensi: rankingData.nilai_preferensi,
                nilai_konversi: rankingData.nilai_konversi,
                status: rankingData.status
            } : null,

            // Detailed answers
            answers: detailedAnswers
        });

    } catch (err) {
        console.error('=== GET EXAM RESULT ERROR ===');
        console.error('Error:', err);
        return res.status(500).json({ error: err.message });
    }
};
