const User = require('../models/User');
const Company = require('../models/Company');
const Candidate = require('../models/Candidate');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Review = require('../models/Review');

// @desc    Verify admin code (Legacy)
exports.verifyCode = async (req, res) => {
    // ... existing verifyCode logic if still needed, but we moved to dedicated login
    res.status(400).json({ message: 'Use /admin/login instead' });
};

// @desc    Get all companies
// @route   GET /api/admin/companies
exports.getCompanies = async (req, res) => {
    try {
        const companies = await Company.find().sort({ createdAt: -1 });
        res.json(companies);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update company status
// @route   PUT /api/admin/companies/:id/status
exports.updateCompanyStatus = async (req, res) => {
    try {
        const { status } = req.body; // 'active', 'suspended', 'approved' -> 'active', 'rejected' -> 'suspended' ?
        // User asked for Approve/Reject/Ban.
        // Status enum is ['pending', 'active', 'suspended']
        // If approved -> active. If rejected -> suspended (or delete?). Rejection usually means ban or delete. Let's use suspended.
        
        const company = await Company.findByIdAndUpdate(
            req.params.id, 
            { status },
            { new: true }
        );
        res.json(company);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all candidates
// @route   GET /api/admin/candidates
exports.getCandidates = async (req, res) => {
    try {
        const candidates = await Candidate.find().sort({ createdAt: -1 });
        res.json(candidates);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get candidate details and their applications
// @route   GET /api/admin/candidates/:id
exports.getCandidateDetails = async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }

        const applications = await Application.find({ applicant: req.params.id })
            .populate('job', 'title company location type salary status companyName')
            .sort({ createdAt: -1 });

        // If job populates company id natively but we need the company details, 
        // we might need a nested populate if the job schema has company ref
        const populatedApps = await Application.populate(applications, {
            path: 'job.company',
            select: 'companyName logo'
        });

        res.json({
            success: true,
            candidate,
            applications: populatedApps || applications
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update candidate status (Ban)
// @route   PUT /api/admin/candidates/:id/status
exports.updateCandidateStatus = async (req, res) => {
    try {
        const { status } = req.body; // 'active', 'suspended'
        const candidate = await Candidate.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        res.json(candidate);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update candidate credits
// @route   PUT /api/admin/candidates/:id/credits
exports.updateCandidateCredits = async (req, res) => {
    try {
        const { credits } = req.body;
        if (credits === undefined || credits < 0 || !Number.isInteger(credits)) {
            return res.status(400).json({ message: 'Credits must be a non-negative integer' });
        }
        const candidate = await Candidate.findByIdAndUpdate(
            req.params.id,
            { credits },
            { new: true }
        );
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }
        res.json({ success: true, credits: candidate.credits });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get analytics
// @route   GET /api/admin/analytics
exports.getAnalytics = async (req, res) => {
    try {
        // Totals
        const totalCompanies = await Company.countDocuments();
        const activeCompanies = await Company.countDocuments({ status: 'active' });
        const pendingCompanies = await Company.countDocuments({ status: 'pending' });
        
        const totalCandidates = await Candidate.countDocuments();
        
        // Jobs (Assuming Job model exists)
        let totalJobs = 0;
        try {
             totalJobs = await Job.countDocuments();
        } catch (e) { console.error('Job model error or not found', e); }

        // Growth Over Time (Last 6 months)
        // Helper for aggregation
        const getMonthlyGrowth = async (Model) => {
            return await Model.aggregate([
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } },
                { $limit: 12 }
            ]);
        };

        const companyGrowth = await getMonthlyGrowth(Company);
        const candidateGrowth = await getMonthlyGrowth(Candidate);
        
        // Job growth
        let jobGrowth = [];
        try {
            jobGrowth = await getMonthlyGrowth(Job);
        } catch(e) {}

        res.json({
            overview: {
                totalCompanies,
                activeCompanies,
                pendingCompanies,
                totalCandidates,
                totalJobs
            },
            graphs: {
                companies: companyGrowth,
                candidates: candidateGrowth,
                jobs: jobGrowth
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get dashboard stats (Dashboard Header)
// @route   GET /api/admin/stats
exports.getStats = async (req, res) => {
    try {
        const totalCompanies = await Company.countDocuments();
        const activeCompanies = await Company.countDocuments({ status: 'active' });
        const pendingCompanies = await Company.countDocuments({ status: 'pending' });
        
        const totalUsers = await Candidate.countDocuments(); // Assuming Users = Candidates roughly for now or create User model check
        // Or await User.countDocuments() if User model is main auth
        
        const totalJobs = await Job.countDocuments();
        const activeJobs = await Job.countDocuments({ status: 'active' });
        const flaggedJobs = await Job.countDocuments({ status: 'flagged' });
        
        // Applications (Arbitrary placeholder if Application model not imported yet or just use 0)
        const totalApplications = 0; // await Application.countDocuments();

        res.json({
            users: {
                total: totalUsers
            },
            companies: {
                total: totalCompanies,
                active: activeCompanies,
                pending: pendingCompanies
            },
            jobs: {
                total: totalJobs,
                active: activeJobs,
                flagged: flaggedJobs
            },
            applications: {
                total: totalApplications
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all jobs for admin
// @route   GET /api/admin/jobs
exports.getJobs = async (req, res) => {
    try {
        const { status } = req.query;
        let query = {};
        if (status) query.status = status;

        const jobs = await Job.find(query)
            .populate('company', 'companyName email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: jobs.length,
            jobs
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Flag/Unflag a job
// @route   PUT /api/admin/jobs/:id/flag
exports.flagJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // Toggle flag
        job.status = job.status === 'flagged' ? 'active' : 'flagged';
        await job.save();

        res.json({
            success: true,
            status: job.status,
            message: `Job ${job.status}`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete a job
// @route   DELETE /api/admin/jobs/:id
exports.deleteJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        await job.deleteOne();

        res.json({
            success: true,
            message: 'Job deleted'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all reviews (Admin)
// @route   GET /api/admin/reviews
exports.getReviews = async (req, res) => {
    try {
        const reviews = await Review.find()
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            count: reviews.length,
            reviews
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete a review (Admin)
// @route   DELETE /api/admin/reviews/:id
exports.deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: 'Review not found' });

        await review.deleteOne();

        res.json({
            success: true,
            message: 'Review deleted'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all jobs for a specific company (Admin)
// @route   GET /api/admin/companies/:id/jobs
exports.getCompanyJobs = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const jobs = await Job.find({ company: req.params.id })
            .sort({ createdAt: -1 })
            .lean();

        // Attach application count for each job
        const jobIds = jobs.map(j => j._id);
        const appCounts = await Application.aggregate([
            { $match: { job: { $in: jobIds } } },
            { $group: { _id: '$job', count: { $sum: 1 } } }
        ]);
        const countMap = new Map(appCounts.map(a => [a._id.toString(), a.count]));

        const jobsWithCounts = jobs.map(job => ({
            ...job,
            applicationsCount: countMap.get(job._id.toString()) || job.applicationsCount || 0
        }));

        res.json({
            success: true,
            company: {
                _id: company._id,
                companyName: company.companyName,
                email: company.email,
                industry: company.industry,
                location: company.location,
                website: company.website,
                status: company.status,
                logo: company.logo,
                size: company.size,
                description: company.description,
                contactPerson: company.contactPerson,
                document: company.document,
                createdAt: company.createdAt,
            },
            count: jobsWithCounts.length,
            jobs: jobsWithCounts
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create a job on behalf of a company (Admin)
// @route   POST /api/admin/companies/:id/jobs
exports.createJobForCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        req.body.company = company._id;

        const job = await Job.create(req.body);

        res.status(201).json({
            success: true,
            data: job
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get applicants for a specific job under a company (Admin)
// @route   GET /api/admin/companies/:companyId/jobs/:jobId/applicants
exports.getCompanyJobApplicants = async (req, res) => {
    try {
        const { companyId, jobId } = req.params;

        // Verify job belongs to company
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }
        if (job.company.toString() !== companyId) {
            return res.status(400).json({ message: 'Job does not belong to this company' });
        }

        const applications = await Application.find({ job: jobId })
            .populate('applicant', 'firstName lastName email name skills phone experience resumeUrl')
            .sort({ createdAt: -1 });

        const formattedApps = applications.map(app => {
            const appObj = app.toObject();
            if (appObj.applicant) {
                appObj.applicant.name = appObj.applicant.name ||
                    `${appObj.applicant.firstName || ''} ${appObj.applicant.lastName || ''}`.trim() ||
                    'Unknown';
            }
            return appObj;
        });

        res.json({
            success: true,
            job: {
                _id: job._id,
                title: job.title,
                status: job.status,
                location: job.location,
                type: job.type,
            },
            count: formattedApps.length,
            applications: formattedApps
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update application status (Admin)
// @route   PUT /api/admin/applications/:id/status
exports.updateApplicationStatus = async (req, res) => {
    try {
        const { status, notes } = req.body;

        const application = await Application.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        application.status = status;
        if (notes !== undefined) application.notes = notes;

        await application.save();

        res.json({
            success: true,
            data: application
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create a new company (Admin)
// @route   POST /api/admin/companies
exports.createCompany = async (req, res) => {
    try {
        let companyData = { ...req.body };

        const { companyName, email } = companyData;

        if (!companyName || !email) {
            return res.status(400).json({ message: 'Company name and email are required' });
        }

        // Check if email already taken
        const existing = await Company.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: 'A company with this email already exists' });
        }

        // Reconstruct contactPerson if sent as flat FormData fields
        if (req.body['contactPerson[name]']) {
            companyData.contactPerson = {
                name: req.body['contactPerson[name]'],
                designation: req.body['contactPerson[designation]'],
                phone: req.body['contactPerson[phone]']
            };
        } else if (typeof req.body.contactPerson === 'string') {
            try {
                companyData.contactPerson = JSON.parse(req.body.contactPerson);
            } catch (e) { /* ignore */ }
        }

        // Reconstruct document if sent as flat FormData fields
        if (req.body['document[type]']) {
            companyData.document = {
                type: req.body['document[type]'],
                number: req.body['document[number]'] || ''
            };
        } else if (typeof req.body.document === 'string') {
            try {
                companyData.document = JSON.parse(req.body.document);
            } catch (e) { /* ignore */ }
        }

        // Handle document file upload via Cloudinary
        if (req.file) {
            const cloudinary = require('../config/cloudinary');
            const stream = require('stream');

            const uploadPromise = new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'company_documents' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                const bufferStream = new stream.PassThrough();
                bufferStream.end(req.file.buffer);
                bufferStream.pipe(uploadStream);
            });

            try {
                const result = await uploadPromise;
                if (!companyData.document) companyData.document = {};
                companyData.document.url = result.secure_url;
            } catch (uploadError) {
                console.error('Cloudinary Upload Error:', uploadError);
                return res.status(500).json({ message: 'Document upload failed' });
            }
        }

        // Generate placeholder clerkId — linked when real user signs up with same email
        const crypto = require('crypto');
        const placeholderClerkId = `admin-created-${crypto.randomUUID()}`;

        // Clean up flat FormData keys before creating
        const cleanData = {
            clerkId: placeholderClerkId,
            companyName: companyData.companyName,
            email: companyData.email,
            industry: companyData.industry,
            size: companyData.size,
            website: companyData.website,
            description: companyData.description,
            location: companyData.location,
            contactPerson: companyData.contactPerson,
            document: companyData.document,
            status: 'active',
            profileComplete: true,
        };

        const company = await Company.create(cleanData);

        res.status(201).json({
            success: true,
            data: company
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};
