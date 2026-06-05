'use strict';

/**
 * PNR Controller — Mock Data Layer
 *
 * API-Ready: In production, replace MOCK_PNR_DB with an async call to
 * the IRCTC RapidAPI:  GET /irctc1.p.rapidapi.com/api/v3/getPNRStatus?pnrNumber={pnr}
 * The response shape returned here mirrors a normalised version of that API.
 */

const MOCK_PNR_DB = {

  '2103456789': {
    pnr:            '2103456789',
    fetchedAt:      '2026-06-11T14:32:18',
    statusCode:     'CNF',
    statusLabel:    'CONFIRMED',
    chartStatus:    'CHARTED',
    chartPreparedAt:'2026-06-10T18:00:00',
    cancellationAllowed: true,
    refundOnCancel: 993,
    insuranceActive: true,
    journey: {
      trainNo:            '12487',
      trainName:          'Seemanchal Express',
      trainType:          'Superfast',
      travelClass:        '3A',
      quota:              'GN',
      boardingDateFmt:    'Thu, 11 Jun 2026',
      origin:      { code: 'JBN',  name: 'Jogbani',            departure: '20:35', platform: 3 },
      destination: { code: 'RKMP', name: 'Rani Kamlapati',     arrival:   '07:22', arrivalDayLabel: '+2 Days', platform: 5 },
      distanceKm:    1539,
      durationLabel: '34h 47m',
    },
    passengers: [
      { sno: 1, name: 'RAHUL KUMAR',  age: 34, gender: 'M', status: 'CNF', coach: 'B3', berth: '45', berthType: 'LB', concession: 'NONE' },
      { sno: 2, name: 'PRIYA KUMARI', age: 29, gender: 'F', status: 'CNF', coach: 'B3', berth: '46', berthType: 'MB', concession: 'NONE' },
    ],
    fare: { base: 1055, reservation: 60, superfastCharge: 75, gst: 55, insurance: 0,  total: 1245 },
    coachPosition: 7,
    totalCoaches:  24,
  },

  '3405567123': {
    pnr:            '3405567123',
    fetchedAt:      '2026-06-11T22:05:44',
    statusCode:     'CNF',
    statusLabel:    'CONFIRMED',
    chartStatus:    'CHARTED',
    chartPreparedAt:'2026-06-11T08:30:00',
    cancellationAllowed: true,
    refundOnCancel: 1512,
    insuranceActive: false,
    journey: {
      trainNo:            '12533',
      trainName:          'Pushpak Express',
      trainType:          'Superfast',
      travelClass:        '2A',
      quota:              'GN',
      boardingDateFmt:    'Thu, 11 Jun 2026',
      origin:      { code: 'CNB',  name: 'Kanpur Central',     departure: '23:10', platform: 5 },
      destination: { code: 'RKMP', name: 'Rani Kamlapati',     arrival:   '07:22', arrivalDayLabel: '+1 Day', platform: 3 },
      distanceKm:    426,
      durationLabel: '8h 12m',
    },
    passengers: [
      { sno: 1, name: 'AMIT SHARMA', age: 45, gender: 'M', status: 'CNF', coach: 'A1', berth: '5', berthType: 'LB', concession: 'NONE' },
    ],
    fare: { base: 1620, reservation: 60, superfastCharge: 75, gst: 135, insurance: 0, total: 1890 },
    coachPosition: 3,
    totalCoaches:  22,
  },

  '5512309876': {
    pnr:            '5512309876',
    fetchedAt:      '2026-06-12T07:10:02',
    statusCode:     'WL',
    statusLabel:    'WAITLISTED',
    chartStatus:    'NOT CHARTED',
    chartPreparedAt: null,
    cancellationAllowed: true,
    refundOnCancel: 2310,
    insuranceActive: true,
    journey: {
      trainNo:            '12309',
      trainName:          'Rajdhani Express',
      trainType:          'Rajdhani',
      travelClass:        '3A',
      quota:              'GN',
      boardingDateFmt:    'Fri, 12 Jun 2026',
      origin:      { code: 'PNBE', name: 'Patna Junction', departure: '19:35', platform: 1 },
      destination: { code: 'NDLS', name: 'New Delhi',       arrival:   '07:00', arrivalDayLabel: '+1 Day', platform: 12 },
      distanceKm:    1003,
      durationLabel: '11h 25m',
    },
    passengers: [
      { sno: 1, name: 'SNEHA GUPTA', age: 27, gender: 'F', status: 'WL 3', coach: '—', berth: '—', berthType: '—', concession: 'NONE' },
      { sno: 2, name: 'ARJUN GUPTA', age: 30, gender: 'M', status: 'WL 4', coach: '—', berth: '—', berthType: '—', concession: 'NONE' },
    ],
    fare: { base: 1980, reservation: 60, superfastCharge: 75, gst: 195, insurance: 0, total: 2310 },
    coachPosition: null,
    totalCoaches:  18,
  },

};

async function getPnrStatus(req, res) {
  const { pnr } = req.params;

  if (!pnr || !/^\d{10}$/.test(pnr)) {
    return res.status(400).json({ error: 'Invalid PNR. Must be exactly 10 digits.' });
  }

  const data = MOCK_PNR_DB[pnr];
  if (!data) {
    return res.status(404).json({ error: 'PNR not found in demo database.', pnr });
  }

  return res.json(data);
}

module.exports = { getPnrStatus };
