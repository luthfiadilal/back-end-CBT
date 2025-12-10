import supabase from '../config/supabase.js';

/**
 * Get all users excluding the current user
 * Joins app_users with admin, teacher, and siswa tables to get details
 */
export const getAllUsers = async (req, res) => {
    try {
        const currentUserId = req.user.id;

        // Using a raw query to join tables since Supabase JS client doesn't support complex joins easily
        // and the request text implied using the SQL structure provided.
        // However, Supabase JS client is usually used for simple CRUD on views or tables.
        // Since we have a 'full.sql' schema, I'll assume we can use .rpc() if a function exists, 
        // OR construct a query by fetching app_users and then fetching details.
        // BUT, given the complexity and no RPC mentioned, I'll fetch app_users and then map details 
        // manually or use foreign key relations if defined in Supabase.

        // Let's try to fetch app_users first and then join details.
        // Since I can't easily do a POLYMORPHIC join (one user is admin OR teacher OR siswa) with standard Supabase select easily in one go without a View.
        // I'll fetch all users from app_users, filter them, and then for each user, fetch their profile.
        // This is not the most efficient SQL way (N+1 problem), but safe for a quick implementation without altering DB schema with new Views.

        // BETTER APPROACH:
        // The user said "use API in back_end", and provided "full.sql".
        // A common pattern in Supabase is to have a view or just fetch parallel.

        // Let's fetch all app_users first (except current).
        const { data: users, error: usersError } = await supabase
            .from('app_users')
            .select('uid, email, role')
            .neq('uid', currentUserId);

        if (usersError) throw usersError;

        // Get all profiles from respective tables
        // We can do this safely by fetching all rows from each table and mapping in memory
        // if the user count is not huge. 
        // For production with millions of users this is bad. But for CBT app likely fine.

        const { data: admins } = await supabase.from('admin').select('user_uid, nama');
        const { data: teachers } = await supabase.from('teacher').select('user_uid, nama');
        const { data: students } = await supabase.from('siswa').select('user_uid, nama');

        const adminMap = new Map(admins?.map(a => [a.user_uid, a.nama]));
        const teacherMap = new Map(teachers?.map(t => [t.user_uid, t.nama]));
        const studentMap = new Map(students?.map(s => [s.user_uid, s.nama]));

        const results = users.map(user => {
            let nama = 'Unknown';
            if (user.role === 'admin') nama = adminMap.get(user.uid);
            else if (user.role === 'teacher') nama = teacherMap.get(user.uid);
            else if (user.role === 'siswa') nama = studentMap.get(user.uid);

            return {
                uid: user.uid,
                email: user.email,
                role: user.role,
                nama: nama || 'N/A' // Fallback if profile missing
            };
        });

        res.status(200).json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
};

/**
 * Create new user (Admin only)
 * POST /cbt/users
 */
export const createUser = async (req, res) => {
    try {
        const { role, nama, email, password, nis, tanggal_lahir, kelas, alamat, nip } = req.body;
        // Image upload is handled separately or can be added if needed, but keeping simple for now as per "form dynamic" request usually implies text fields first. 
        // If image is needed, we can add it, but usually admin creating user might skip image or upload later. 
        // The auth controller handles image, let's include image handling if we can, 
        // but to keep it simple and less error prone for this specifical request "form dinamis", I'll focus on the role fields first.
        // Actually, looking at authController, it handles base64 image. I'll include it for completeness.
        const { image } = req.body;

        // Validate role
        if (!role || !['siswa', 'teacher', 'admin'].includes(role)) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Valid role is required (siswa, teacher, or admin)'
            });
        }

        // Validate common required fields
        if (!nama || !email || !password) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Nama, email, and password are required'
            });
        }

        // Role-specific validation
        if (role === 'siswa' && (!nis || !tanggal_lahir || !kelas || !alamat)) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'NIS, tanggal lahir, kelas, and alamat are required for siswa'
            });
        }

        if (role === 'teacher' && !nip) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'NIP is required for teacher'
            });
        }

        // Check if email already exists in app_users (Supabase might throw too, but good to check)
        const { data: existingEmail } = await supabase
            .from('app_users')
            .select('email')
            .eq('email', email)
            .single();

        if (existingEmail) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Email already registered'
            });
        }

        // Create user in Supabase Auth
        // Note: When admin creates a user, we might want to auto-confirm or not send email. 
        // For simplicity, we use the same flow.
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { role: role } // Optional metadata
            }
        });

        if (authError || !authData.user) {
            throw new Error(`Auth error: ${authError.message}`);
        }

        const userId = authData.user.id;

        try {
            // Upload image if provided (Logic from authController)
            let imageUrl = null;
            if (image && typeof image === 'string' && image.startsWith('data:')) {
                const base64Data = image.split(',')[1];
                const imageBuffer = Buffer.from(base64Data, 'base64');
                const extension = image.split(';')[0].split('/')[1];
                const imageName = `${userId}-${Date.now()}.${extension}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from(role)
                    .upload(imageName, imageBuffer, {
                        contentType: `image/${imageName.split('.').pop()}`,
                        upsert: true
                    });

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from(role)
                        .getPublicUrl(imageName);
                    imageUrl = publicUrl;
                }
            }

            // Insert into app_users table
            const { error: appUserError } = await supabase
                .from('app_users')
                .insert({
                    uid: userId,
                    role: role,
                    email: email
                });

            if (appUserError) throw new Error(`App user creation error: ${appUserError.message}`);

            // Insert into role-specific table
            let profileError;

            switch (role) {
                case 'siswa':
                    const { error: siswaError } = await supabase
                        .from('siswa')
                        .insert({
                            user_uid: userId,
                            nama,
                            tanggal_lahir,
                            alamat,
                            kelas,
                            nis,
                            email,
                            image_url: imageUrl
                        });
                    profileError = siswaError;
                    break;

                case 'teacher':
                    const { error: teacherError } = await supabase
                        .from('teacher')
                        .insert({
                            user_uid: userId,
                            nama,
                            nip,
                            email,
                            image_url: imageUrl
                        });
                    profileError = teacherError;
                    break;

                case 'admin':
                    const { error: adminError } = await supabase
                        .from('admin')
                        .insert({
                            user_uid: userId,
                            nama,
                            email,
                            image_url: imageUrl
                        });
                    profileError = adminError;
                    break;
            }

            if (profileError) throw new Error(`${role} creation error: ${profileError.message}`);

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: {
                    user: { id: userId, email, role }
                }
            });

        } catch (dbError) {
            // Rollback auth user
            await supabase.auth.admin.deleteUser(userId);
            throw dbError;
        }

    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
};
