/**
 * seed.js — populate the Reference Match Broker with representative OAP tool manifests.
 * Run: node seed.js
 */
'use strict';

const http = require('http');

const BROKER = 'http://localhost:3100';

const MANIFESTS = [
  {
    provider_did: 'did:web:weather-pro.example',
    manifest: {
      name: 'WeatherPro API',
      description: 'High-resolution weather forecasts and historical climate data for any location on Earth. Supports METAR, TAF, GFS, ECMWF data sources.',
      categories: ['weather', 'climate', 'meteorology', 'geospatial'],
      actions: {
        'weather.forecast.hourly':  { description: 'Hourly forecast for next 10 days', unit_cost_usd: 0.0005 },
        'weather.forecast.daily':   { description: 'Daily forecast for next 30 days', unit_cost_usd: 0.0002 },
        'weather.historical':       { description: 'Historical climate data 1950-present', unit_cost_usd: 0.001 },
        'weather.alerts':           { description: 'Severe weather alerts in real time', unit_cost_usd: 0.0001 }
      },
      conformance_level: 3,
      reputation_score:  0.94,
      avg_cost_usd:      0.0005,
      risk_class:        'low',
      jurisdictions:     ['EU', 'US', 'GLOBAL'],
      updated_at:        '2026-04-01T00:00:00Z'
    }
  },
  {
    provider_did: 'did:web:legal-research.example',
    manifest: {
      name: 'LexAI Legal Research',
      description: 'AI-powered legal research covering EU law, German federal law, case law from BGH and BVerfG, and EUR-Lex. GDPR and attorney-client privilege compliant.',
      categories: ['legal', 'research', 'compliance', 'gdpr', 'eu-law'],
      actions: {
        'legal.search.case_law':   { description: 'Full-text case law search', unit_cost_usd: 0.02 },
        'legal.search.statute':    { description: 'Statute and regulation lookup', unit_cost_usd: 0.005 },
        'legal.summarize':         { description: 'Legal document summarization', unit_cost_usd: 0.01 },
        'legal.gdpr.check':        { description: 'GDPR compliance assessment', unit_cost_usd: 0.05 }
      },
      conformance_level: 4,
      reputation_score:  0.97,
      avg_cost_usd:      0.02,
      risk_class:        'medium',
      jurisdictions:     ['EU', 'DE', 'AT', 'CH'],
      updated_at:        '2026-04-10T00:00:00Z'
    }
  },
  {
    provider_did: 'did:web:translation-hub.example',
    manifest: {
      name: 'TranslationHub',
      description: 'Neural machine translation supporting 120 language pairs. DeepL-quality output with certified translations for legal and medical contexts.',
      categories: ['translation', 'nlp', 'language', 'localization'],
      actions: {
        'translate.text':          { description: 'Text translation up to 10k characters', unit_cost_usd: 0.00002 },
        'translate.document':      { description: 'Full document translation preserving formatting', unit_cost_usd: 0.005 },
        'translate.certified':     { description: 'Certified translation with notary stamp', unit_cost_usd: 0.50 }
      },
      conformance_level: 2,
      reputation_score:  0.88,
      avg_cost_usd:      0.00002,
      risk_class:        'low',
      jurisdictions:     ['GLOBAL'],
      updated_at:        '2026-03-15T00:00:00Z'
    }
  },
  {
    provider_did: 'did:web:finance-data.example',
    manifest: {
      name: 'FinanceData Pro',
      description: 'Real-time and historical market data: equities, ETFs, bonds, FX, and crypto. MiFID II compliant data distribution. Licensed from major exchanges.',
      categories: ['finance', 'market-data', 'stocks', 'crypto', 'fx', 'mifid'],
      actions: {
        'finance.quote.realtime':  { description: 'Real-time quote for any listed instrument', unit_cost_usd: 0.0001 },
        'finance.history':         { description: 'OHLCV historical data', unit_cost_usd: 0.001 },
        'finance.fx.rate':         { description: 'Live FX rates for 150 currency pairs', unit_cost_usd: 0.00005 },
        'finance.earnings':        { description: 'Earnings calendar and estimates', unit_cost_usd: 0.002 }
      },
      conformance_level: 3,
      reputation_score:  0.91,
      avg_cost_usd:      0.001,
      risk_class:        'medium',
      jurisdictions:     ['EU', 'US', 'UK'],
      updated_at:        '2026-04-20T00:00:00Z'
    }
  },
  {
    provider_did: 'did:web:compute-grid.example',
    manifest: {
      name: 'ComputeGrid',
      description: 'On-demand GPU and CPU compute for batch ML inference, data processing, and scientific simulation. ISO 27001 certified, EU data residency guaranteed.',
      categories: ['compute', 'gpu', 'ml-inference', 'batch-processing', 'cloud'],
      actions: {
        'compute.gpu.inference':   { description: 'GPU batch inference job', unit_cost_usd: 0.10 },
        'compute.cpu.batch':       { description: 'CPU batch job up to 1000 vCPUs', unit_cost_usd: 0.05 },
        'compute.storage.object':  { description: 'Object storage per GB-month', unit_cost_usd: 0.02 }
      },
      conformance_level: 3,
      reputation_score:  0.85,
      avg_cost_usd:      0.10,
      risk_class:        'low',
      jurisdictions:     ['EU'],
      updated_at:        '2026-04-05T00:00:00Z'
    }
  },
  {
    provider_did: 'did:web:health-data.example',
    manifest: {
      name: 'HealthRecord API',
      description: 'Anonymized clinical data for medical research. GDPR compliant, HIPAA aligned. Covers ICD-10, SNOMED CT, HL7 FHIR R4 resources.',
      categories: ['health', 'medical', 'fhir', 'clinical-data', 'research'],
      actions: {
        'health.fhir.patient':     { description: 'FHIR Patient resource retrieval', unit_cost_usd: 0.01 },
        'health.icd.lookup':       { description: 'ICD-10 code lookup and classification', unit_cost_usd: 0.001 },
        'health.drug.interaction': { description: 'Drug-drug interaction check', unit_cost_usd: 0.005 }
      },
      conformance_level: 4,
      reputation_score:  0.96,
      avg_cost_usd:      0.005,
      risk_class:        'high',
      jurisdictions:     ['EU', 'DE'],
      updated_at:        '2026-04-15T00:00:00Z'
    }
  },
  {
    provider_did: 'did:web:document-ai.example',
    manifest: {
      name: 'DocumentAI',
      description: 'Document understanding and extraction: PDF parsing, OCR, table extraction, invoice processing, contract analysis, and form recognition.',
      categories: ['document', 'ocr', 'extraction', 'pdf', 'invoice', 'contract'],
      actions: {
        'doc.extract.text':        { description: 'Text extraction from PDF or image', unit_cost_usd: 0.002 },
        'doc.extract.table':       { description: 'Table detection and extraction', unit_cost_usd: 0.005 },
        'doc.classify':            { description: 'Document type classification', unit_cost_usd: 0.001 },
        'doc.invoice.parse':       { description: 'Structured invoice data extraction', unit_cost_usd: 0.01 }
      },
      conformance_level: 2,
      reputation_score:  0.82,
      avg_cost_usd:      0.005,
      risk_class:        'low',
      jurisdictions:     ['GLOBAL'],
      updated_at:        '2026-03-01T00:00:00Z'
    }
  },
  {
    provider_did: 'did:web:email-sender.example',
    manifest: {
      name: 'MessageRelay',
      description: 'Transactional email, SMS, and push notification delivery. High deliverability via major ESP partnerships. GDPR compliant opt-out management.',
      categories: ['email', 'sms', 'notification', 'messaging', 'transactional'],
      actions: {
        'message.email.send':      { description: 'Transactional email delivery', unit_cost_usd: 0.0001 },
        'message.sms.send':        { description: 'SMS delivery in 190 countries', unit_cost_usd: 0.005 },
        'message.push.send':       { description: 'Mobile push notification', unit_cost_usd: 0.00005 }
      },
      conformance_level: 1,
      reputation_score:  0.79,
      avg_cost_usd:      0.0001,
      risk_class:        'low',
      jurisdictions:     ['GLOBAL'],
      updated_at:        '2026-02-10T00:00:00Z'
    }
  }
];

async function post (path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(`${BROKER}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function seed () {
  console.log('Seeding OAP Reference Match Broker...\n');
  for (const m of MANIFESTS) {
    const r = await post('/oap/manifests', m);
    if (r.status === 201) {
      console.log(`  REGISTERED  ${m.manifest.name}  leaf_index=${r.body.leaf_index}  hash=${r.body.leaf_hash.slice(0,12)}…`);
    } else {
      console.error(`  FAILED      ${m.manifest.name}`, r.body);
    }
  }
  console.log('\nSeed complete.');
}

seed().catch(console.error);
