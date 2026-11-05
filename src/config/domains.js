// Clinical thresholds and defaults are configuration so each domain can be reviewed and
// extended independently. All clinical rules below NEEDS CLINICAL REVIEW before production.
export const RISK_LEVELS = {
  // NEEDS CLINICAL REVIEW
  HIGH_AT: 8,
  // NEEDS CLINICAL REVIEW
  MEDIUM_AT: 4
};

export const DOMAINS = {
  pregnancy: {
    id: 'pregnancy',
    label: 'Pregnancy',
    labelTa: 'கர்ப்பம்',
    labelHi: 'गर्भावस्था',
    icon: 'Baby',
    detailFields: ['weeks', 'edd'],
    dangerSigns: ['headache', 'bleeding', 'swelling', 'blurred vision', 'reduced baby movement', 'convulsions'],
    nextDueLabel: 'Next ANC visit',
    // NEEDS CLINICAL REVIEW
    defaultFollowUpDays: { HIGH: 7, MEDIUM: 14, LOW: 28 },
    rules: {
      // NEEDS CLINICAL REVIEW
      bloodPressure: { systolicAtLeast: 140, diastolicAtLeast: 90, points: 5 },
      // NEEDS CLINICAL REVIEW
      dangerSigns: { points: 5 },
      // NEEDS CLINICAL REVIEW
      overdue: { graceDays: 7, points: 3 },
      // NEEDS CLINICAL REVIEW
      weeksAtLeast: { value: 36, points: 2 },
      // NEEDS CLINICAL REVIEW
      hbBelow: { value: 11, points: 2 }
    }
  },
  cancer: {
    id: 'cancer',
    label: 'Cancer care',
    labelTa: 'புற்றுநோய் பராமரிப்பு',
    labelHi: 'कैंसर देखभाल',
    icon: 'Ribbon',
    detailFields: ['cancerType', 'stage', 'protocol', 'cycleNumber', 'nextChemoDate'],
    dangerSigns: ['fever', 'bleeding'],
    nextDueLabel: 'Next oncology appointment',
    // NEEDS CLINICAL REVIEW
    defaultFollowUpDays: { HIGH: 1, MEDIUM: 7, LOW: 28 },
    rules: {
      // NEEDS CLINICAL REVIEW
      overdue: { graceDays: 0, points: 4 },
      // NEEDS CLINICAL REVIEW
      dangerSigns: { points: 8 },
      // NEEDS CLINICAL REVIEW
      missedCycle: { points: 4 }
    }
  },
  diabetes: {
    id: 'diabetes',
    label: 'Diabetes care',
    labelTa: 'நீரிழிவு பராமரிப்பு',
    labelHi: 'मधुमेह देखभाल',
    icon: 'Droplets',
    detailFields: ['diabetesType', 'lastFastingSugar', 'lastHbA1c', 'nextCheckupDate'],
    dangerSigns: ['hypoglycemia', 'low sugar'],
    nextDueLabel: 'Next diabetes checkup',
    // NEEDS CLINICAL REVIEW
    defaultFollowUpDays: { HIGH: 1, MEDIUM: 7, LOW: 30 },
    rules: {
      // NEEDS CLINICAL REVIEW
      fastingSugarAtLeast: { value: 126, points: 4 },
      // NEEDS CLINICAL REVIEW
      randomSugarAtLeast: { value: 250, points: 8 },
      // NEEDS CLINICAL REVIEW
      sugarBelow: { value: 70, points: 8 },
      // NEEDS CLINICAL REVIEW
      hbA1cAbove: { value: 9, points: 8 },
      // NEEDS CLINICAL REVIEW
      overdue: { graceDays: 0, points: 4 }
    }
  }
};

export function getDomain(domainId) {
  return DOMAINS[domainId] || null;
}
