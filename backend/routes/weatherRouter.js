import { Router } from 'express';
const router = Router();
import { fetchWeatherData, fetchBulkWeatherData } from '../services/weatherService.js';

// =====================================================================
// Cache mechanism to avoid too many API calls
const cache = {
    data: {},
    timestamp: null,
    CACHE_DURATION: 30 * 60 * 1000 // 30 minutes
};

// Utility function to check if cache is valid
const isCacheValid = () => {
    return cache.timestamp && (Date.now() - cache.timestamp) < cache.CACHE_DURATION;
};

// Get weather for multiple locations
router.post('/bulk', async (req, res) => {
    try {
      const { locations } = req.body;
      
      if (!Array.isArray(locations)) {
        return res.status(400).json({ error: 'Locations must be an array' });
        }
        
        // const currentDate = new Date();
        // const yesterdayDate = new Date(currentDate);
        // yesterdayDate.setDate(currentDate.getDate() - 1);
        
        // const startDate = yesterdayDate.toISOString().split('T')[0];
        // const endDate = currentDate.toISOString().split('T')[0];

        // Check cache first
        // const cacheKey = `${startDate}-${endDate}-${JSON.stringify(locations)}`;
        // if (isCacheValid() && cache.data[cacheKey]) {
        //     return res.json(cache.data[cacheKey]);
        //   }
          
        const cacheKey = JSON.stringify(locations);
        if (isCacheValid() && cache.data[cacheKey]) {
            return res.json(cache.data[cacheKey]);
        }

        const data = await fetchBulkWeatherData(locations);
        
        // Update cache
        cache.data[cacheKey] = data;
        cache.timestamp = Date.now();

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get weather for single location
router.get('/single/:lat/:lon', async (req, res) => {
    try {
      const { lat, lon } = req.params;

      const cacheKey = `${lat}-${lon}`;
      if (isCacheValid() && cache.data[cacheKey]) {
          return res.json(cache.data[cacheKey]);
      }

      const data = await fetchWeatherData(lat, lon);

      // Update cache
      cache.data[cacheKey] = data;
      cache.timestamp = Date.now();

      res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// -------------------------------------------------------------------

export default router;
