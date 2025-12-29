import { createClient } from '@supabase/supabase-js';
import supabase, { supabaseUrl, supabaseAnonKey } from '../config/supabase.js';
import { generateToken } from '../utils/authUtils.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Register new user (all roles: siswa, teacher, admin)
 * POST /cbt/register
 */
export const register = async (req, res) => {
    try {
        const { role, nama, email, password, tanggal_lahir, kelas, alamat, image } = req.body;

        // Validate role
        if (!role || !['siswa', 'teacher', 'admin'].includes(role)) {
            console.log('❌ Registration failed - Invalid or missing role');
            return res.status(400).json({
                error: 'Validation error',
                message: 'Valid role is required (siswa, teacher, or admin)'
            });
        }

        // Validate common required fields
        if (!nama || !email || !password) {
            console.log('❌ Registration validation failed - missing required fields');
            return res.status(400).json({
                error: 'Validation error',
                message: 'Nama, email, and password are required'
            });
        }

        // Role-specific validation
        if (role === 'siswa' && (!tanggal_lahir || !kelas || !alamat)) {
            console.log('❌ Registration failed - Missing siswa fields');
            return res.status(400).json({
                error: 'Validation error',
                message: 'Tanggal lahir, kelas, and alamat are required for siswa'
            });
        }

        // Check if email already exists
        const { data: existingEmail } = await supabase
            .from('app_users')
            .select('email')
            .eq('email', email)
            .single();

        if (existingEmail) {
            console.log('❌ Registration failed - Email already exists:', email);
            return res.status(400).json({
                error: 'Validation error',
                message: 'Email already registered'
            });
        }

        // Create user in Supabase Auth
        console.log('📝 Creating user with Supabase Auth...');
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (authError || !authData.user) {
            console.error('❌ Supabase Auth error:', authError);
            throw new Error(`Auth error: ${authError.message}`);
        }

        const userId = authData.user.id;
        console.log('✅ User created in Supabase Auth with ID:', userId);

        try {
            // Upload image if provided
            let imageUrl = null;
            if (image) {
                console.log('📸 Uploading profile image...');

                // Convert base64 to buffer if needed
                let imageBuffer;
                let imageName;

                if (typeof image === 'string' && image.startsWith('data:')) {
                    // Base64 image
                    const base64Data = image.split(',')[1];
                    imageBuffer = Buffer.from(base64Data, 'base64');
                    const extension = image.split(';')[0].split('/')[1];
                    imageName = `${userId}-${Date.now()}.${extension}`;
                } else {
                    console.log('❌ Invalid image format');
                    throw new Error('Image must be in base64 format');
                }

                // Upload to role-specific bucket
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from(role) // bucket name: siswa, teacher, or admin
                    .upload(imageName, imageBuffer, {
                        contentType: `image/${imageName.split('.').pop()}`,
                        upsert: true
                    });

                if (uploadError) {
                    console.error('❌ Image upload error:', uploadError);
                    throw new Error(`Image upload error: ${uploadError.message}`);
                }

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from(role)
                    .getPublicUrl(imageName);

                imageUrl = publicUrl;
                console.log('✅ Image uploaded:', imageUrl);
            }

            // Insert into app_users table
            const { error: appUserError } = await supabase
                .from('app_users')
                .insert({
                    uid: userId,
                    role: role,
                    email: email
                });

            if (appUserError) {
                console.error('❌ Error creating app_users:', appUserError);
                throw new Error(`App user creation error: ${appUserError.message}`);
            }
            console.log('✅ Created app_users record');

            // Insert into role-specific table
            let profileData;
            let profileError;

            switch (role) {
                case 'siswa':
                    const { data: siswaData, error: siswaError } = await supabase
                        .from('siswa')
                        .insert({
                            user_uid: userId,
                            nama,
                            tanggal_lahir,
                            alamat,
                            kelas,
                            email,
                            image_url: imageUrl
                        })
                        .select()
                        .single();
                    profileData = siswaData;
                    profileError = siswaError;
                    break;

                case 'teacher':
                    const { data: teacherData, error: teacherError } = await supabase
                        .from('teacher')
                        .insert({
                            user_uid: userId,
                            nama,
                            email,
                            image_url: imageUrl
                        })
                        .select()
                        .single();
                    profileData = teacherData;
                    profileError = teacherError;
                    break;

                case 'admin':
                    const { data: adminData, error: adminError } = await supabase
                        .from('admin')
                        .insert({
                            user_uid: userId,
                            nama,
                            email,
                            image_url: imageUrl
                        })
                        .select()
                        .single();
                    profileData = adminData;
                    profileError = adminError;
                    break;
            }

            if (profileError) {
                console.error(`❌ Error creating ${role} record:`, profileError);
                throw new Error(`${role} creation error: ${profileError.message}`);
            }
            console.log(`✅ Created ${role} record`);

            // Generate JWT token
            const token = generateToken(userId, email, role);

            console.log('✅ Registration successful for:', email);

            // Build response based on role
            const responseProfile = {
                id: profileData.id,
                nama: profileData.nama,
                email: profileData.email,
                image_url: profileData.image_url
            };

            if (role === 'siswa') {
                responseProfile.kelas = profileData.kelas;
                responseProfile.tanggal_lahir = profileData.tanggal_lahir;
                responseProfile.alamat = profileData.alamat;
            }

            res.status(201).json({
                success: true,
                message: 'Registration successful',
                data: {
                    user: {
                        id: userId,
                        email,
                        role
                    },
                    profile: responseProfile,
                    token: authData.session?.access_token,
                    refresh_token: authData.session?.refresh_token
                }
            });

        } catch (dbError) {
            // Rollback
            try {
                await supabase.auth.admin.deleteUser(userId);
                console.log('🔄 Rolled back user creation');
            } catch (rollbackError) {
                console.error('Rollback error:', rollbackError);
            }
            throw dbError;
        }

    } catch (error) {
        console.error('=== REGISTRATION ERROR ===');
        console.error('Error Message:', error.message);
        console.error('========================');

        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Registration failed'
        });
    }
};

