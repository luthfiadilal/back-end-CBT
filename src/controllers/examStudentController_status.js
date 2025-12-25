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
