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
    router.post(path, requireRole('admin'), controller.create);
    router.put(`${path}/:id`, requireRole('admin'), controller.update);
    router.delete(`${path}/:id`, requireRole('admin'), controller.delete);
};

// Define routes for each sub-kriteria
// Waktu Pengerjaan
router.get('/waktu-pengerjaan', getAllWaktuPengerjaan);
router.get('/waktu-pengerjaan/:id', getWaktuPengerjaanById);
router.post('/waktu-pengerjaan', requireRole('admin'), createWaktuPengerjaan);
router.put('/waktu-pengerjaan/:id', requireRole('admin'), updateWaktuPengerjaan);
router.delete('/waktu-pengerjaan/:id', requireRole('admin'), deleteWaktuPengerjaan);

// Tingkat Kesulitan
router.get('/tingkat-kesulitan', getAllTingkatKesulitan);
router.get('/tingkat-kesulitan/:id', getTingkatKesulitanById);
router.post('/tingkat-kesulitan', requireRole('admin'), createTingkatKesulitan);
router.put('/tingkat-kesulitan/:id', requireRole('admin'), updateTingkatKesulitan);
router.delete('/tingkat-kesulitan/:id', requireRole('admin'), deleteTingkatKesulitan);

// Konsistensi Jawaban
router.get('/konsistensi-jawaban', getAllKonsistensiJawaban);
router.get('/konsistensi-jawaban/:id', getKonsistensiJawabanById);
router.post('/konsistensi-jawaban', requireRole('admin'), createKonsistensiJawaban);
router.put('/konsistensi-jawaban/:id', requireRole('admin'), updateKonsistensiJawaban);
router.delete('/konsistensi-jawaban/:id', requireRole('admin'), deleteKonsistensiJawaban);

// Ketepatan Jawaban
router.get('/ketepatan-jawaban', getAllKetepatanJawaban);
router.get('/ketepatan-jawaban/:id', getKetepatanJawabanById);
router.post('/ketepatan-jawaban', requireRole('admin'), createKetepatanJawaban);
router.put('/ketepatan-jawaban/:id', requireRole('admin'), updateKetepatanJawaban);
router.delete('/ketepatan-jawaban/:id', requireRole('admin'), deleteKetepatanJawaban);

export default router;