/**
 * Login user (all roles)
 * POST /cbt/login
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate
        if (!email || !password) {
            console.log('❌ Login validation failed - missing credentials');
            return res.status(400).json({
                error: 'Validation error',
                message: 'Email and password are required'
            });
        }

        // Authenticate with Supabase Auth
        console.log('🔐 Authenticating with Supabase Auth:', email);
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError || !authData.user) {
            console.log('❌ Supabase Auth failed:', authError?.message);
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid email or password'
            });
        }

        const userId = authData.user.id;
        console.log('✅ User authenticated via Supabase Auth');

        // Get role from app_users
        const { data: appUser, error: userError } = await supabase
            .from('app_users')
            .select('uid, role, email')
            .eq('uid', userId)
            .single();

        if (userError || !appUser) {
            console.log('❌ User not found in app_users:', userId);
            return res.status(404).json({
                error: 'User not found',
                message: 'User profile not found'
            });
        }

        console.log('✅ User role:', appUser.role);

        // Get profile based on role
        let profile = null;

        switch (appUser.role) {
            case 'siswa':
                const { data: siswaProfile } = await supabase
                    .from('siswa')
                    .select('id, nama, email, nis, kelas, tanggal_lahir, alamat, image_url')
                    .eq('user_uid', userId)
                    .single();
                profile = siswaProfile;
                break;

            case 'teacher':
                const { data: teacherProfile } = await supabase
                    .from('teacher')
                    .select('id, nama, email, nip, image_url')
                    .eq('user_uid', userId)
                    .single();
                profile = teacherProfile;
                break;

            case 'admin':
                const { data: adminProfile } = await supabase
                    .from('admin')
                    .select('id, nama, email, image_url')
                    .eq('user_uid', userId)
                    .single();
                profile = adminProfile;
                break;

            default:
                console.log('❌ Login failed - Invalid role for user:', userId);
                return res.status(400).json({
                    error: 'Invalid role',
                    message: 'User has invalid role'
                });
        }

        if (!profile) {
            console.error('❌ Profile not found for user:', userId);
            return res.status(404).json({
                error: 'Profile not found',
                message: `${appUser.role} profile not found`
            });
        }

        console.log('✅ Profile loaded for:', profile.nama);

        // Generate JWT token
        const token = generateToken(userId, email, appUser.role);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: userId,
                    email,
                    role: appUser.role
                },
                profile: {
                    id: profile.id,
                    nama: profile.nama,
                    email: profile.email,
                    image_url: profile.image_url,
                    ...(appUser.role === 'siswa' && { nis: profile.nis, kelas: profile.kelas }),
                    ...(appUser.role === 'teacher' && { nip: profile.nip })
                },
                token: authData.session?.access_token,
                refresh_token: authData.session?.refresh_token
            }
        });
        console.log('✅ Login response sent for:', email);

    } catch (error) {
        console.error('=== LOGIN ERROR ===');
        console.error('Error Message:', error.message);
        console.error('===================');

        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Login failed'
        });
    }
};

/**
 * Refresh Access Token
 * POST /cbt/refresh-token
 */
