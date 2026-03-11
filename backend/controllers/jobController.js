const Job = require('../models/Job');

// @desc    Get public job listings (no auth required)
// @route   GET /api/jobs/public
// @access  Public
exports.getPublicJobs = async (req, res) => {
  try {
    const Company = require('../models/Company');

    let jobs = await Job.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    // Populate company data from Company collection
    const companyIds = [...new Set(jobs.map(j => j.company?.toString()).filter(Boolean))];
    const companies = await Company.find({ _id: { $in: companyIds } })
      .select('companyName location logo industry contactPerson email')
      .lean();
    const companyMap = new Map(companies.map(c => [c._id.toString(), c]));

    jobs = jobs.map(job => ({
      ...job,
      companyInfo: companyMap.get(job.company?.toString()) || null,
    }));

    res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all jobs (public or company specific)
// @route   GET /api/jobs
// @access  Public / Private
exports.getJobs = async (req, res) => {
  try {
    let query = {};
    
    // If logged in as company, return only their jobs? 
    // The frontend logic for "Manage Jobs" page calls /api/jobs using company token.
    // We should differentiate between "Public Feed" and "Company Dashboard".
    // Usually via query param or route. 
    // BUT frontend code: `api.get('/jobs', ...)` with auth token.
    // If it's a company user, they likely want THEIR jobs.
    // However, a company user might also want to search jobs?
    // Let's check logic: if role is company, return own jobs.
    
    // Actually, usually GET /api/jobs is for everyone.
    // GET /api/jobs/company or /api/jobs?company=me is better.
    // Frontend `src/app/company/jobs/page.tsx` calls `api.get('/jobs')`.
    // It assumes verification.
    
    if (req.user && req.user.role === 'company') {
        query.company = req.user.id;
    }

    const jobs = await Job.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Public
exports.getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('company', 'name companyName logo location');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new job
// @route   POST /api/jobs
// @access  Private (Company only)
exports.createJob = async (req, res) => {
  try {
    // Add user to body
    req.body.company = req.user.id;

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

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (Company only)
exports.updateJob = async (req, res) => {
  try {
    let job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Make sure user is job owner
    if (job.company.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to update this job' });
    }

    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private (Company only)
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Make sure user is job owner
    if (job.company.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to delete this job' });
    }

    await job.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
// @desc    Generate Job from Text (AI)
// @route   POST /api/jobs/generate-ai
// @access  Private
exports.generateJobFromText = async (req, res) => {
    try {
        const { role, skills } = req.body;


        // --- GEMINI IMPLEMENTATION (COMMENTED OUT) ---
        /*
        if (!process.env.GEMINI_API_KEY) {
             return res.status(500).json({ message: 'AI Service Config Error' });
        }

        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `You are an expert HR assistant. Create a professional job posting for the role of "${role}" requiring skills: "${skills}".
        Return the response strictly as a JSON object with the following structure:
        {
            "title": "${role}",
            "description": " Detailed job description...",
            "requirements": ["Requirement 1", "Requirement 2"],
            "recommended_skills": ["Skill 1", "Skill 2"],
            "location": "Remote",
            "type": "full-time",
            "experience": "mid"
        }
        Do not include markdown formatting (like '''json). Just the raw JSON string.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        // Clean markdown code blocks if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const jobData = JSON.parse(text);
        res.status(200).json(jobData);
        */
       // ---------------------------------------------

       // --- GROQ IMPLEMENTATION ---
       if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({ message: 'Groq Service Config Error' });
       }

       const Groq = require('groq-sdk');
       const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

       const prompt = `You are an expert HR assistant. Create a professional job posting for the role of "${role}" requiring skills: "${skills}".
       Return the response strictly as a JSON object with the following structure:
       {
           "title": "${role}",
           "description": " Detailed job description...",
           "requirements": ["Requirement 1", "Requirement 2"],
           "recommended_skills": ["Skill 1", "Skill 2"],
           "location": "Remote",
           "type": "full-time",
           "experience": "mid"
       }
       Do not include markdown formatting. Just the raw JSON string.`;

       const chatCompletion = await groq.chat.completions.create({
           messages: [{ role: 'user', content: prompt }],
           model: 'llama-3.3-70b-versatile',
           temperature: 0.5,
           response_format: { type: 'json_object' }
       });

       const text = chatCompletion.choices[0]?.message?.content || "";
       
       const jobData = JSON.parse(text);
       res.status(200).json(jobData);
       // ---------------------------

    } catch (error) {
        console.error("AI Gen Error:", error);
        res.status(500).json({ message: 'Failed to generate content' });
    }
};

// @desc    Generate Job from PDF (AI)
// @route   POST /api/jobs/generate-ai-file
// @access  Private
exports.generateJobFromPdf = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }


        const pdf = require('pdf-parse');
        const data = await pdf(req.file.buffer);
        const pdfText = data.text;

        // Truncate if too long (Gemini limit)
        const truncatedText = pdfText.substring(0, 30000); 

        // --- GEMINI IMPLEMENTATION (COMMENTED OUT) ---
        /*
        if (!process.env.GEMINI_API_KEY) {
             return res.status(500).json({ message: 'AI Service Config Error' });
        }

        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
         // gemini-pro is text-only, fine for parsed text
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `You are an expert HR assistant. I will provide a Job Description text extracted from a PDF. 
        Analyze it and extract the structured data to create a job posting.
        
        JD Text:
        "${truncatedText}"

        Return the response strictly as a JSON object with the following structure:
        {
            "title": "Extracted Job Title",
            "description": "Succinct summary of the role...",
            "requirements": ["Extracted Requirement 1", ...],
            "recommended_skills": ["Extracted Skill 1", ...],
            "location": "Extracted Location or 'Remote'",
            "type": "full-time" or "contract" or "internship",
            "experience": "entry" or "mid" or "senior" or "lead" or "executive"
        }
        Do not include markdown formatting. Just the JSON.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
         // Clean markdown code blocks if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const jobData = JSON.parse(text);

        res.status(200).json(jobData);
        */
        // ----------------------------------------------

        // --- GROQ IMPLEMENTATION ---
        if (!process.env.GROQ_API_KEY) {
             return res.status(500).json({ message: 'Groq Service Config Error' });
        }

        const Groq = require('groq-sdk');
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const prompt = `You are an expert HR assistant. I will provide a Job Description text extracted from a PDF. 
        Analyze it and extract the structured data to create a job posting.
        
        JD Text:
        "${truncatedText}"

        Return the response strictly as a JSON object with the following structure:
        {
            "title": "Extracted Job Title",
            "description": "Succinct summary of the role...",
            "requirements": ["Extracted Requirement 1", ...],
            "recommended_skills": ["Extracted Skill 1", ...],
            "location": "Extracted Location or 'Remote'",
            "type": "full-time" or "contract" or "internship",
            "experience": "entry" or "mid" or "senior" or "lead" or "executive"
        }
        Do not include markdown formatting. Just the JSON.`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.5,
            response_format: { type: 'json_object' }
        });

        const text = chatCompletion.choices[0]?.message?.content || "";
        const jobData = JSON.parse(text);

        res.status(200).json(jobData);
        // ---------------------------

    } catch (error) {
        console.error("AI Gen File Error:", error);
        res.status(500).json({ message: 'Failed to process file' });
    }
};

// @desc    Get candidate job feed with AI skill matching
// @route   GET /api/jobs/candidate-feed
// @access  Private (Candidate only)
exports.getCandidateJobFeed = async (req, res) => {
    try {
        const Candidate = require('../models/Candidate');
        const Company = require('../models/Company');

        // Get all active jobs
        let allJobs = await Job.find({ status: 'active' })
            .sort({ createdAt: -1 })
            .lean();

        // Populate company data manually (Job refs 'User' but data is in Company collection)
        const companyIds = [...new Set(allJobs.map(j => j.company?.toString()).filter(Boolean))];
        const companies = await Company.find({ _id: { $in: companyIds } })
            .select('companyName location logo industry contactPerson email')
            .lean();
        const companyMap = new Map(companies.map(c => [c._id.toString(), c]));

        allJobs = allJobs.map(job => ({
            ...job,
            companyInfo: companyMap.get(job.company?.toString()) || null,
        }));

        if (allJobs.length === 0) {
            return res.status(200).json({
                success: true,
                matchedJobs: [],
                allJobs: [],
            });
        }

        // Get candidate's skills
        const candidate = await Candidate.findOne({ clerkId: req.clerkId }).lean();
        const candidateSkills = candidate?.skills || [];
        const desiredRole = candidate?.jobPreferences?.desiredRole || '';
        const preferredJobType = candidate?.jobPreferences?.jobType || '';

        // If no skills, return all jobs without matching
        if (candidateSkills.length === 0) {
            return res.status(200).json({
                success: true,
                matchedJobs: [],
                allJobs,
            });
        }

        // Use Groq to rank jobs by relevance
        let matchedJobIds = [];
        try {
            if (!process.env.GROQ_API_KEY) {
                throw new Error('Groq not configured');
            }

            const Groq = require('groq-sdk');
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

            // Build a compact job summary for AI
            const jobSummaries = allJobs.map((job, i) => ({
                id: job._id.toString(),
                title: job.title,
                skills: job.skills || [],
                requirements: (job.requirements || []).slice(0, 3),
                type: job.type,
                experience: job.experience,
            }));

            const prompt = `You are a job matching expert. Given a candidate's profile and a list of jobs, identify which jobs are relevant to the candidate.

Candidate Profile:
- Skills: ${candidateSkills.join(', ')}
- Desired Role: ${desiredRole || 'Not specified'}
- Preferred Job Type: ${preferredJobType || 'Any'}

Jobs:
${JSON.stringify(jobSummaries)}

Return a JSON object with a single key "matched_ids" containing an array of job IDs (strings) that match or are related to the candidate's skillset. Order them by relevance (best match first). Only include genuinely relevant jobs. If no jobs match, return an empty array.

Example response: {"matched_ids": ["id1", "id2"]}`;

            const chatCompletion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.3,
                response_format: { type: 'json_object' },
            });

            const text = chatCompletion.choices[0]?.message?.content || '{}';
            const parsed = JSON.parse(text);
            matchedJobIds = parsed.matched_ids || [];
        } catch (aiError) {
            console.error('AI matching error (falling back to keyword match):', aiError.message);
            // Fallback: simple keyword matching
            const candidateSkillsLower = candidateSkills.map(s => s.toLowerCase());
            matchedJobIds = allJobs
                .filter(job => {
                    const jobSkills = (job.skills || []).map(s => s.toLowerCase());
                    const jobTitle = job.title.toLowerCase();
                    return candidateSkillsLower.some(cs =>
                        jobSkills.some(js => js.includes(cs) || cs.includes(js)) ||
                        jobTitle.includes(cs)
                    );
                })
                .map(job => job._id.toString());
        }

        // Separate matched jobs (in ranked order) from the rest
        const matchedJobs = matchedJobIds
            .map(id => allJobs.find(j => j._id.toString() === id))
            .filter(Boolean);

        const matchedIdSet = new Set(matchedJobIds);
        const remainingJobs = allJobs.filter(j => !matchedIdSet.has(j._id.toString()));

        res.status(200).json({
            success: true,
            matchedJobs,
            allJobs: remainingJobs,
        });
    } catch (error) {
        console.error('Candidate feed error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
