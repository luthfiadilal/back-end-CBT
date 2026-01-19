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

        // B.2. Hitung Total Score dengan mempertimbangkan pair_group
        // LOGIC: Jika 2 soal dalam pair_group sama-sama benar, hitung hanya 1 poin (bukan 2)

        // Kelompokkan jawaban berdasarkan pair_group
        const pairGroupScores = {};
        const nonPairAnswers = [];

        answers.forEach(ans => {
            const pairGroup = ans.questions.pair_group;

            if (pairGroup) {
                // Soal memiliki pair_group
                if (!pairGroupScores[pairGroup]) {
                    pairGroupScores[pairGroup] = {
                        answers: [],
                        totalScore: 0
                    };
                }
                pairGroupScores[pairGroup].answers.push(ans);
            } else {
                // Soal tidak memiliki pair_group
                nonPairAnswers.push(ans);
            }
        });

        // Hitung score dari soal non-pair (normal scoring)
        let total_score = nonPairAnswers.reduce((sum, ans) => {
            return sum + (ans.auto_score || 0);
        }, 0);

        // Hitung score dari pair_group
        // Jika SEMUA soal dalam pair benar → dapat 1 poin
        // Jika ada yang salah → dapat 0 poin
        Object.keys(pairGroupScores).forEach(groupKey => {
            const group = pairGroupScores[groupKey];
            const allCorrect = group.answers.every(ans => ans.is_correct);

            if (allCorrect) {
                // Semua soal dalam pair benar → tambah 1 poin saja
                total_score += 1;
                console.log(`Pair group ${groupKey}: All correct → +1 point`);
            } else {
                // Ada yang salah → 0 poin
                console.log(`Pair group ${groupKey}: Not all correct → +0 point`);
            }
        });

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

