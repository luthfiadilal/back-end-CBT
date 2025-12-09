import supabase from '../config/supabase.js';
import { hashPassword, comparePassword, generateToken } from '../utils/authUtils.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Register new student
 * POST /cbt/register
 */
export const register = async (req, res) => {
    try {
        const { nama, email, password, tanggal_lahir, alamat, kelas, nis } = req.body;

        // Validate required fields
        if (!nama || !email || !password || !tanggal_lahir || !alamat || !kelas || !nis) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'All fields are required'
            });
        }

        // Check if email already exists in app_users
        const { data: existingEmail, error: emailCheckError } = await supabase
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

        // Check if NIS already exists in siswa table
        const { data: existingNIS, error: nisCheckError } = await supabase
            .from('siswa')
            .select('nis')
            .eq('nis', nis)
            .single();

        if (existingNIS) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'NIS already registered'
            });
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) {
            throw new Error(`Auth error: ${authError.message}`);
        }

        const userId = authData.user.id;

        try {
            // Insert into app_users table
            const { data: appUserData, error: appUserError } = await supabase
                .from('app_users')
                .insert({
                    uid: userId,
                    role: 'siswa',
                    email: email,
                    password_hash: passwordHash
                })
                .select()
                .single();

            if (appUserError) {
                throw new Error(`App user creation error: ${appUserError.message}`);
            }

            // Insert into siswa table
            const { data: siswaData, error: siswaError } = await supabase
                .from('siswa')
                .insert({
                    user_uid: userId,
                    nama: nama,
                    tanggal_lahir: tanggal_lahir,
                    alamat: alamat,
                    kelas: kelas,
                    nis: nis,
                    email: email
                })
                .select()
                .single();

            if (siswaError) {
                throw new Error(`Siswa creation error: ${siswaError.message}`);
            }

            // Generate JWT token
            const token = generateToken(userId, email, 'siswa');

            res.status(201).json({
                success: true,
                message: 'Registration successful',
                data: {
                    user: {
                        id: userId,
                        email: email,
                        role: 'siswa'
                    },
                    profile: {
                        id: siswaData.id,
                        nama: siswaData.nama,
                        email: siswaData.email,
                        nis: siswaData.nis,
                        kelas: siswaData.kelas
                    },
                    token: token
                }
            });

        } catch (dbError) {
            // Rollback: delete user from auth if database insertion fails
            try {
                await supabase.auth.admin.deleteUser(userId);
            } catch (rollbackError) {
                console.error('Rollback error:', rollbackError);
            }
            throw dbError;
        }

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Registration failed'
        });
    }
};

/**
 * Login user (all roles: siswa, teacher, admin)
 * POST /cbt/login
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Email and password are required'
            });
        }

        // Find user by email in app_users table
        const { data: appUser, error: userError } = await supabase
            .from('app_users')
            .select('uid, role, email, password_hash')
            .eq('email', email)
            .single();

        if (userError || !appUser) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid email or password'
            });
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, appUser.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid email or password'
            });
        }

        const userId = appUser.uid;

        // Get user profile based on role
        let profile = null;
        let profileError = null;

        switch (appUser.role) {
            case 'siswa':
                const { data: siswaProfile, error: siswaError } = await supabase
                    .from('siswa')
                    .select('id, nama, email, nis, kelas, tanggal_lahir, alamat')
                    .eq('user_uid', userId)
                    .single();
                profile = siswaProfile;
                profileError = siswaError;
                break;

            case 'teacher':
                const { data: teacherProfile, error: teacherError } = await supabase
                    .from('teacher')
                    .select('id, nama, email, nip')
                    .eq('user_uid', userId)
                    .single();
                profile = teacherProfile;
                profileError = teacherError;
                break;

            case 'admin':
                const { data: adminProfile, error: adminError } = await supabase
                    .from('admin')
                    .select('id, nama, email')
                    .eq('user_uid', userId)
                    .single();
                profile = adminProfile;
                profileError = adminError;
                break;

            default:
                return res.status(400).json({
                    error: 'Invalid role',
                    message: 'User has invalid role'
                });
        }

        if (profileError || !profile) {
            return res.status(404).json({
                error: 'Profile not found',
                message: `${appUser.role} profile not found`
            });
        }

        // Generate JWT token
        const token = generateToken(userId, email, appUser.role);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: userId,
                    email: email,
                    role: appUser.role
                },
                profile: {
                    id: profile.id,
                    nama: profile.nama,
                    email: profile.email,
                    ...(appUser.role === 'siswa' && { nis: profile.nis, kelas: profile.kelas }),
                    ...(appUser.role === 'teacher' && { nip: profile.nip })
                },
                token: token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Login failed'
        });
    }
};

/**
 * Logout user
 * POST /cbt/logout
 */
export const logout = async (req, res) => {
    try {
        // With JWT, logout is handled client-side by removing the token
        // Server doesn't need to do anything

        res.status(200).json({
            success: true,
            message: 'Logout successful. Please remove the token from client storage.'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Logout failed'
        });
    }
};

/**
 * Get current user profile
 * GET /cbt/me
 */
export const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user.id; // Set by authenticate middleware
        const userRole = req.user.role;

        // Get user profile based on role
        let profile = null;
        let profileError = null;

        switch (userRole) {
            case 'siswa':
                const { data: siswaProfile, error: siswaError } = await supabase
                    .from('siswa')
                    .select('id, nama, email, nis, kelas, tanggal_lahir, alamat')
                    .eq('user_uid', userId)
                    .single();
                profile = siswaProfile;
                profileError = siswaError;
                break;

            case 'teacher':
                const { data: teacherProfile, error: teacherError } = await supabase
                    .from('teacher')
                    .select('id, nama, email, nip')
                    .eq('user_uid', userId)
                    .single();
                profile = teacherProfile;
                profileError = teacherError;
                break;

            case 'admin':
                const { data: adminProfile, error: adminError } = await supabase
                    .from('admin')
                    .select('id, nama, email')
                    .eq('user_uid', userId)
                    .single();
                profile = adminProfile;
                profileError = adminError;
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
