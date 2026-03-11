const jwt = require('jsonwebtoken');
const Company = require('../models/Company');
const Candidate = require('../models/Candidate');
const User = require('../models/User'); 

// Standard Clerk Protection for Users/Companies
exports.protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
      const { verifyToken } = require('@clerk/backend');
      const verifiedToken = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY,
      });

      const clerkId = verifiedToken.sub;
      req.auth = verifiedToken;
      req.clerkId = clerkId;

      let user = await Company.findOne({ clerkId });
      let role = null;

      if (user) {
          role = 'company';
      } else {
          user = await Candidate.findOne({ clerkId });
          if (user) {
              role = 'candidate';
          }
      }

      // Fallback: If not found by clerkId, try email lookup (Account Linking)
      // This handles cases where a user logs in from a different Clerk instance
      // or after Clerk project keys have changed.
      if (!user) {
          try {
              const { createClerkClient } = require('@clerk/backend');
              const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
              const clerkUser = await clerk.users.getUser(clerkId);
              const email = clerkUser.emailAddresses?.find(
                  e => e.id === clerkUser.primaryEmailAddressId
              )?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress;

              if (email) {
                  req.clerkEmail = email; // Store for downstream use

                  // Try Company by email
                  user = await Company.findOne({ email });
                  if (user) {
                      role = 'company';
                      user.clerkId = clerkId;
                      await user.save();
                      console.log(`✅ Account linked by email (Company): ${email} → new clerkId: ${clerkId}`);
                  } else {
                      // Try Candidate by email
                      user = await Candidate.findOne({ email });
                      if (user) {
                          role = 'candidate';
                          user.clerkId = clerkId;
                          await user.save();
                          console.log(`✅ Account linked by email (Candidate): ${email} → new clerkId: ${clerkId}`);
                      }
                  }
              }
          } catch (emailLookupError) {
              console.error('Email fallback lookup failed:', emailLookupError.message);
          }
      }
      
      if (!user) {
          req.user = { clerkId, role: 'new' }; 
      } else {
          req.user = user;
          req.user.role = role || user.role; 

          // Enforce suspension
          if (req.user.status === 'suspended') {
            return res.status(403).json({ message: 'Account suspended. Please contact support.' });
          }
      }
      
      next();
  } catch (error) {
      // If Clerk fails, check if it's a legacy Bearer token (Admin)?
      // No, let's keep 'protect' strictly for Clerk.
      // Admin routes will use 'protectAdmin'.
      console.error('Clerk Auth Error:', error.message); 
      res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Custom Admin Protection (JWT)
exports.protectAdmin = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token
            req.user = await User.findById(decoded.id).select('-password');
            
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Not authorized as admin' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Role Authorization
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || (req.user.role !== 'new' && !roles.includes(req.user.role))) {
      return res.status(403).json({ 
        message: `User role ${req.user?.role} is not authorized to access this route`
      });
    }
    next();
  };
};
