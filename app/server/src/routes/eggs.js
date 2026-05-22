const { Router } = require('express');
const eggsService = require('../services/eggs');
const { authAdmin } = require('../middleware/authAdmin');
const { clearCache } = require('../middleware/apiCache');

const router = Router();

router.get('/', (req, res) => {
  res.json(eggsService.getAll());
});

router.get('/:id', (req, res) => {
  const result = eggsService.getById(+req.params.id);
  if (!result) return res.status(404).json({ error: 'Egg group not found' });
  res.json(result);
});

// Admin: add pet to egg group
router.post('/:id/pets', authAdmin, (req, res) => {
  const { pet_uid } = req.body;
  if (!pet_uid) return res.status(400).json({ error: '缺少 pet_uid' });
  const result = eggsService.addPet(+req.params.id, pet_uid);
  if (result.error) return res.status(400).json({ error: result.error });
  clearCache();
  res.json(result);
});

// Admin: remove pet from egg group (by pet_id)
router.delete('/:id/pets/:petId', authAdmin, (req, res) => {
  const result = eggsService.removePet(+req.params.id, req.params.petId);
  if (result.error) return res.status(400).json({ error: result.error });
  clearCache();
  res.json(result);
});

module.exports = router;
