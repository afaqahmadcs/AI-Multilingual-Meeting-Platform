import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import {
  URDU_TO_ENGLISH_DATASET,
  ENGLISH_TO_URDU_DATASET,
  TestCase,
} from './dataset.js';
import { OpenAIAdapter } from '../adapters/openai.adapter.js';
import { AzureAdapter } from '../adapters/azure.adapter.js';
import { MockTranslationProvider } from '../adapters/mock.adapter.js';
import { ITranslationProvider } from '../interfaces/translation.interface.js';

interface ResultRow {
  id: string;
  category: string;
  direction: string;
  sourceText: string;
  referenceTranslation: string;
  generatedTranslation: string;
  latencyMs: number;
  status: 'SUCCESS' | 'FALLBACK_TRIGGERED' | 'FAILED';
  error?: string;
}

async function runTestSuite() {
  console.log('\n===============================================================');
  console.log('   LinguaMeet - Phase 1: 100-Sentence Translation Test Suite   ');
  console.log('===============================================================\n');

  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasAzure = Boolean(process.env.AZURE_SPEECH_KEY);

  let provider: ITranslationProvider;
  if (hasOpenAI) {
    provider = new OpenAIAdapter();
  } else if (hasAzure) {
    provider = new AzureAdapter();
  } else {
    provider = new MockTranslationProvider();
  }

  console.log(`Active Translation Provider: ${provider.providerName}`);
  console.log(`OpenAI API Key: ${hasOpenAI ? 'Configured' : 'Not configured'}`);
  console.log(`Azure Speech Key: ${hasAzure ? 'Configured' : 'Not configured'}`);
  console.log('---------------------------------------------------------------\n');

  const results: ResultRow[] = [];

  // Helper to execute a dataset
  async function testCases(cases: TestCase[], directionLabel: string) {
    console.log(`Running ${cases.length} test cases for ${directionLabel}...`);
    for (let i = 0; i < cases.length; i++) {
      const tc = cases[i];
      const start = Date.now();
      try {
        const res = await provider.translate(tc.sourceText, tc.sourceLanguage, tc.targetLanguage);
        results.push({
          id: tc.id,
          category: tc.category,
          direction: directionLabel,
          sourceText: tc.sourceText,
          referenceTranslation: tc.referenceTranslation,
          generatedTranslation: res.translatedText,
          latencyMs: res.latencyMs,
          status: 'SUCCESS',
        });
      } catch (err: any) {
        // Fallback requirement: when translation fails, fallback to source text
        const latency = Date.now() - start;
        results.push({
          id: tc.id,
          category: tc.category,
          direction: directionLabel,
          sourceText: tc.sourceText,
          referenceTranslation: tc.referenceTranslation,
          generatedTranslation: tc.sourceText, // Fallback to source
          latencyMs: latency,
          status: 'FALLBACK_TRIGGERED',
          error: err.message,
        });
      }
    }
  }

  // Run Urdu -> English (50)
  await testCases(URDU_TO_ENGLISH_DATASET, 'Urdu -> English');

  // Run English -> Urdu (50)
  await testCases(ENGLISH_TO_URDU_DATASET, 'English -> Urdu');

  // Calculate Metrics
  const total = results.length;
  const successful = results.filter((r) => r.status === 'SUCCESS').length;
  const fallbacks = results.filter((r) => r.status === 'FALLBACK_TRIGGERED').length;
  const latencies = results.map((r) => r.latencyMs);
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / total);
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);

  console.log('\n===============================================================');
  console.log('                      TEST RUN SUMMARY                         ');
  console.log('===============================================================');
  console.log(`Total Sentences Tested: ${total}`);
  console.log(`- Successful Translations: ${successful} / ${total} (${Math.round((successful / total) * 100)}%)`);
  console.log(`- Fallbacks Triggered:    ${fallbacks} / ${total}`);
  console.log(`- Average Latency:        ${avgLatency} ms`);
  console.log(`- Latency Range:          ${minLatency} ms - ${maxLatency} ms`);
  console.log('===============================================================\n');

  // Generate Markdown Report
  let md = `# LinguaMeet: Phase 1 Translation Test Suite Report\n\n`;
  md += `**Execution Date**: ${new Date().toISOString()}\n`;
  md += `**Active Provider**: ${provider.providerName}\n`;
  md += `**Total Sentences**: ${total} (50 Urdu ➔ English, 50 English ➔ Urdu)\n\n`;

  md += `## 1. Summary Statistics\n\n`;
  md += `| Metric | Result |\n`;
  md += `| :--- | :--- |\n`;
  md += `| **Successful Translations** | ${successful} / ${total} (${Math.round((successful / total) * 100)}%) |\n`;
  md += `| **Fallbacks Triggered** | ${fallbacks} |\n`;
  md += `| **Average Latency** | ${avgLatency} ms |\n`;
  md += `| **Min Latency** | ${minLatency} ms |\n`;
  md += `| **Max Latency** | ${maxLatency} ms |\n\n`;

  md += `## 2. Category Performance\n\n`;
  const categories = ['names', 'prices', 'dates', 'technical', 'code_switching', 'conversational'];
  md += `| Category | Total Tested | Successful | Avg Latency |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  for (const cat of categories) {
    const subset = results.filter((r) => r.category === cat);
    if (subset.length > 0) {
      const catSuccess = subset.filter((r) => r.status === 'SUCCESS').length;
      const catAvgLat = Math.round(subset.reduce((a, b) => a + b.latencyMs, 0) / subset.length);
      md += `| **${cat}** | ${subset.length} | ${catSuccess} | ${catAvgLat} ms |\n`;
    }
  }

  md += `\n## 3. Sample Sentence Breakdown (First 10 Urdu ➔ English & English ➔ Urdu)\n\n`;
  md += `| ID | Category | Direction | Source Text | Generated Translation | Latency |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  const sampleRows = [...results.slice(0, 10), ...results.slice(50, 60)];
  for (const r of sampleRows) {
    const cleanSource = r.sourceText.replace(/\|/g, '\\|');
    const cleanGen = r.generatedTranslation.replace(/\|/g, '\\|');
    md += `| \`${r.id}\` | ${r.category} | ${r.direction} | ${cleanSource} | ${cleanGen} | ${r.latencyMs}ms |\n`;
  }

  md += `\n---\n*Report generated by LinguaMeet automated test harness without fabricated metrics.*\n`;

  const reportPath = path.resolve(process.cwd(), 'test-results-report.md');
  fs.writeFileSync(reportPath, md, 'utf-8');
  console.log(`Detailed report saved to: ${reportPath}\n`);
}

runTestSuite().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
