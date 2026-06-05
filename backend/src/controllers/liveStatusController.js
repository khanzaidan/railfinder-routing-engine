'use strict';

/**
 * Live Status Controller — Mock Data Layer
 *
 * API-Ready: In production, replace MOCK_LIVE_DB with an async call to
 * the RapidAPI train-tracking endpoint:
 *   GET /indian-railway-irctc.p.rapidapi.com/api/trains/v1/train/status
 * The response shape here mirrors a normalised version of that payload.
 */

const MOCK_LIVE_DB = {

  '12487': {
    trainNo:             '12487',
    trainName:           'Seemanchal Express',
    trainType:           'Superfast',
    runDate:             '2026-06-11',
    currentDelay:        25,
    delayTrend:          'INCREASING',   // INCREASING | DECREASING | STABLE
    speedKmh:            82,
    distanceCoveredKm:   312,
    totalDistanceKm:     1658,
    progressPercent:     18.8,
    lastUpdatedLabel:    'Just now',
    currentZone:         'East Central Railway (ECR)',
    origin:      { code: 'JBN',  name: 'Jogbani',              zone: 'NFR' },
    destination: { code: 'NDLS', name: 'Anand Vihar Terminal',  zone: 'NR'  },
    stops: [
      { sno: 1, code: 'JBN',  name: 'Jogbani',               schArr: null,    schDep: '20:35', actArr: null,    actDep: '20:35', delayMin: 0,  status: 'DEPARTED',  platform: 3, distanceKm: 0    },
      { sno: 2, code: 'KNE',  name: 'Kishanganj',             schArr: '21:18', schDep: '21:20', actArr: '21:18', actDep: '21:21', delayMin: 1,  status: 'DEPARTED',  platform: 2, distanceKm: 52   },
      { sno: 3, code: 'NKE',  name: 'New Katihar',            schArr: '21:58', schDep: '21:59', actArr: '22:00', actDep: '22:02', delayMin: 3,  status: 'DEPARTED',  platform: 1, distanceKm: 128  },
      { sno: 4, code: 'KIR',  name: 'Katihar Junction',       schArr: '22:30', schDep: '22:40', actArr: '22:48', actDep: '23:02', delayMin: 22, status: 'DEPARTED',  platform: 4, distanceKm: 140  },
      { sno: 5, code: 'BGS',  name: 'Barauni Junction',       schArr: '00:25', schDep: '00:30', actArr: null,    actDep: null,    delayMin: 25, status: 'CURRENT',   platform: 2, distanceKm: 312  },
      { sno: 6, code: 'PNBE', name: 'Patna Junction',         schArr: '04:15', schDep: '04:20', actArr: null,    actDep: null,    delayMin: 25, status: 'UPCOMING',  platform: 8, distanceKm: 368  },
      { sno: 7, code: 'DDU',  name: 'Pt. Deen Dayal Upadhyaya Jn', schArr: '12:40', schDep: '12:50', actArr: null, actDep: null, delayMin: 25, status: 'UPCOMING', platform: 6, distanceKm: 760  },
      { sno: 8, code: 'PRYJ', name: 'Prayagraj Junction',     schArr: '15:45', schDep: '15:55', actArr: null,    actDep: null,    delayMin: 25, status: 'UPCOMING',  platform: 9, distanceKm: 896  },
      { sno: 9, code: 'CNB',  name: 'Kanpur Central',         schArr: '20:15', schDep: '20:25', actArr: null,    actDep: null,    delayMin: 25, status: 'UPCOMING',  platform: 4, distanceKm: 1113 },
      { sno:10, code: 'NDLS', name: 'Anand Vihar Terminal',   schArr: '08:05', schDep: null,    actArr: null,    actDep: null,    delayMin: 25, status: 'UPCOMING',  platform:16, distanceKm: 1658 },
    ],
  },

  '12533': {
    trainNo:             '12533',
    trainName:           'Pushpak Express',
    trainType:           'Superfast',
    runDate:             '2026-06-11',
    currentDelay:        0,
    delayTrend:          'STABLE',
    speedKmh:            94,
    distanceCoveredKm:   680,
    totalDistanceKm:     1847,
    progressPercent:     36.8,
    lastUpdatedLabel:    '2 min ago',
    currentZone:         'North Central Railway (NCR)',
    origin:      { code: 'GKP',  name: 'Gorakhpur',   zone: 'NER'  },
    destination: { code: 'CSTM', name: 'Mumbai CSMT', zone: 'CR'   },
    stops: [
      { sno: 1, code: 'GKP',  name: 'Gorakhpur',          schArr: null,    schDep: '17:40', actArr: null,    actDep: '17:40', delayMin: 0, status: 'DEPARTED',  platform: 1, distanceKm: 0    },
      { sno: 2, code: 'LKO',  name: 'Lucknow Junction',   schArr: '21:00', schDep: '21:10', actArr: '21:00', actDep: '21:10', delayMin: 0, status: 'DEPARTED',  platform: 2, distanceKm: 271  },
      { sno: 3, code: 'CNB',  name: 'Kanpur Central',     schArr: '23:10', schDep: '23:15', actArr: '23:10', actDep: '23:15', delayMin: 0, status: 'DEPARTED',  platform: 5, distanceKm: 440  },
      { sno: 4, code: 'RKMP', name: 'Rani Kamlapati',     schArr: '07:22', schDep: '07:32', actArr: null,    actDep: null,    delayMin: 0, status: 'CURRENT',   platform: 3, distanceKm: 866  },
      { sno: 5, code: 'ET',   name: 'Itarsi Junction',    schArr: '10:40', schDep: '10:50', actArr: null,    actDep: null,    delayMin: 0, status: 'UPCOMING',  platform: 1, distanceKm: 1068 },
      { sno: 6, code: 'NGP',  name: 'Nagpur Junction',    schArr: '15:25', schDep: '15:35', actArr: null,    actDep: null,    delayMin: 0, status: 'UPCOMING',  platform: 4, distanceKm: 1330 },
      { sno: 7, code: 'CSTM', name: 'Mumbai CSMT',        schArr: '21:35', schDep: null,    actArr: null,    actDep: null,    delayMin: 0, status: 'UPCOMING',  platform: 8, distanceKm: 1847 },
    ],
  },

  '12309': {
    trainNo:             '12309',
    trainName:           'Rajdhani Express',
    trainType:           'Rajdhani',
    runDate:             '2026-06-12',
    currentDelay:        10,
    delayTrend:          'DECREASING',
    speedKmh:            112,
    distanceCoveredKm:   143,
    totalDistanceKm:     1003,
    progressPercent:     14.3,
    lastUpdatedLabel:    '1 min ago',
    currentZone:         'East Central Railway (ECR)',
    origin:      { code: 'PNBE', name: 'Patna Junction', zone: 'ECR' },
    destination: { code: 'NDLS', name: 'New Delhi',       zone: 'NR'  },
    stops: [
      { sno: 1, code: 'PNBE', name: 'Patna Junction',         schArr: null,    schDep: '19:35', actArr: null,    actDep: '19:35', delayMin: 0,  status: 'DEPARTED',  platform: 1, distanceKm: 0    },
      { sno: 2, code: 'DDU',  name: 'Pt. Deen Dayal Upadhyaya Jn', schArr: '22:45', schDep: '22:55', actArr: '22:52', actDep: null, delayMin: 10, status: 'CURRENT', platform: 6, distanceKm: 143  },
      { sno: 3, code: 'PRYJ', name: 'Prayagraj Junction',     schArr: '01:30', schDep: '01:40', actArr: null,    actDep: null,    delayMin: 10, status: 'UPCOMING',  platform: 7, distanceKm: 279  },
      { sno: 4, code: 'CNB',  name: 'Kanpur Central',         schArr: '03:40', schDep: '03:45', actArr: null,    actDep: null,    delayMin: 10, status: 'UPCOMING',  platform: 3, distanceKm: 496  },
      { sno: 5, code: 'NDLS', name: 'New Delhi',              schArr: '07:00', schDep: null,    actArr: null,    actDep: null,    delayMin: 10, status: 'UPCOMING',  platform:12, distanceKm: 1003 },
    ],
  },

};

async function getLiveStatus(req, res) {
  const { trainNo } = req.params;

  if (!trainNo || !/^\d{4,5}$/.test(trainNo)) {
    return res.status(400).json({ error: 'Invalid train number. Must be 4-5 digits.' });
  }

  const data = MOCK_LIVE_DB[trainNo];
  if (!data) {
    return res.status(404).json({ error: 'Train not found in demo database.', trainNo });
  }

  return res.json(data);
}

module.exports = { getLiveStatus };
