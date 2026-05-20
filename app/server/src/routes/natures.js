const { Router } = require('express');
const naturesService = require('../services/natures');

const router = Router();

router.get('/', (req, res) => {
  res.json(naturesService.getAll());
});

module.exports = router;
