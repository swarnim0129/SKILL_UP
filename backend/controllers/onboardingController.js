const Company = require('../models/Company');
const Candidate = require('../models/Candidate');
const User = require('../models/User'); // Admin?
const cloudinary = require('../config/cloudinary');
const stream = require('stream');

// @desc    Check onboarding status
// @route   GET /api/onboarding/check
// @access  Private
exports.checkOnboarding = async (req, res) => {
    try {
        const clerkId = req.clerkId;
        // req.user might be populated by middleware if found by clerkId
        
        // If middleware found it by clerkId
        if (req.user && req.user.role !== 'new') {
            const redirectUrl = req.user.role === 'company' ? '/company/dashboard' : '/candidate/dashboard';
            return res.status(200).json({
                exists: true,
                role: req.user.role,
                redirectUrl,
                user: req.user
            });
        }

        // If not found by clerkId, check by email (Account Linking)
        // We need the email from Clerk token properties.
        // Middleware put verifiedToken in req.auth.
        // We might need to fetch user details from Clerk if email isn't in token claims, 
        // but typically standard claims have it or we can pass it from frontend?
        // Let's assume we might not catch it by email safely without verifying email ownership.
        // BUT, user specifically said "i already have this mail in db".
        // Let's rely on the middleware's effort or do a secondary lookup here.
        
        // Since middleware only checked clerkId, let's check email here if we can get it.
        // We can get email from `req.auth` if added to jwt template, or request user.
        // Let's trust the frontend passing it? No, unsecure.
        // We'll proceed with "not found" if clerkId doesn't match. 
        // Wait, if I want to support "existing email", I should look it up.
        // I will add a lookup by email if I can retrieve it from the clerk user object.
        
        // Handling the "Admin" case:
        // Check 'User' collection for admin role — by clerkId OR email
        let adminUser = await User.findOne({ clerkId });
        
        // If not found by clerkId, try email fallback
        if (!adminUser && req.clerkEmail) {
            adminUser = await User.findOne({ email: req.clerkEmail, role: 'admin' });
            if (adminUser) {
                adminUser.clerkId = clerkId;
                await adminUser.save();
                console.log(`✅ Admin account linked by email: ${req.clerkEmail} → new clerkId: ${clerkId}`);
            }
        }

        if (adminUser && adminUser.role === 'admin') {
             return res.status(200).json({
                exists: true,
                role: 'admin',
                redirectUrl: '/admin/dashboard',
                user: adminUser
            });
        }

        res.status(200).json({ exists: false });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Complete onboarding (Candidate)
// @route   POST /api/onboarding/candidate
// @access  Private
exports.onboardCandidate = async (req, res) => {
    try {
        const clerkId = req.clerkId;
        const data = req.body;

        // Check if candidate already exists
        let candidate = await Candidate.findOne({ clerkId });
        if (candidate) {
            return res.status(400).json({ message: 'Candidate already exists' });
        }

        // --- Generate unique referral code ---
        const crypto = require('crypto');
        let referralCode;
        let codeExists = true;
        while (codeExists) {
            referralCode = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-char hex
            codeExists = await Candidate.findOne({ referralCode });
        }

        // --- Process incoming referral code (if provided) ---
        let referredBy = null;
        const incomingRefCode = data.referralCode;

        if (incomingRefCode) {
            const referrer = await Candidate.findOne({ referralCode: incomingRefCode });

            if (referrer) {
                // Block self-referral (same clerkId)
                if (referrer.clerkId === clerkId) {
                    console.warn('Self-referral blocked for clerkId:', clerkId);
                } else {
                    referredBy = referrer._id;
                    // Award referrer +10 credits and increment count
                    await Candidate.findByIdAndUpdate(referrer._id, {
                        $inc: { credits: 10, referralCount: 1, totalCreditsEarned: 10 }
                    });
                    // Referral reward applied
                }
            } else {
                console.warn('Invalid referral code provided:', incomingRefCode);
            }
        }

        // Remove referralCode from spread data to avoid conflict with generated one
        const { referralCode: _, ...candidateData } = data;

        candidate = await Candidate.create({
            clerkId,
            ...candidateData,
            referralCode,
            referredBy,
            profileComplete: true
        });

        res.status(201).json({
            success: true,
            redirectUrl: '/candidate/dashboard',
            user: candidate
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Complete onboarding (Company)
// @route   POST /api/onboarding/company
// @access  Private
exports.onboardCompany = async (req, res) => {
    try {
        const clerkId = req.clerkId;
        
        // Handle potential FormData structure or JSON
        // When using multer, body fields are in req.body.
        // If nested fields like contactPerson[name] are sent, we need to restructure.
        
        let companyData = { ...req.body };
        
        // Reconstruct contactPerson if sent flatten
        if (req.body['contactPerson[name]']) {
             companyData.contactPerson = {
                name: req.body['contactPerson[name]'],
                designation: req.body['contactPerson[designation]'],
                phone: req.body['contactPerson[phone]']
            };
        } else if (typeof req.body.contactPerson === 'string') {
             // If sent as JSON string
             try {
                companyData.contactPerson = JSON.parse(req.body.contactPerson);
             } catch(e) {
                // ignore
             }
        }

        // Handle File Upload
        if (!req.file) {
            return res.status(400).json({ message: 'Verification document is required' });
        }

        if (req.file) {
            const uploadPromise = new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'company_documents' },
                    (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );
                const bufferStream = new stream.PassThrough();
                bufferStream.end(req.file.buffer);
                bufferStream.pipe(uploadStream);
            });

            try {
                const result = await uploadPromise;
                
                companyData.document = {
                    url: result.secure_url,
                    type: req.body.documentType,
                    number: req.body.documentNumber
                };

            } catch (uploadError) {
                console.error("Cloudinary Upload Error:", uploadError);
                return res.status(500).json({ message: 'Image upload failed' });
            }
        }

        // Check if exists
        let company = await Company.findOne({ clerkId });
        if (company) {
            return res.status(400).json({ message: 'Company already exists' });
        }

        company = await Company.create({
            clerkId,
            ...companyData,
            profileComplete: true,
            status: 'pending' // Default to pending
        });

        res.status(201).json({
            success: true,
            redirectUrl: '/company/dashboard',
            user: company
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};