// GET /api/student/exam/all-detail
export const getAllDetail = async (req, res) => {
    try {
        console.log("=== GET ALL DETAIL REQUEST ===");
        const { exam_id, kelas, user_uid } = req.query;
        console.log("FiltersInput:", { exam_id, kelas, user_uid });

        // 1. Filter User UIDs based on Class (if provided)
        let classUserUids = null;
        if (kelas) {
            const { data: siswaData, error: siswaError } = await supabase
                .from('siswa')
                .select('user_uid')
                .ilike('kelas', `%${kelas}%`);

            if (siswaError) {
                console.error("Error fetching siswa by class:", siswaError);
                throw siswaError;
            }

            if (siswaData) {
                classUserUids = siswaData.map(s => s.user_uid);
                // If class provided but no students found, we can return empty early
                if (classUserUids.length === 0) {
                    console.log("No students found for class:", kelas);
                    return res.status(200).json({
                        message: "Data not found for the specified class",
                        data: []
                    });
                }
            }
        }

        // DEBUG: Check if specific user_uid matches the class filter
        if (user_uid && classUserUids) {
            const isUserInClass = classUserUids.includes(user_uid);
            if (!isUserInClass) {
                console.warn(`[DEBUG] CONFLICT: User ${user_uid} was not found in class filters for "${kelas}". Result will be empty.`);
            } else {
                console.log(`[DEBUG] User ${user_uid} confirmed in class "${kelas}".`);
            }
        }

        // 2. Build Query on ranking_saw (Central Table)
        let query = supabase
            .from('ranking_saw')
            .select(`
                *,
                exams!inner (
                    *
                ),
                exam_attempts (
                    *,
                    hasil_cbt (*),
                    nilai_saw (*)
                )
            `);

        // Apply Exam ID Filter
        if (exam_id) {
            query = query.eq('exam_id', exam_id);
        }

        // Apply User/Student ID Filter
        if (user_uid) {
            query = query.eq('user_uid', user_uid);
        }

        // Apply Class Filter (via User UIDs)
        if (classUserUids !== null) {
            query = query.in('user_uid', classUserUids);
        }

        // Execute Query
        const { data: rankingData, error: rankingError } = await query;

        if (rankingError) {
            console.error("Error query ranking_saw:", rankingError);
            throw rankingError;
        }

        if (!rankingData || rankingData.length === 0) {
            console.log("No matching data found in ranking_saw table.");
            return res.status(200).json({
                message: "No data found matching criteria",
                data: []
            });
        }

        console.log(`Found ${rankingData.length} records. Fetching student details...`);

        // 3. Enrich with Student Details (Siswa)
        const userUidsToCheck = [...new Set(rankingData.map(r => r.user_uid))];

        let siswaMap = {};
        if (userUidsToCheck.length > 0) {
            const { data: allSiswa, error: userError } = await supabase
                .from('siswa')
                .select('*')
                .in('user_uid', userUidsToCheck);

            if (userError) {
                console.error("Error fetching student details:", userError);
                // Continue without student details
            } else if (allSiswa) {
                allSiswa.forEach(s => {
                    siswaMap[s.user_uid] = s;
                });
            }
        }

        // 4. Format the Final Response
        const detailedResponse = rankingData.map(item => {
            const siswaInfo = siswaMap[item.user_uid] || null;

            // Handle exam_attempts structure (Supabase might return single object or array)
            // Ideally explicit relationship: ranking_saw.attempt_id -> exam_attempts.id is One-to-One
            // Accessing item.exam_attempts
            let attempt = item.exam_attempts;
            if (Array.isArray(attempt)) attempt = attempt[0]; // Access first if array

            // Nested relations in attempt
            let hasilCbt = attempt?.hasil_cbt;
            if (Array.isArray(hasilCbt)) hasilCbt = hasilCbt[0];

            let nilaiSaw = attempt?.nilai_saw;
            if (Array.isArray(nilaiSaw)) nilaiSaw = nilaiSaw[0];

            // Clean up attempt object for display
            let cleanAttempt = { ...attempt };
            delete cleanAttempt.hasil_cbt;
            delete cleanAttempt.nilai_saw;

            return {
                ranking_id: item.id,
                exam_title: item.exams?.title,
                student_name: siswaInfo?.nama || 'Unknown',
                student_class: siswaInfo?.kelas || 'Unknown',

                // Detailed objects
                siswa: siswaInfo,
                exam: item.exams,
                ranking_saw: {
                    id: item.id,
                    nilai_preferensi: item.nilai_preferensi,
                    nilai_konversi: item.nilai_konversi,
                    status: item.status,
                    ranking: item.ranking,
                    created_at: item.created_at
                },
                exam_attempt: cleanAttempt,
                hasil_cbt: hasilCbt || null,
                nilai_saw: nilaiSaw || null
            };
        });

        console.log("Successfully formatted response. Sending JSON.");

        return res.status(200).json({
            message: "Get All Detail Success",
            total_count: detailedResponse.length,
            data: detailedResponse
        });

    } catch (err) {
        console.error("=== CONTROLLER ERROR: getAllDetail ===");
        console.error(err);
        return res.status(500).json({
            error: "Internal Server Error",
            message: err.message,
            details: err
        });
    }
};