export const refreshToken = async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Refresh token is required'
            });
        }

        // Verify session with Supabase
        const { data, error } = await supabase.auth.refreshSession({ refresh_token });

        if (error || !data.session) {
            console.error('RefreshToken Error:', error?.message);
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired refresh token'
            });
        }

        const user = data.user;

        // Fetch user role from our DB to generate custom JWT
        const { data: appUser, error: userError } = await supabase
            .from('app_users')
            .select('role')
            .eq('uid', user.id)
            .single();

        if (userError || !appUser) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User role not found'
            });
        }

        // Generate new Custom JWT
        const newAccessToken = generateToken(user.id, user.email, appUser.role);

        res.status(200).json({
            success: true,
            data: {
                token: data.session.access_token,
                refresh_token: data.session.refresh_token // Supabase might rotate it
            }
        });

    } catch (error) {
        console.error('RefreshToken System Error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
};

/**
 * Logout user
 * POST /cbt/logout
 */
export const logout = async (req, res) => {
    try {
        const { refresh_token } = req.body;
        if (refresh_token) {
            await supabase.auth.signOut(refresh_token);
        }

        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
        console.log('✅ Logout successful');
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Logout failed'
        });
    }
};

/**
 * Update user profile
 * PUT /cbt/profile
 */
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { nama, nis, tanggal_lahir, kelas, alamat, nip } = req.body;
        const file = req.file;

        console.log(`📝 Updating profile for user: ${userId}, Role: ${userRole}`);

        // Create a user-scoped Supabase client using the token from the request
        const token = req.headers.authorization.split(' ')[1];
        const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        });

        let imageUrl = null;

        // 1. Handle Image Upload
        if (file) {
            console.log('📸 Processing new profile image for upload...');

            const extension = file.mimetype.split('/')[1];
            const filename = `${userId}-${Date.now()}.${extension}`;

            // Use scoped client for storage upload
            const { data: uploadData, error: uploadError } = await userSupabase.storage
                .from(userRole)
                .upload(filename, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true
                });

            if (uploadError) {
                console.error('❌ Image upload error:', uploadError);
                throw new Error(`Image upload failed: ${uploadError.message}`);
            }

            const { data: { publicUrl } } = userSupabase.storage
                .from(userRole)
                .getPublicUrl(filename);

            imageUrl = publicUrl;
            console.log('✅ New image uploaded:', imageUrl);
        }

        // 2. Prepare update data
        const updateData = {};
        if (nama) updateData.nama = nama;
        if (imageUrl) updateData.image_url = imageUrl;

        // Role specific fields
        if (userRole === 'siswa') {
            if (nis) updateData.nis = nis;
            if (tanggal_lahir) updateData.tanggal_lahir = tanggal_lahir;
            if (kelas) updateData.kelas = kelas;
            if (alamat) updateData.alamat = alamat;
        } else if (userRole === 'teacher') {
            if (nip) updateData.nip = nip;
        }

        // 3. Update Table using userSupabase
        let table = userRole;

        const { data: updatedProfile, error: updateError } = await userSupabase
            .from(table)
            .update(updateData)
            .eq('user_uid', userId)
            .select()
            .single();

        if (updateError) {
            console.error(`❌ Error updating ${table} for user ${userId}:`, updateError);
            throw updateError;
        }

        console.log('✅ Profile updated successfully');

        // 4. Return updated data
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: {
                    id: userId,
                    email: req.user.email,
                    role: userRole
                },
                profile: {
                    id: updatedProfile.id,
                    nama: updatedProfile.nama,
                    email: updatedProfile.email,
                    image_url: updatedProfile.image_url,
                    ...(userRole === 'siswa' && {
                        nis: updatedProfile.nis,
                        kelas: updatedProfile.kelas,
                        tanggal_lahir: updatedProfile.tanggal_lahir,
                        alamat: updatedProfile.alamat
                    }),
                    ...(userRole === 'teacher' && { nip: updatedProfile.nip })
                }
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Failed to update profile'
        });
    }
};

/**
 * Get current user profile
 * GET /cbt/me
 */
export const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        let profile = null;

        switch (userRole) {
            case 'siswa':
                const { data: siswaProfile } = await supabase
                    .from('siswa')
                    .select('id, nama, email, nis, kelas, tanggal_lahir, alamat, image_url')
                    .eq('user_uid', userId)
                    .single();
                profile = siswaProfile;
                break;

            case 'teacher':
                const { data: teacherProfile } = await supabase
                    .from('teacher')
                    .select('id, nama, email, nip, image_url')
                    .eq('user_uid', userId)
                    .single();
                profile = teacherProfile;
                break;

            case 'admin':
                const { data: adminProfile } = await supabase
                    .from('admin')
                    .select('id, nama, email, image_url')
                    .eq('user_uid', userId)
                    .single();
                profile = adminProfile;
                break;
        }

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: userId,
                    email: req.user.email,
                    role: userRole
                },
                profile: profile ? {
                    id: profile.id,
                    nama: profile.nama,
                    email: profile.email,
                    image_url: profile.image_url,
                    ...(userRole === 'siswa' && { nis: profile.nis, kelas: profile.kelas }),
                    ...(userRole === 'teacher' && { nip: profile.nip })
                } : null
            }
        });

    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Failed to get user profile'
        });
    }
};
