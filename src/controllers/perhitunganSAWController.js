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


        // --- STEP 2: HITUNG RAW DATA (MENTAH) ---
        const { data: answers } = await supabase
            .from('student_answers')
            .select(`
                is_correct,
                auto_score,
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

        // B.2. Hitung Total Score dari auto_score
        const total_score = answers.reduce((sum, ans) => {
            return sum + (ans.auto_score || 0);
        }, 0);

        console.log(`Total Correct: ${jumlahBenar}, Total Score: ${total_score}, Skor Kesulitan: ${skorKesulitan}`);

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


        // --- STEP 2.5: UPDATE EXAM_ATTEMPTS WITH TOTALS ---
        await supabase
            .from('exam_attempts')
            .update({
                finished_at: finishTime.toISOString(),
                duration_minutes: durationMinutes,
                total_correct: jumlahBenar,
                total_score: total_score
            })
            .eq('id', attempt_id);

        console.log(`Updated exam_attempts: finished_at, duration_minutes=${durationMinutes}, total_correct=${jumlahBenar}, total_score=${total_score}`);


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

        // Simpan ke Database (WITHOUT static ranking)
        console.log('Inserting to ranking_saw:', {
            exam_id, attempt_id, user_uid, siswa_id: null,
            nilai_preferensi: nilai_preferensi,
            nilai_konversi: nilaiKonversi,
            status: statusLabel,
            ranking: 0
        });

        const { data: rankingInsertData, error: rankingInsertError } = await supabase
            .from('ranking_saw')
            .insert([{
                exam_id,
                attempt_id,
                user_uid,
                siswa_id: null,
                nilai_preferensi: nilai_preferensi,
                nilai_konversi: nilaiKonversi,
                status: statusLabel,
                ranking: 0 // Placeholder, calculated dynamically when querying
            }])
            .select();

        if (rankingInsertError) {
            console.error('ERROR inserting to ranking_saw:', rankingInsertError);
            throw rankingInsertError;
        }

        console.log('Successfully inserted to ranking_saw:', rankingInsertData);

        // Fetch detailed answers for display
        const { data: detailedAnswers } = await supabase
            .from('student_answers')
            .select(`
                id,
                is_correct,
                auto_score,
                selected_option_id,
                questions (
                    id,
                    question_text,
                    difficulty_level,
                    max_point,
                    pair_group,
                    question_options (
                        id,
                        option_text,
                        is_correct
                    )
                )
            `)
            .eq('attempt_id', attempt_id);

        return res.status(200).json({
            message: "Ujian Selesai",
            attempt_id: attempt_id,

            // Basic totals
            total_questions: totalSoal,
            total_correct: jumlahBenar,
            total_score: total_score,
            duration_minutes: durationMinutes,

            // Raw SAW data (C1-C4)
            raw_data: {
                jumlah_benar: jumlahBenar,
                skor_kesulitan: skorKesulitan,
                pasangan_benar: pasanganBenar,
                waktu_menit: durationMinutes
            },

            // SAW crips values (1-5)
            saw_values: {
                c1: c1_val,
                c2: c2_val,
                c3: c3_val,
                c4: c4_val
            },

            // Final SAW results
            saw_result: {
                nilai_preferensi: nilai_preferensi,
                nilai_konversi: nilaiKonversi,
                status: statusLabel
            },

            // Detailed answers
            answers: detailedAnswers
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
        console.log('=== GET EXAM RANKING REQUEST ===');
        console.log('exam_id:', exam_id);

        // Fetch all ranking data for this exam (without nested siswa/teacher/admin)
        const { data: rankingData, error } = await supabase
            .from('ranking_saw')
            .select('*')
            .eq('exam_id', exam_id)
            .order('nilai_konversi', { ascending: false }); // Sort by nilai_konversi DESC

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Fetched ranking data count:', rankingData?.length);

        if (!rankingData || rankingData.length === 0) {
            return res.status(200).json({
                message: 'Belum ada data ranking untuk ujian ini',
                rankings: []
            });
        }

        // Fetch user details for each ranking
        const rankedDataPromises = rankingData.map(async (item, index) => {
            let userName = 'Unknown';
            let userType = 'unknown';
            let userDetails = {};
            let email = null;

            // Get user role from app_users
            const { data: userData } = await supabase
                .from('app_users')
                .select('role, email')
                .eq('uid', item.user_uid)
                .single();

            if (userData) {
                email = userData.email;

                // Fetch details based on role
                if (userData.role === 'siswa') {
                    const { data: siswaData } = await supabase
                        .from('siswa')
                        .select('nama, nis, kelas')
                        .eq('user_uid', item.user_uid)
                        .single();

                    if (siswaData) {
                        userName = siswaData.nama;
                        userType = 'siswa';
                        userDetails = {
                            nis: siswaData.nis,
                            kelas: siswaData.kelas
                        };
                    }
                } else if (userData.role === 'teacher') {
                    const { data: teacherData } = await supabase
                        .from('teacher')
                        .select('nama, nip')
                        .eq('user_uid', item.user_uid)
                        .single();

                    if (teacherData) {
                        userName = teacherData.nama;
                        userType = 'teacher';
                        userDetails = {
                            nip: teacherData.nip
                        };
                    }
                } else if (userData.role === 'admin') {
                    const { data: adminData } = await supabase
                        .from('admin')
                        .select('nama')
                        .eq('user_uid', item.user_uid)
                        .single();

                    if (adminData) {
                        userName = adminData.nama;
                        userType = 'admin';
                    }
                }
            }

            // Calculate dynamic ranking
            let currentRank = index + 1;

            // Check if same score as previous
            if (index > 0 && rankingData[index - 1].nilai_konversi === item.nilai_konversi) {
                // Find the rank of previous item with same score
                currentRank = index; // Will be adjusted in post-processing
            }

            return {
                ranking: currentRank,
                user_uid: item.user_uid,
                user_name: userName,
                user_type: userType,
                user_details: userDetails,
                email: email,
                nilai_preferensi: item.nilai_preferensi,
                nilai_konversi: item.nilai_konversi,
                status: item.status,
                created_at: item.created_at,
                attempt_id: item.attempt_id
            };
        });

        const rankedData = await Promise.all(rankedDataPromises);

        // Fix ranking for tie scores
        let currentRank = 1;
        let previousScore = null;

        rankedData.forEach((item, index) => {
            if (previousScore === null || item.nilai_konversi < previousScore) {
                currentRank = index + 1;
            }
            item.ranking = currentRank;
            previousScore = item.nilai_konversi;
        });

        console.log(`Processed ${rankedData.length} ranking entries`);

        return res.status(200).json({
            message: 'Ranking data retrieved successfully',
            total_participants: rankedData.length,
            rankings: rankedData
        });

    } catch (err) {
        console.error('=== GET EXAM RANKING ERROR ===');
        console.error('Error:', err);
        return res.status(500).json({ error: err.message });
    }
};