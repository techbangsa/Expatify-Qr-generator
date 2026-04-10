# QR Bulk Generator

> Standalone command-line tool for generating QR codes in bulk from CSV files

## 🌟 Features

- ✅ Generate up to 5,000 QR codes from a single CSV file
- ✅ High-quality PNG output (300x300px)
- ✅ Automatic ZIP archive creation
- ✅ Progress tracking during generation
- ✅ Detailed manifest and mapping files
- ✅ Auto-detect and skip CSV headers
- ✅ No database or external services required
- ✅ Works completely offline

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed on your system
- A CSV file with data to encode (one value per line)

### Installation

1. **Clone or download this repository**

```bash
git clone <repository-url>
cd qr-bulk-generator
```

2. **Install dependencies**

```bash
npm install
```

That's it! You're ready to generate QR codes.

---

## 📖 Usage

### Basic Command

```bash
node demo-qr-generator.cjs <input.csv> [output-folder]
```

### Arguments

- `input.csv` - Path to your CSV file (required)
- `output-folder` - Optional output directory (default: `qr-output`)

### Examples

**Generate from CSV with default output folder:**
```bash
node demo-qr-generator.cjs sample-100.csv
```

**Specify custom output folder:**
```bash
node demo-qr-generator.cjs my-data.csv ./my-qr-codes
```

**Show help:**
```bash
node demo-qr-generator.cjs
```

---

## 📄 CSV File Format

### Simple Format
Create a CSV file with one value per line:

```csv
https://example.com/product/001
https://example.com/product/002
SN-01-0000001
SN-01-0000002
```

### With Header (Auto-detected)
The script automatically detects and skips common header rows:

```csv
SERIAL NUMBER
SN-01-0000001
SN-01-0000002
SN-01-0000003
```

Headers containing keywords like "SERIAL", "NUMBER", "URL", "DATA", "TEXT", "ID", "CODE", etc., will be automatically skipped.

### Supported Data Types
- URLs (http://, https://)
- Serial numbers
- Product codes
- Text data
- Any string up to 2,953 bytes (QR code limit)

---

## 📦 Output Files

After generation, you'll get:

1. **PNG Files** - Individual QR code images
   - Naming: `qr-00001.png`, `qr-00002.png`, etc.
   - Format: 300x300px PNG
   - Quality: High (92%)

2. **manifest.json** - Detailed generation report
   ```json
   {
     "generatedAt": "2025-10-21T10:30:00.000Z",
     "totalItems": 100,
     "successCount": 100,
     "failedCount": 0,
     "items": [...]
   }
   ```

3. **mapping.csv** - Simple mapping file
   ```csv
   Index,Data,Filename,Status
   1,"https://example.com/001",qr-00001.png,success
   2,"https://example.com/002",qr-00002.png,success
   ```

4. **qr-codes.zip** - Compressed archive of all files
   - Contains all PNG files
   - Contains manifest.json
   - Contains mapping.csv

---

## ⚙️ Configuration

You can modify generation settings by editing the `CONFIG` object in `demo-qr-generator.cjs`:

```javascript
const CONFIG = {
  maxItems: 5000,              // Maximum QR codes per run
  outputFormat: 'png',         // Output format
  qrOptions: {
    errorCorrectionLevel: 'M', // L, M, Q, H
    type: 'image/png',
    quality: 0.92,             // 0.0 - 1.0
    margin: 1,                 // Quiet zone size
    color: {
      dark: '#000000',         // QR code color
      light: '#FFFFFF'         // Background color
    },
    width: 300                 // Image width in pixels
  }
};
```

### Error Correction Levels
- **L** - Low (7% recovery)
- **M** - Medium (15% recovery) - Default
- **Q** - Quartile (25% recovery)
- **H** - High (30% recovery)

---

## 🔧 Troubleshooting

### "Input file not found"
Make sure the CSV file path is correct and the file exists.

### "Too many items"
The script has a 5,000 item limit. Split your CSV into smaller files if needed.

### "ZIP archive creation skipped"
The `archiver` package is optional. Install it for automatic ZIP creation:
```bash
npm install archiver
```

### QR Codes Not Scanning
- Increase the `errorCorrectionLevel` to 'H'
- Increase the `margin` value
- Ensure your data isn't too long (max 2,953 bytes)

---

## 📊 Performance

- **Generation Speed**: ~200-500 QR codes per second (depending on system)
- **File Size**: ~2-5 KB per PNG (300x300px)
- **Memory Usage**: ~50-100 MB for 5,000 codes

### Example Benchmarks
- 100 codes: ~0.5 seconds
- 1,000 codes: ~3-5 seconds
- 5,000 codes: ~15-25 seconds

---

## 📝 Sample CSV Included

The repository includes `sample-100.csv` for testing:

```bash
node demo-qr-generator.cjs sample-100.csv
```

This will generate 100 QR codes in the `qr-output` folder.

---

## 🤝 Support

For issues or questions:
1. Check the Troubleshooting section above
2. Ensure you have the latest Node.js version
3. Verify your CSV file format

---

## 📄 License

MIT License - Feel free to use for personal or commercial projects.

---

## 🎯 Use Cases

- **Inventory Management** - Generate codes for serial numbers
- **Event Management** - Create tickets or badges
- **Product Labeling** - Generate codes for products
- **Asset Tracking** - Track equipment and assets
- **Marketing Campaigns** - Create trackable URLs
- **Document Management** - Link to digital resources

---

**Happy QR Code Generating! 🎉**
