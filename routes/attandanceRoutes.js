const express = require('express');
const router = express.Router();
const axios = require('axios')
const attandanceController = require('../controllers/attandanceController');

//  router.get('/validPunches', attandanceController.getMatchedLabourIdsWithValidPunch);
// router.get('/vaild-punch', attandanceController.getValidPunches)
router.post('/updateStatus', attandanceController.updateAttandaceStatus)
 router.get("/subprojects", async (req, res) => {
    try {
        const response = await axios.get("https://api.vjerp.com/api/subBusinessUnit", {
            headers: {
                Authorization:
                    "20a763e266308b35fc75feca4b053d5ce8ea540dbdaa77ee13b1a5e7ce8aadcf",
            },
        });
        res.json(response.data);
        console.log('response'  , response.data);
        
    } catch (error) {
        console.error("Error fetching subprojects:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch subprojects" });
    }
});

module.exports = router;