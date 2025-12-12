import supabase from '../config/supabase.js';

export const createQuestion = async (req, res) => {
    try {
        const { exam_id, question_text, difficulty_level, max_point, question_type, options } = req.body;

        // Start a "transaction" by inserting question first
        const { data: questionData, error: questionError } = await supabase
            .from('questions')
            .insert([{
                exam_id,
                question_text,
                difficulty_level,
                max_point,
                question_type: question_type || 'mcq'
            }])
            .select()
            .single();

        if (questionError) throw questionError;

        let createdOptions = [];
        if (options && options.length > 0) {
            const optionsWithId = options.map(opt => ({
                question_id: questionData.id,
                option_text: opt.option_text,
                is_correct: opt.is_correct || false
            }));

            const { data: optionsData, error: optionsError } = await supabase
                .from('question_options')
                .insert(optionsWithId)
                .select();

            if (optionsError) {
                // Ideally we would rollback here, but Supabase JS doesn't support manual transactions easily without RPC.
                // For now, we return partial success or throw. 
                // In a real prod env, use RPC or handle cleanup.
                throw optionsError;
            }
            createdOptions = optionsData;
        }

        res.status(201).json({
            message: 'Question created successfully',
            data: { ...questionData, options: createdOptions }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllQuestions = async (req, res) => {
    try {
        const { exam_id } = req.query;
        let query = supabase.from('questions').select('*, question_options(*)');

        if (exam_id) {
            query = query.eq('exam_id', exam_id);
        }

        const { data, error } = await query.order('created_at', { ascending: true });

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getQuestionById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('questions')
            .select('*, question_options(*)')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Remove options from updates if present, options should be updated via separate endpoint or logic
        delete updates.options;

        const { data, error } = await supabase
            .from('questions')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;

        res.status(200).json({ message: 'Question updated successfully', data: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        // Cascade delete is handled by DB FK usually, but explicit delete of options can be safer if not configured
        await supabase.from('question_options').delete().eq('question_id', id);

        const { error } = await supabase
            .from('questions')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.status(200).json({ message: 'Question deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
