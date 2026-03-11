const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  saveRoadmap,
  getRoadmaps,
  getRoadmap,
  deleteRoadmap,
  updateRoadmapNode,
  completeRoadmap,
  adaptActiveRoadmap,
} = require('../controllers/roadmapController');

router.post('/save', protect, saveRoadmap);
router.get('/', protect, getRoadmaps);
router.patch('/:id/nodes/:nodeIndex', protect, updateRoadmapNode);
router.post('/:id/complete', protect, completeRoadmap);
router.post('/adapt-active', protect, adaptActiveRoadmap);
router.get('/:id', protect, getRoadmap);
router.delete('/:id', protect, deleteRoadmap);

module.exports = router;