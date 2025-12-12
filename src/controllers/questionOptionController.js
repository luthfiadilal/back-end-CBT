import supabase from '../config/supabase.js';

export const createOption = async (req, res) => {
    try {
        const { question_id, option_text, is_correct } = req.body;

        const { data, error } = await supabase
            .from('question_options')
            .insert([{ question_id, option_text, is_correct }])
            .select();

        if (error) throw error;

        res.status(201).json({ message: 'Option created successfully', data: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getOptionById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('question_options')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateOption = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await supabase
            .from('question_options')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;

        res.status(200).json({ message: 'Option updated successfully', data: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteOption = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('question_options')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.status(200).json({ message: 'Option deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
