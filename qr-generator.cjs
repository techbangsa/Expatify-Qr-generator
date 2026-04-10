#!/usr/bin/env node

/**
 * QRWeaver Demo - Standalone QR Code Generator
 * 
 * Generate QR codes from CSV without database or external services
 * Usage: node demo-qr-generator.js input.csv [output-folder]
 */

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

// Configuration
const CONFIG = {
  maxItems: 50000,
  outputFormat: 'png',
  qrOptions: {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 0.92,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    width: 300
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           QRWeaver Demo - Bulk QR Code Generator             ║
╚═══════════════════════════════════════════════════════════════╝

Usage:
  node demo-qr-generator.js <input.csv> [output-folder]

Arguments:
  input.csv       Path to CSV file (max 5000 rows)
  output-folder   Optional. Output folder (default: qr-output)

CSV Format:
  - One value per line (no headers required)
  - Each line will generate one QR code
  - Can be URLs, serial numbers, or any text

Example:
  node demo-qr-generator.js serial-numbers.csv ./qr-codes

Features:
  ✓ Process up to 5000 items
  ✓ PNG format (300x300px)
  ✓ High quality output
  ✓ No database required
  ✓ No external services
  ✓ Creates ZIP archive automatically

`);
  process.exit(0);
}

const inputFile = args[0];
const outputFolder = args[1] || 'qr-output';

// Validate input file
if (!fs.existsSync(inputFile)) {
  console.error(`❌ Error: Input file not found: ${inputFile}`);
  process.exit(1);
}

// Create output folder
if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder, { recursive: true });
}

/**
 * Parse CSV file
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  // Auto-detect and skip header row if it looks like a header
  // Common headers: "SERIAL NUMBER", "URL", "DATA", "TEXT", "ID", etc.
  if (lines.length > 0) {
    const firstLine = lines[0].toUpperCase();
    const headerKeywords = [
      'SERIAL', 'NUMBER', 'URL', 'DATA', 'TEXT', 'ID', 
      'CODE', 'VALUE', 'ITEM', 'NAME', 'LINK'
    ];
    
    // Check if first line contains header keywords and no typical data patterns
    const looksLikeHeader = headerKeywords.some(keyword => firstLine.includes(keyword)) &&
                           !firstLine.match(/^[A-Z]{2,3}-\d/) && // Not like "SN-01-0000001"
                           !firstLine.startsWith('HTTP'); // Not a URL
    
    if (looksLikeHeader) {
      console.log(`   ℹ️  Detected header row: "${lines[0]}" - skipping it`);
      return lines.slice(1); // Skip first line
    }
  }
  
  return lines;
}

/**
 * Generate QR code for a single item
 */
async function generateQRCode(data, index, outputPath) {
  try {
    await QRCode.toFile(outputPath, data, CONFIG.qrOptions);
    return { success: true, index, data };
  } catch (error) {
    return { success: false, index, data, error: error.message };
  }
}

/**
 * Generate QR codes in batches
 */
async function generateBatch(items, startIndex, batchSize) {
  const batch = items.slice(startIndex, startIndex + batchSize);
  const promises = batch.map((item, i) => {
    const index = startIndex + i;
    const filename = `qr-${String(index + 1).padStart(5, '0')}.png`;
    const outputPath = path.join(outputFolder, filename);
    return generateQRCode(item, index + 1, outputPath);
  });
  
  return Promise.all(promises);
}

/**
 * Create manifest file
 */
function createManifest(items, results) {
  const manifest = {
    generatedAt: new Date().toISOString(),
    totalItems: items.length,
    successCount: results.filter(r => r.success).length,
    failedCount: results.filter(r => !r.success).length,
    items: items.map((data, index) => ({
      index: index + 1,
      data,
      filename: `qr-${String(index + 1).padStart(5, '0')}.png`,
      status: results[index].success ? 'success' : 'failed',
      error: results[index].error || null
    }))
  };
  
  const manifestPath = path.join(outputFolder, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  // Also create a simple CSV mapping
  const csvMapping = ['Index,Data,Filename,Status\n'];
  manifest.items.forEach(item => {
    csvMapping.push(`${item.index},"${item.data}",${item.filename},${item.status}\n`);
  });
  const csvPath = path.join(outputFolder, 'mapping.csv');
  fs.writeFileSync(csvPath, csvMapping.join(''));
  
  return manifest;
}

/**
 * Create ZIP archive
 */
async function createZipArchive() {
  try {
    const archiver = require('archiver');
    const output = fs.createWriteStream(path.join(outputFolder, '../qr-codes.zip'));
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    return new Promise((resolve, reject) => {
      output.on('close', () => {
        resolve(archive.pointer());
      });
      
      archive.on('error', (err) => {
        reject(err);
      });
      
      archive.pipe(output);
      archive.directory(outputFolder, false);
      archive.finalize();
    });
  } catch (error) {
    // If archiver is not installed, skip ZIP creation
    console.log('\n⚠️  ZIP archive creation skipped (install archiver: npm install archiver)');
    return null;
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Main execution
 */
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           Expatify Custom - Bulk QR Code Generator            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  // Parse CSV
  console.log('📄 Parsing CSV file...');
  const items = parseCSV(inputFile);
  console.log(`✓ Found ${items.length} items`);
  
  // Validate count
  if (items.length === 0) {
    console.error('❌ Error: CSV file is empty');
    process.exit(1);
  }
  
  if (items.length > CONFIG.maxItems) {
    console.error(`❌ Error: Too many items (${items.length}). Maximum is ${CONFIG.maxItems}`);
    console.log('   Consider splitting your CSV into smaller files');
    process.exit(1);
  }
  
  // Show preview
  console.log('\n📋 Preview (first 5 items):');
  items.slice(0, 5).forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.substring(0, 50)}${item.length > 50 ? '...' : ''}`);
  });
  if (items.length > 5) {
    console.log(`   ... and ${items.length - 5} more\n`);
  }
  
  // Generate QR codes
  console.log(`🔄 Generating ${items.length} QR codes...\n`);
  const startTime = Date.now();
  
  const batchSize = 50; // Process 50 at a time
  const totalBatches = Math.ceil(items.length / batchSize);
  const results = [];
  
  for (let i = 0; i < totalBatches; i++) {
    const batchResults = await generateBatch(items, i * batchSize, batchSize);
    results.push(...batchResults);
    
    const progress = Math.round(((i + 1) / totalBatches) * 100);
    const currentItem = Math.min((i + 1) * batchSize, items.length);
    process.stdout.write(`\r   Progress: ${progress}% (${currentItem}/${items.length})`);
  }
  
  console.log('\n');
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Create manifest
  console.log('📝 Creating manifest files...');
  const manifest = createManifest(items, results);
  
  // Calculate output size
  const files = fs.readdirSync(outputFolder);
  let totalSize = 0;
  files.forEach(file => {
    const stats = fs.statSync(path.join(outputFolder, file));
    totalSize += stats.size;
  });
  
  // Create ZIP archive
  console.log('📦 Creating ZIP archive...');
  const zipSize = await createZipArchive();
  
  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                        Summary                                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  console.log(`✓ Total items processed:  ${items.length}`);
  console.log(`✓ Successfully generated: ${manifest.successCount}`);
  if (manifest.failedCount > 0) {
    console.log(`✗ Failed:                 ${manifest.failedCount}`);
  }
  console.log(`✓ Processing time:        ${duration} seconds`);
  console.log(`✓ Average per QR code:    ${(duration / items.length).toFixed(3)} seconds`);
  console.log(`✓ Output folder:          ${outputFolder}`);
  console.log(`✓ Total size:             ${formatBytes(totalSize)}`);
  if (zipSize) {
    console.log(`✓ ZIP archive:            qr-codes.zip (${formatBytes(zipSize)})`);
  }
  
  console.log('\n📁 Output files:');
  console.log(`   • ${manifest.successCount} PNG files (qr-00001.png to qr-${String(items.length).padStart(5, '0')}.png)`);
  console.log('   • manifest.json (detailed generation report)');
  console.log('   • mapping.csv (index, data, filename mapping)');
  if (zipSize) {
    console.log('   • qr-codes.zip (all files compressed)');
  }
  
  if (manifest.failedCount > 0) {
    console.log('\n⚠️  Some QR codes failed to generate. Check manifest.json for details.');
  } else {
    console.log('\n🎉 All QR codes generated successfully!');
  }
  
  console.log('');
}

// Run
main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
