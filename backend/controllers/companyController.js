const Company = require('../models/Company');
const Job = require('../models/Job');
const cloudinary = require('../config/cloudinary');
const stream = require('stream');

// @desc    Get company profile
// @route   GET /api/company/profile
// @access  Private
exports.getProfile = async (req, res) => {
    try {
        // req.user is already populated by authMiddleware with the Company document
        // But to be safe and ensure latest data, we can re-fetch or just return req.user
        // If we want to use findById, we must use the Company model.
        
        const company = await Company.findById(req.user._id); // Use _id from req.user
        
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        res.status(200).json(company);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update company profile
// @route   PUT /api/company/profile
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const updateData = { ...req.body };

        // Handle File Upload
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
                
                // Parse potentially nested updateData for document if sent as individual fields from formdata
                // Actually, formData sends text fields flattened mostly.
                // We'll trust the body to have document.type and document.number or construct it.
                // Since req.body might be 'document[type]' keys if not careful, but typically JSON handling in frontend might differ.
                // However, we are switching frontend to FormData which sends key-value pairs.
                // So document type and number will be top level keys probably, we need to restructure.
                
                // Initializing document object if it doesn't exist
                if (!updateData.document) updateData.document = {};

                updateData.document.url = result.secure_url;
                
                // If type and number are passed separately in body
                if (req.body.documentType) updateData.document.type = req.body.documentType;
                if (req.body.documentNumber) updateData.document.number = req.body.documentNumber;

            } catch (uploadError) {
                console.error("Cloudinary Upload Error:", uploadError);
                return res.status(500).json({ message: 'Image upload failed' });
            }
        } else {
             // If no file, but we are updating document details (text only)
              if (req.body.documentType || req.body.documentNumber) {
                 if (!updateData.document) updateData.document = {};
                 if (req.body.documentType) updateData.document.type = req.body.documentType;
                 if (req.body.documentNumber) updateData.document.number = req.body.documentNumber;
             }
        }
        
        // Ensure contactPerson structure is maintained if flat fields come in
        if (req.body['contactPerson.name']) {
             if (!updateData.contactPerson) updateData.contactPerson = {};
             updateData.contactPerson.name = req.body['contactPerson.name'];
        }
        // ... handle other nested fields if necessary or rely on frontend sending compliant JSON structures stringified or flat keys.
        // Simplified approach: Frontend should send JSON string for complex objects OR we handle flat keys.
        // Let's assume for now we might need to manually map if frontend sends 'contactPerson[name]' styles.
        // But for this task, the Document part is the focus.

        const company = await Company.findByIdAndUpdate(req.user._id, updateData, {
            new: true,
            runValidators: true
        });

        if (!company) {
             return res.status(404).json({ message: 'Company not found' });
        }

        res.status(200).json(company);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get company dashboard stats
// @route   GET /api/company/stats
// @access  Private
exports.getStats = async (req, res) => {
    try {
        const Application = require('../models/Application');

        const jobsCount = await Job.countDocuments({ company: req.user._id });
        const activeJobsCount = await Job.countDocuments({ company: req.user._id, status: 'active' });
        const closedJobsCount = await Job.countDocuments({ company: req.user._id, status: 'closed' });

        // Get all job IDs for this company
        const companyJobs = await Job.find({ company: req.user._id }).select('_id');
        const jobIds = companyJobs.map(j => j._id);

        // Query real application data
        const applicationsCount = await Application.countDocuments({ job: { $in: jobIds } });
        const pendingApplications = await Application.countDocuments({ job: { $in: jobIds }, status: 'pending' });
        const shortlistedApplications = await Application.countDocuments({ job: { $in: jobIds }, status: 'shortlisted' });

        // Recent applications
        const recentApplications = await Application.find({ job: { $in: jobIds } })
            .populate('job', 'title')
            .populate('applicant', 'firstName lastName email name')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        // Ensure applicant.name is populated
        const formattedRecent = recentApplications.map(app => ({
            ...app,
            applicant: app.applicant ? {
                ...app.applicant,
                name: app.applicant.name || `${app.applicant.firstName || ''} ${app.applicant.lastName || ''}`.trim() || 'Unknown',
            } : { name: 'Unknown', email: '' },
        }));

        res.status(200).json({
            jobs: {
                total: jobsCount,
                active: activeJobsCount,
                closed: closedJobsCount
            },
            applications: {
                total: applicationsCount,
                pending: pendingApplications,
                shortlisted: shortlistedApplications
            },
            recentApplications: formattedRecent
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
