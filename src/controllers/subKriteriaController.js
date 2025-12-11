import supabase from '../config/supabase.js';

// Generic CRUD helper
const createCRUD = (tableName, sortField = 'id') => ({
    getAll: async (req, res) => {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .order(sortField, { ascending: true });
            if (error) throw error;
            console.log(`✅ [${tableName}] Get all response sent:`, data.length, 'records');
            res.status(200).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    getById: async (req, res) => {
        try {
            const { id } = req.params;
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            if (!data) return res.status(404).json({ success: false, message: 'Not found' });
            console.log(`✅ [${tableName}] Get by ID response sent:`, id);
            res.status(200).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    create: async (req, res) => {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .insert([req.body])
                .select()
                .single();
            if (error) throw error;
            console.log(`✅ [${tableName}] Create response sent:`, data);
            res.status(201).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { data, error } = await supabase
                .from(tableName)
                .update(req.body)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            console.log(`✅ [${tableName}] Update response sent:`, id);
            res.status(200).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq('id', id);
            if (error) throw error;
            console.log(`✅ [${tableName}] Delete response sent:`, id);
            res.status(200).json({ success: true, message: 'Deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
});

// Waktu Pengerjaan
const waktuPengerjaan = createCRUD('waktu_pengerjaan');
export const getAllWaktuPengerjaan = waktuPengerjaan.getAll;
export const getWaktuPengerjaanById = waktuPengerjaan.getById;
export const createWaktuPengerjaan = waktuPengerjaan.create;
export const updateWaktuPengerjaan = waktuPengerjaan.update;
export const deleteWaktuPengerjaan = waktuPengerjaan.delete;

// Tingkat Kesulitan
const tingkatKesulitan = createCRUD('tingkat_kesulitan');
export const getAllTingkatKesulitan = tingkatKesulitan.getAll;
export const getTingkatKesulitanById = tingkatKesulitan.getById;
export const createTingkatKesulitan = tingkatKesulitan.create;
export const updateTingkatKesulitan = tingkatKesulitan.update;
export const deleteTingkatKesulitan = tingkatKesulitan.delete;

// Konsistensi Jawaban
const konsistensiJawaban = createCRUD('konsistensi_jawaban');
export const getAllKonsistensiJawaban = konsistensiJawaban.getAll;
export const getKonsistensiJawabanById = konsistensiJawaban.getById;
export const createKonsistensiJawaban = konsistensiJawaban.create;
export const updateKonsistensiJawaban = konsistensiJawaban.update;
export const deleteKonsistensiJawaban = konsistensiJawaban.delete;

// Ketepatan Jawaban
const ketepatanJawaban = createCRUD('ketepatan_jawaban');
export const getAllKetepatanJawaban = ketepatanJawaban.getAll;
export const getKetepatanJawabanById = ketepatanJawaban.getById;
export const createKetepatanJawaban = ketepatanJawaban.create;
export const updateKetepatanJawaban = ketepatanJawaban.update;
export const deleteKetepatanJawaban = ketepatanJawaban.delete;
