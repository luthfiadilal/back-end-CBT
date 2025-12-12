import supabase from '../config/supabase.js';

export const createExam = async (req, res) => {
    try {
        const { title, description, total_time_minutes, total_questions, is_active } = req.body;

        const { data, error } = await supabase
            .from('exams')
            .insert([{ title, description, total_time_minutes, total_questions, is_active }])
            .select();

        if (error) throw error;

        res.status(201).json({ message: 'Exam created successfully', data: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllExams = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getExamById = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch exam details
        const { data: exam, error: examError } = await supabase
            .from('exams')
            .select('*')
            .eq('id', id)
            .single();

        if (examError) throw examError;

        // Fetch questions for this exam
        const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select(`
                *,
                question_options (*)
            `)
            .eq('exam_id', id);

        if (questionsError) throw questionsError;

        res.status(200).json({ ...exam, questions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateExam = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await supabase
            .from('exams')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;

        res.status(200).json({ message: 'Exam updated successfully', data: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteExam = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('exams')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.status(200).json({ message: 'Exam deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
