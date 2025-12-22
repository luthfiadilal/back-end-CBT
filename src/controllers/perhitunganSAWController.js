import supabase from '../config/supabase.js';


// POST /api/student/exam/finish
export const finishExam = async (req, res) => {
    const { attempt_id, user_uid, exam_id } = req.body;
    const finishTime = new Date();

    try {
        // --- STEP 1: AMBIL DATA ATTEMPT & JAWABAN ---
        // Kita butuh data waktu mulai untuk hitung durasi
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

        // Ambil semua jawaban siswa join dengan pertanyaan untuk tahu difficulty & pair group
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
        const totalSoal = answers.length; // Asumsi siswa jawab semua
        const persentaseBenar = (jumlahBenar / totalSoal) * 100;

        // B. Hitung Total Skor Kesulitan (C2 Raw)
        // Hanya jumlahkan difficulty_level jika jawabannya BENAR
        const skorKesulitan = answers.reduce((sum, ans) => {
            return ans.is_correct ? sum + (ans.questions.difficulty_level || 0) : sum;
        }, 0);

        // C. Hitung Konsistensi (C3 Raw)
        // Kelompokkan jawaban berdasarkan pair_group
        const pairGroups = {};
        answers.forEach(ans => {
            const group = ans.questions.pair_group;
            if (group) { // Jika soal ini masuk grup konsistensi
                if (!pairGroups[group]) pairGroups[group] = [];
                pairGroups[group].push(ans.is_correct);
            }
        });

        // Hitung berapa grup yang "Full Benar"
        let pasanganBenar = 0;
        Object.keys(pairGroups).forEach(group => {
            const groupAnswers = pairGroups[group];
            // Jika semua jawaban dalam grup ini true, maka konsisten benar
            if (groupAnswers.every(val => val === true)) {
                pasanganBenar++;
            }
        });

        // D. Waktu Pengerjaan (C4 Raw) -> durationMinutes


        // --- STEP 3: SIMPAN HASIL MENTAH (Raw Data) ---
        await supabase.from('hasil_cbt').insert([{
            exam_id, attempt_id, user_uid, siswa_id: null, // Isi siswa_id jika ada relasi
            jumlah_benar: jumlahBenar,
            skor_kesulitan: skorKesulitan,
            pasangan_benar: pasanganBenar,
            waktu_menit: durationMinutes
        }]);


        // --- STEP 4: KONVERSI KE NILAI CRIPS (1-5) ---
        // Logic ini mencocokkan nilai mentah ke range tabel referensi

        // 4a. C1 (Ketepatan)
        // Query tabel ketepatan_jawaban untuk cari range
        // Contoh logic manual (Sebaiknya query DB, tapi ini simulasi logic)
        // Anda bisa buat helper function untuk fetch range dari DB
        let c1_val = 1;
        // Misal fetch dari DB: Select * from ketepatan_jawaban
        // Loop result, if (jumlahBenar >= row.min_benar && jumlahBenar <= row.max_benar) c1_val = row.bobot
        // DISINI SAYA HARDCODE CONTOH LOGICNYA (Ganti dengan Query DB Real)
        const { data: refC1 } = await supabase.from('ketepatan_jawaban').select('*');
        refC1.forEach(ref => {
            if (jumlahBenar >= ref.min_benar && jumlahBenar <= ref.max_benar) c1_val = ref.bobot;
        });

        // 4b. C2 (Kesulitan)
        let c2_val = 1;
        const { data: refC2 } = await supabase.from('tingkat_kesulitan').select('*');
        refC2.forEach(ref => {
            if (skorKesulitan >= ref.min_skor && skorKesulitan <= ref.max_skor) c2_val = ref.bobot;
        });

        // 4c. C3 (Konsistensi)
        let c3_val = 0; // Default 0 jika tidak konsisten
        const { data: refC3 } = await supabase.from('konsistensi_jawaban').select('*');
        refC3.forEach(ref => {
            if (pasanganBenar >= ref.min_pasangan && pasanganBenar <= ref.max_pasangan) c3_val = ref.bobot;
        });

        // 4d. C4 (Waktu - COST)
        let c4_val = 1;
        const { data: refC4 } = await supabase.from('waktu_pengerjaan').select('*');
        refC4.forEach(ref => {
            if (durationMinutes >= ref.min_menit && durationMinutes <= ref.max_menit) c4_val = ref.bobot;
        });


        // --- STEP 5: SIMPAN NILAI SAW (C1-C4) ---
        await supabase.from('nilai_saw').insert([{
            exam_id, attempt_id, user_uid, siswa_id: null,
            c1: c1_val,
            c2: c2_val,
            c3: c3_val,
            c4: c4_val
        }]);

        // --- STEP 6: HITUNG NILAI AKHIR (RANKING) ---
        // SAW Formula:
        // Nilai Akhir = (C1/MaxC1 * W1) + (C2/MaxC2 * W2) + (C3/MaxC3 * W3) + (MinC4/C4 * W4)
        // Karena normalisasi biasanya butuh data SELURUH siswa, 
        // untuk Realtime CBT biasanya kita pakai "Fixed Normalization" (Max Nilai Kriteria)

        // Bobot Kriteria (Dari tabel Kriteria)
        // C1: 0.4, C2: 0.3, C3: 0.2, C4: 0.1
        const W1 = 0.4;
        const W2 = 0.3;
        const W3 = 0.2;
        const W4 = 0.1;

        // Max Value (Biasanya 5 karena skala 1-5)
        const MaxScale = 5;

        // Normalisasi
        const norm_c1 = c1_val / MaxScale; // Benefit
        const norm_c2 = c2_val / MaxScale; // Benefit
        const norm_c3 = c3_val / MaxScale; // Benefit
        const norm_c4 = (c4_val === 0) ? 0 : (1 / c4_val); // Cost (Min/Val). 
        // *Catatan COST:* Rumus Cost SAW biasanya (Min_Value_Data / Current_Value).
        // Jika pakai skala 1-5, dan nilai terbaik (paling cepat) adalah bobot 1 (Sangat Cepat), 
        // Maka logic tabel Anda terbalik untuk Cost. 
        // Di tabel Anda: Sangat Cepat = Bobot 1, Sangat Lama = Bobot 5.
        // Untuk COST, makin kecil nilainya makin bagus. 
        // Jadi normalisasinya: MinScale (1) / c4_val. 

        const nilai_preferensi = (norm_c1 * W1) + (norm_c2 * W2) + (norm_c3 * W3) + ((1 / c4_val) * W4); // Contoh Cost logic

        // Simpan Ranking / Skor Akhir
        await supabase.from('ranking_saw').insert([{
            exam_id, attempt_id, user_uid, siswa_id: null,
            nilai_preferensi: nilai_preferensi,
            nilai_konversi: nilai_preferensi * 100, // Skala 100
            ranking: 0, // Nanti diupdate batch job atau trigger
            status: nilai_preferensi > 0.7 ? 'Lulus' : 'Remedial' // Contoh logic kelulusan
        }]);

        return res.status(200).json({
            message: "Ujian Selesai",
            score: nilai_preferensi
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
}