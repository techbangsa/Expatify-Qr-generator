#!/usr/bin/env node

/**
 * QRWeaver Web Server - Bulk QR Code Generator
 * 
 * Web interface for generating QR codes from CSV upload
 * Usage: npm start   (then open http://localhost:3000)
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 3000;

// Use /tmp in Vercel serverless, local dir otherwise
const IS_VERCEL = !!process.env.VERCEL;
const UPLOAD_DIR = IS_VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads');
const TEMP_DIR = IS_VERCEL ? '/tmp/qr-temp' : path.join(__dirname, 'temp');

// Configure multer for CSV uploads
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.txt'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file CSV/TXT yang diperbolehkan'));
    }
  }
});

// QR Code config
const QR_OPTIONS = {
  errorCorrectionLevel: 'M',
  type: 'image/png',
  quality: 0.92,
  margin: 1,
  color: { dark: '#000000', light: '#FFFFFF' },
  width: 300
};

const MAX_ITEMS = 50000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Sample CSV download
app.get('/api/sample', (req, res) => {
  const samplePath = path.join(__dirname, 'sample-100.csv');
  if (fs.existsSync(samplePath)) {
    res.download(samplePath, 'sample-100.csv');
  } else {
    // Generate a sample on the fly if file doesn't exist
    let csv = 'SERIAL NUMBER\n';
    for (let i = 1; i <= 100; i++) {
      csv += `SN-01-${String(i).padStart(7, '0')}\n`;
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sample-100.csv"');
    res.send(csv);
  }
});

// SSE endpoint for progress updates
const progressClients = new Map();

/**
 * Parse CSV content
 */
function parseCSV(content) {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length > 0) {
    const firstLine = lines[0].toUpperCase();
    const headerKeywords = [
      'SERIAL', 'NUMBER', 'URL', 'DATA', 'TEXT', 'ID',
      'CODE', 'VALUE', 'ITEM', 'NAME', 'LINK'
    ];
    const looksLikeHeader = headerKeywords.some(kw => firstLine.includes(kw)) &&
      !firstLine.match(/^[A-Z]{2,3}-\d/) &&
      !firstLine.startsWith('HTTP');

    if (looksLikeHeader) {
      return { items: lines.slice(1), skippedHeader: lines[0] };
    }
  }
  return { items: lines, skippedHeader: null };
}

/**
 * POST /api/generate
 * Upload CSV → generate QR codes → return ZIP
 */
app.post('/api/generate', upload.single('csvfile'), async (req, res) => {
  const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const tempDir = path.join(TEMP_DIR, jobId);
  let uploadedFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diupload' });
    }

    uploadedFilePath = req.file.path;

    // Read & parse CSV
    const content = fs.readFileSync(req.file.path, 'utf-8');
    const { items, skippedHeader } = parseCSV(content);

    if (items.length === 0) {
      return res.status(400).json({ error: 'File CSV kosong atau tidak memiliki data yang valid' });
    }
    if (items.length > MAX_ITEMS) {
      return res.status(400).json({ error: `Terlalu banyak data (${items.length}). Maksimal ${MAX_ITEMS} baris.` });
    }

    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });

    // Generate QR codes in batches with progress
    const batchSize = 50;
    const totalBatches = Math.ceil(items.length / batchSize);
    const results = [];

    for (let b = 0; b < totalBatches; b++) {
      const batch = items.slice(b * batchSize, (b + 1) * batchSize);
      const batchPromises = batch.map((item, i) => {
        const idx = b * batchSize + i;
        const filename = `qr-${String(idx + 1).padStart(5, '0')}.png`;
        const filePath = path.join(tempDir, filename);
        return QRCode.toFile(filePath, item, QR_OPTIONS)
          .then(() => ({ success: true, index: idx + 1, data: item, filename }))
          .catch(err => ({ success: false, index: idx + 1, data: item, filename, error: err.message }));
      });
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    // Create manifest
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    const manifest = {
      generatedAt: new Date().toISOString(),
      totalItems: items.length,
      successCount,
      failedCount,
      skippedHeader,
      items: results.map(r => ({
        index: r.index,
        data: r.data,
        filename: r.filename,
        status: r.success ? 'success' : 'failed',
        error: r.error || null
      }))
    };

    fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    // CSV mapping
    const csvLines = ['Index,Data,Filename,Status'];
    manifest.items.forEach(item => {
      csvLines.push(`${item.index},"${item.data}",${item.filename},${item.status}`);
    });
    fs.writeFileSync(path.join(tempDir, 'mapping.csv'), csvLines.join('\n'));

    // Create ZIP and stream it
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="qr-codes-${jobId}.zip"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', err => { throw err; });
    archive.pipe(res);
    archive.directory(tempDir, false);
    await archive.finalize();

    // Cleanup after response
    res.on('finish', () => {
      cleanup(tempDir, uploadedFilePath);
    });

  } catch (error) {
    console.error('Generation error:', error);
    cleanup(tempDir, uploadedFilePath);
    if (!res.headersSent) {
      res.status(500).json({ error: `Gagal generate QR codes: ${error.message}` });
    }
  }
});

/**
 * POST /api/preview - Preview CSV content
 */
app.post('/api/preview', upload.single('csvfile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diupload' });
    }

    const content = fs.readFileSync(req.file.path, 'utf-8');
    const { items, skippedHeader } = parseCSV(content);

    // Cleanup uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      totalItems: items.length,
      skippedHeader,
      preview: items.slice(0, 10),
      hasMore: items.length > 10
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cleanup temp files
 */
function cleanup(tempDir, uploadedFile) {
  try {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    if (uploadedFile && fs.existsSync(uploadedFile)) {
      fs.unlinkSync(uploadedFile);
    }
  } catch (e) {
    console.warn('Cleanup warning:', e.message);
  }
}

// Ensure temp/upload directories exist
[UPLOAD_DIR, TEMP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Export for Vercel serverless
module.exports = app;

// Start server only in local dev (not on Vercel)
if (!IS_VERCEL) {
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       Expatify - Bulk QR Code Generator (Web UI)             ║
╚═══════════════════════════════════════════════════════════════╝

  🌐  Server berjalan di: http://localhost:${PORT}
  📂  Buka browser dan upload file CSV kamu

  Tekan Ctrl+C untuk stop server
`);
  });
}
