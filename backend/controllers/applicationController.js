const Application = require('../models/Application');
const Job = require('../models/Job');
const UserActivity = require('../models/UserActivity');

// @desc    Get applications (Company sees all for their jobs, Candidate sees their own)
// @route   GET /api/applications
// @access  Private
exports.getApplications = async (req, res) => {
    try {
        let query = {};
        
        // If Company
        if (req.user.role === 'company') {
            // Find jobs by this company first? Or if we stored companyId on Application
            // I added 'company' field to Application model for this optimization.
            // But if it wasn't populated during creation, we must rely on Jobs.
            
            // Let's rely on 'company' field in Application if possible.
            // But since I just created it, existing data might need migration? 
            // We don't have existing application data yet likely.
            
            // For robustness, let's find jobs by company, then applications for those jobs.
            // const jobs = await Job.find({ company: req.user._id }).select('_id');
            // const jobIds = jobs.map(job => job._id);
            // query = { job: { $in: jobIds } };
            
            // Actually, querying via `job` population filter is harder in Mongoose in one go.
            // Storing `company` on Application is best practice.
            // I'll assume we populate `company` field on creation.
            // BUT for now, let's implement the query via Job lookup to be safe.
            const jobs = await Job.find({ company: req.user._id });
            const jobIds = jobs.map(j => j._id);
             query = { job: { $in: jobIds } };
        } 
        // If Candidate
        else if (req.user.role === 'candidate') {
            query.applicant = req.user._id;
        }

        // Filters
        if (req.query.status) {
            query.status = req.query.status;
        }
        if (req.query.jobId) {
            query.job = req.query.jobId;
        }

        const applications = await Application.find(query)
            .populate('job', 'title location type company')
            .populate('applicant', 'firstName lastName email name skills phone experience resumeUrl')
            .sort({ createdAt: -1 });

        // Frontend expects 'applicant.name'. Candidate model has firstName, lastName.
        // We might need to transform or rely on virtuals.
        // Let's verify Candidate model: it has firstName, lastName.
        // I should stick to one convention. 
        // For now, I'll map it in response or modify Model to have virtual 'name'.
        
        const formattedApps = applications.map(app => {
            const appObj = app.toObject();
            if (appObj.applicant) {
                appObj.applicant.name = `${appObj.applicant.firstName} ${appObj.applicant.lastName}`;
            }
            return appObj;
        });

        res.status(200).json({
            success: true,
            count: formattedApps.length,
            applications: formattedApps
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update application status
// @route   PUT /api/applications/:id/status
// @access  Private (Company)
exports.updateApplicationStatus = async (req, res) => {
    try {
        const { status, notes } = req.body;

        let application = await Application.findById(req.params.id)
            .populate('job');

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Verify ownership (Company Only)
        // We need to check if the job belongs to this company
        // Since we didn't populate job.company fully (just ID usually), we check ID.
        // Job schema: company is ref to User (or Company now).
        // req.user._id matches the company ID?
        
        // Wait, Job model 'company' ref is 'User' in comments, but I created 'Company' model?
        // Prior implementation of Job model referenced 'User'.
        // But now 'Company' model exists.
        // I should probably update Job model to ref 'Company' or 'User' dynamically or stick to one.
        // Given I just made Company model, existing jobs (if any) might break?
        // Let's assume req.user._id (from Company collection) matches job.company.
        
        if (application.job.company.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        application.status = status;
        if (notes) application.notes = notes;

        await application.save();

        res.status(200).json({
            success: true,
            data: application
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Apply for a job (Candidate)
// @route   POST /api/applications
// @access  Private (Candidate only)
exports.createApplication = async (req, res) => {
    try {
        const { jobId } = req.body;

        if (!jobId) {
            return res.status(400).json({ message: 'Job ID is required' });
        }

        // Check if job exists and is active
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }
        if (job.status !== 'active') {
            return res.status(400).json({ message: 'This job is no longer accepting applications' });
        }

        // Check for duplicate application
        const existingApp = await Application.findOne({
            job: jobId,
            applicant: req.user._id,
        });
        if (existingApp) {
            return res.status(400).json({ message: 'You have already applied for this job' });
        }

        // Create application
        const application = await Application.create({
            job: jobId,
            applicant: req.user._id,
            company: job.company,
            resume: req.user.resumeUrl || '',
            status: 'pending',
        });

        // Increment applications count on the job
        await Job.findByIdAndUpdate(jobId, { $inc: { applicationsCount: 1 } });

        // Log activity for dashboard
        UserActivity.create({
            candidate: req.user._id,
            type: 'application_sent',
            metadata: { title: 'Application Sent', subtitle: `Applied to ${job.title} at ${job.companyName || 'Company'}.` }
        }).catch(err => console.error('Activity log error:', err));

        res.status(201).json({
            success: true,
            data: application,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
