import supabase from '../config/supabase.js';

// Get all kriteria
export const getAllKriteria = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('kriteria')
            .select('*')
            .order('kode_kriteria', { ascending: true });

        if (error) throw error;

        console.log('✅ Get all kriteria response sent:', data.length, 'records');
        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get kriteria by ID
export const getKriteriaById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('kriteria')
            .select('*')
            .eq('kode_kriteria', id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Kriteria not found'
            });
        }

        console.log('✅ Get kriteria by ID response sent:', id);
        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create new kriteria
export const createKriteria = async (req, res) => {
    try {
        const { kode_kriteria, nama_kriteria, atribut, bobot } = req.body;

        // Validation
        if (!kode_kriteria || !nama_kriteria || !atribut || bobot === undefined) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        if (!['Benefit', 'Cost'].includes(atribut)) {
            return res.status(400).json({
                success: false,
                message: 'Atribut must be Benefit or Cost'
            });
        }

        const { data, error } = await supabase
            .from('kriteria')
            .insert([{ kode_kriteria, nama_kriteria, atribut, bobot }])
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Create kriteria response sent:', data);
        res.status(201).json({
            success: true,
            message: 'Kriteria created successfully',
            data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update kriteria
export const updateKriteria = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_kriteria, atribut, bobot } = req.body;

        const { data, error } = await supabase
            .from('kriteria')
            .update({ nama_kriteria, atribut, bobot })
            .eq('kode_kriteria', id)
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Update kriteria response sent:', id);
        res.status(200).json({
            success: true,
            message: 'Kriteria updated successfully',
            data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete kriteria
export const deleteKriteria = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('kriteria')
            .delete()
            .eq('kode_kriteria', id);

        if (error) throw error;

        console.log('✅ Delete kriteria response sent:', id);
        res.status(200).json({
            success: true,
            message: 'Kriteria deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
