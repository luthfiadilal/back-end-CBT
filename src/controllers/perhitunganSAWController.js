import supabase from '../config/supabase.js';


// POST /api/student/exam/finish
export const finishExam = async (req, res) => {
    const { attempt_id, user_uid, exam_id } = req.body;
    const finishTime = new Date();

    try {
        // --- STEP 1: AMBIL DATA ATTEMPT & JAWABAN ---
        const { data: attemptData } = await supabase
            .from('exam_attempts')
            .select('started_at')
            .eq('id', attempt_id)
            .single();

        const startTime = new Date(attemptData.started_at);
        const durationMinutes = Math.round((finishTime - startTime) / 60000); // Selisih menit

        // Update exam_attempts dulu
        await supabase
            .from('exam_attempts')
            .update({ finished_at: finishTime.toISOString(), duration_minutes: durationMinutes })
            .eq('id', attempt_id);


        // --- STEP 2: HITUNG RAW DATA (MENTAH) ---
        const { data: answers } = await supabase
            .from('student_answers')
            .select(`
                is_correct,
                questions (
                    difficulty_level,
                    pair_group
                )
            `)
            .eq('attempt_id', attempt_id);

        // A. Hitung Jumlah Benar (C1 Raw)
        const jumlahBenar = answers.filter(a => a.is_correct).length;
        const totalSoal = answers.length;

        // B. Hitung Total Skor Kesulitan (C2 Raw)
        const skorKesulitan = answers.reduce((sum, ans) => {
            return ans.is_correct ? sum + (ans.questions.difficulty_level || 0) : sum;
        }, 0);

        // C. Hitung Konsistensi (C3 Raw)
        const pairGroups = {};
        answers.forEach(ans => {
            const group = ans.questions.pair_group;
            if (group) {
                if (!pairGroups[group]) pairGroups[group] = [];
                pairGroups[group].push(ans.is_correct);
            }
        });

        let pasanganBenar = 0;
        Object.keys(pairGroups).forEach(group => {
            const groupAnswers = pairGroups[group];
            if (groupAnswers.every(val => val === true)) {
                pasanganBenar++;
            }
        });

        // D. Waktu Pengerjaan (C4 Raw) -> durationMinutes sudah didapat di atas


        // --- STEP 3: SIMPAN HASIL MENTAH (Raw Data) ---
        await supabase.from('hasil_cbt').insert([{
            exam_id, attempt_id, user_uid, siswa_id: null,
            jumlah_benar: jumlahBenar,
            skor_kesulitan: skorKesulitan,
            pasangan_benar: pasanganBenar,
            waktu_menit: durationMinutes
        }]);


        // --- STEP 4: KONVERSI KE NILAI CRIPS (1-5) ---
        // 4a. C1 (Ketepatan)
        let c1_val = 1;
        const { data: refC1 } = await supabase.from('ketepatan_jawaban').select('*');
        if (refC1) {
            refC1.forEach(ref => {
                if (jumlahBenar >= ref.min_benar && jumlahBenar <= ref.max_benar) c1_val = ref.bobot;
            });
        }

        // 4b. C2 (Kesulitan)
        let c2_val = 1;
        const { data: refC2 } = await supabase.from('tingkat_kesulitan').select('*');
        if (refC2) {
            refC2.forEach(ref => {
                if (skorKesulitan >= ref.min_skor && skorKesulitan <= ref.max_skor) c2_val = ref.bobot;
            });
        }

        // 4c. C3 (Konsistensi)
        let c3_val = 0;
        const { data: refC3 } = await supabase.from('konsistensi_jawaban').select('*');
        if (refC3) {
            refC3.forEach(ref => {
                if (pasanganBenar >= ref.min_pasangan && pasanganBenar <= ref.max_pasangan) c3_val = ref.bobot;
            });
        }

        // 4d. C4 (Waktu - COST)
        let c4_val = 1;
        const { data: refC4 } = await supabase.from('waktu_pengerjaan').select('*');
        if (refC4) {
            refC4.forEach(ref => {
                if (durationMinutes >= ref.min_menit && durationMinutes <= ref.max_menit) c4_val = ref.bobot;
            });
        }


        // --- STEP 5: SIMPAN NILAI SAW (C1-C4) ---
        await supabase.from('nilai_saw').insert([{
            exam_id, attempt_id, user_uid, siswa_id: null,
            c1: c1_val,
            c2: c2_val,
            c3: c3_val,
            c4: c4_val
        }]);


        // --- STEP 6: HITUNG NILAI AKHIR & STATUS (RANKING) ---

        // Bobot Kriteria
        const W1 = 0.4;
        const W2 = 0.3;
        const W3 = 0.2;
        const W4 = 0.1;

        // Max Value Skala
        const MaxScale = 5;

        // Normalisasi & SAW Calculation
        const norm_c1 = c1_val / MaxScale;
        const norm_c2 = c2_val / MaxScale;
        const norm_c3 = c3_val / MaxScale;
        const norm_c4 = (c4_val === 0) ? 0 : (1 / c4_val); // Cost

        const nilai_preferensi = (norm_c1 * W1) + (norm_c2 * W2) + (norm_c3 * W3) + (norm_c4 * W4);

        // --- LOGIC BARU: Konversi & Status ---
        const nilaiKonversi = nilai_preferensi * 100; // Skala 0-100
        let statusLabel = '';

        if (nilaiKonversi >= 85) {
            statusLabel = 'Mutqin';      // 85 - 100
        } else if (nilaiKonversi >= 70) {
            statusLabel = 'Fasih';       // 70 - 84
        } else {
            statusLabel = 'Mujtahid';    // < 70
        }

        // Simpan ke Database
        await supabase.from('ranking_saw').insert([{
            exam_id, attempt_id, user_uid, siswa_id: null,
            nilai_preferensi: nilai_preferensi,
            nilai_konversi: nilaiKonversi,
            ranking: 0,
            status: statusLabel
        }]);

        return res.status(200).json({
            message: "Ujian Selesai",
            score_saw: nilai_preferensi,
            final_score: nilaiKonversi,
            status: statusLabel
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
}


// GET /api/student/exam/:exam_id/ranking
export const getExamRanking = async (req, res) => {
    const { exam_id } = req.params;

    try {
        // Ambil semua hasil ranking untuk exam tertentu
        const { data: rankings, error } = await supabase
            .from('ranking_saw')
            .select(`
                id,
                user_uid,
                nilai_preferensi,
                nilai_konversi,
                status,
                created_at,
                attempt_id,
                exam_attempts (
                    duration_minutes,
                    started_at,
                    finished_at
                )
            `)
            .eq('exam_id', exam_id)
            .order('nilai_konversi', { ascending: false });

        if (error) {
            throw error;
        }

        if (!rankings || rankings.length === 0) {
            return res.status(404).json({ message: 'Belum ada data ranking untuk exam ini' });
        }

        // Ambil detail user untuk setiap ranking
        const enrichedRankings = await Promise.all(
            rankings.map(async (ranking, index) => {
                // Get user role
                const { data: userData } = await supabase
                    .from('app_users')
                    .select('role')
                    .eq('uid', ranking.user_uid)
                    .single();

                let userDetails = null;

                // Get user details based on role
                if (userData) {
                    if (userData.role === 'siswa') {
                        const { data: siswaData } = await supabase
                            .from('siswa')
                            .select('nama, kelas, nis, image_url')
                            .eq('user_uid', ranking.user_uid)
                            .single();
                        userDetails = siswaData;
                    } else if (userData.role === 'teacher') {
                        const { data: teacherData } = await supabase
                            .from('teacher')
                            .select('nama, nip, image_url')
                            .eq('user_uid', ranking.user_uid)
                            .single();
                        userDetails = teacherData;
                    } else if (userData.role === 'admin') {
                        const { data: adminData } = await supabase
                            .from('admin')
                            .select('nama, image_url')
                            .eq('user_uid', ranking.user_uid)
                            .single();
                        userDetails = adminData;
                    }
                }

                return {
                    ranking: index + 1, // Ranking berdasarkan urutan (1, 2, 3, dst)
                    user_uid: ranking.user_uid,
                    nama: userDetails?.nama || 'Unknown',
                    kelas: userDetails?.kelas || null,
                    nis: userDetails?.nis || null,
                    image_url: userDetails?.image_url || null,
                    nilai_preferensi: ranking.nilai_preferensi,
                    nilai_konversi: ranking.nilai_konversi,
                    status: ranking.status,
                    duration_minutes: ranking.exam_attempts?.duration_minutes || 0,
                    finished_at: ranking.exam_attempts?.finished_at || null,
                    created_at: ranking.created_at
                };
            })
        );

        return res.status(200).json({
            message: 'Ranking berhasil diambil',
            exam_id: parseInt(exam_id),
            total_participants: enrichedRankings.length,
            rankings: enrichedRankings
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
}