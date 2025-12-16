import express from 'express';
import {
    getAllWaktuPengerjaan, getWaktuPengerjaanById, createWaktuPengerjaan, updateWaktuPengerjaan, deleteWaktuPengerjaan,
    getAllTingkatKesulitan, getTingkatKesulitanById, createTingkatKesulitan, updateTingkatKesulitan, deleteTingkatKesulitan,
    getAllKonsistensiJawaban, getKonsistensiJawabanById, createKonsistensiJawaban, updateKonsistensiJawaban, deleteKonsistensiJawaban,
    getAllKetepatanJawaban, getKetepatanJawabanById, createKetepatanJawaban, updateKetepatanJawaban, deleteKetepatanJawaban
} from '../controllers/subKriteriaController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

// Helper to define routes for a resource
const createResourceRoutes = (path, controller) => {
    router.get(path, controller.getAll);
    router.get(`${path}/:id`, controller.getById);
    router.post(path, requireRole('teacher'), controller.create);
    router.put(`${path}/:id`, requireRole('teacher'), controller.update);
    router.delete(`${path}/:id`, requireRole('teacher'), controller.delete);
};

// Define routes for each sub-kriteria
// Waktu Pengerjaan
router.get('/waktu-pengerjaan', getAllWaktuPengerjaan);
router.get('/waktu-pengerjaan/:id', getWaktuPengerjaanById);
router.post('/waktu-pengerjaan', requireRole('teacher'), createWaktuPengerjaan);
router.put('/waktu-pengerjaan/:id', requireRole('teacher'), updateWaktuPengerjaan);
router.delete('/waktu-pengerjaan/:id', requireRole('teacher'), deleteWaktuPengerjaan);

// Tingkat Kesulitan
router.get('/tingkat-kesulitan', getAllTingkatKesulitan);
router.get('/tingkat-kesulitan/:id', getTingkatKesulitanById);
router.post('/tingkat-kesulitan', requireRole('teacher'), createTingkatKesulitan);
router.put('/tingkat-kesulitan/:id', requireRole('teacher'), updateTingkatKesulitan);
router.delete('/tingkat-kesulitan/:id', requireRole('teacher'), deleteTingkatKesulitan);

// Konsistensi Jawaban
router.get('/konsistensi-jawaban', getAllKonsistensiJawaban);
router.get('/konsistensi-jawaban/:id', getKonsistensiJawabanById);
router.post('/konsistensi-jawaban', requireRole('teacher'), createKonsistensiJawaban);
router.put('/konsistensi-jawaban/:id', requireRole('teacher'), updateKonsistensiJawaban);
router.delete('/konsistensi-jawaban/:id', requireRole('teacher'), deleteKonsistensiJawaban);

// Ketepatan Jawaban
router.get('/ketepatan-jawaban', getAllKetepatanJawaban);
router.get('/ketepatan-jawaban/:id', getKetepatanJawabanById);
router.post('/ketepatan-jawaban', requireRole('teacher'), createKetepatanJawaban);
router.put('/ketepatan-jawaban/:id', requireRole('teacher'), updateKetepatanJawaban);
router.delete('/ketepatan-jawaban/:id', requireRole('teacher'), deleteKetepatanJawaban);

export default router;