// DELETE /api/student/exam/delete-result
export const deleteOneOrAllResultCBT = async (req, res) => {
    try {
        console.log("=== DELETE ONE OR ALL RESULT CBT REQUEST ===");
        const { exam_id, kelas, user_uid } = req.query;
        console.log("Delete Filters:", { exam_id, kelas, user_uid });

        // 0. Validasi Input
        if (!exam_id && !kelas && !user_uid) {
            return res.status(400).json({
                message: "Minimal satu filter (exam_id, kelas, atau user_uid) harus disertakan untuk penghapusan."
            });
        }

        // 1. Filter User UIDs based on Class (if provided)
        let classUserUids = null;
        if (kelas) {
            const { data: siswaData, error: siswaError } = await supabase
                .from('siswa')
                .select('user_uid')
                .ilike('kelas', `%${kelas}%`);

            if (siswaError) {
                console.error("Error fetching siswa by class:", siswaError);
                throw siswaError;
            }

            if (siswaData) {
                classUserUids = siswaData.map(s => s.user_uid);
                if (classUserUids.length === 0) {
                    return res.status(200).json({
                        message: "Tidak ada siswa ditemukan di kelas tersebut, tidak ada yang dihapus.",
                        deleted_count: 0
                    });
                }
            }
        }

        // 2. Cari Exam Attempts yang akan dihapus berdasarkan filter
        let query = supabase
            .from('exam_attempts')
            .select('id');

        // Apply Exam ID Filter
        if (exam_id) query = query.eq('exam_id', exam_id);

        // Apply User/Student ID Filter
        if (user_uid) query = query.eq('user_uid', user_uid);

        // Apply Class Filter (via User UIDs)
        if (classUserUids !== null) query = query.in('user_uid', classUserUids);

        const { data: attemptsToDelete, error: attemptError } = await query;

        if (attemptError) throw attemptError;

        if (!attemptsToDelete || attemptsToDelete.length === 0) {
            return res.status(200).json({
                message: "Tidak ada data ujian yang cocok untuk dihapus.",
                deleted_count: 0
            });
        }

        const attemptIds = attemptsToDelete.map(a => a.id);
        console.log(`Found ${attemptIds.length} attempts to delete. IDs:`, attemptIds);

        // 3. Lakukan Penghapusan Berurutan (Sequential Deletion)
        // NOTE: student_answers akan otomatis terhapus karena ON DELETE CASCADE
        // URUTAN: hasil_cbt -> nilai_saw -> ranking_saw -> exam_attempts (CASCADE -> student_answers)

        // A. Hapus hasil_cbt
        console.log('Deleting hasil_cbt for attempt_ids:', attemptIds);
        const { data: deleted1, error: err1 } = await supabase
            .from('hasil_cbt')
            .delete()
            .in('attempt_id', attemptIds)
            .select();
        if (err1) throw new Error(`Gagal menghapus hasil_cbt: ${err1.message}`);
        console.log(`Deleted ${deleted1?.length || 0} hasil_cbt records`);

        // B. Hapus nilai_saw
        console.log('Deleting nilai_saw for attempt_ids:', attemptIds);
        const { data: deleted2, error: err2 } = await supabase
            .from('nilai_saw')
            .delete()
            .in('attempt_id', attemptIds)
            .select();
        if (err2) throw new Error(`Gagal menghapus nilai_saw: ${err2.message}`);
        console.log(`Deleted ${deleted2?.length || 0} nilai_saw records`);

        // C. Hapus ranking_saw
        console.log('Deleting ranking_saw for attempt_ids:', attemptIds);
        const { data: deleted3, error: err3 } = await supabase
            .from('ranking_saw')
            .delete()
            .in('attempt_id', attemptIds)
            .select();
        if (err3) throw new Error(`Gagal menghapus ranking_saw: ${err3.message}`);
        console.log(`Deleted ${deleted3?.length || 0} ranking_saw records`);

        // D. Hapus exam_attempts (CASCADE akan otomatis hapus student_answers)
        console.log('Deleting exam_attempts with ids:', attemptIds);
        console.log('(student_answers will be auto-deleted by CASCADE)');
        const { data: deleted4, error: err4 } = await supabase
            .from('exam_attempts')
            .delete()
            .in('id', attemptIds)
            .select();
        if (err4) throw new Error(`Gagal menghapus exam_attempts: ${err4.message}`);
        console.log(`Deleted ${deleted4?.length || 0} exam_attempts records`);

        console.log("Deletion sequence completed successfully.");

        return res.status(200).json({
            message: "Data ujian berhasil dihapus.",
            deleted_attempts_count: attemptIds.length,
            deleted_ids: attemptIds
        });

    } catch (err) {
        console.error("=== CONTROLLER ERROR: deleteOneOrAllResultCBT ===");
        console.error(err);
        return res.status(500).json({
            error: "Internal Server Error",
            message: err.message,
            details: err
        });
    }
};