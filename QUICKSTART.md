# Quick Start Guide

## Installation & Setup

1. **Install Node.js** (if not already installed)
   - Download from: https://nodejs.org/
   - Minimum version: 16.x or higher
   - Verify installation: `node --version`

2. **Install Dependencies**
   ```bash
   npm install
   ```

## Usage

### Basic Usage
```bash
node demo-qr-generator.cjs sample-100.csv
```

### Custom Output Folder
```bash
node demo-qr-generator.cjs sample-100.csv my-qr-codes
```

### Show Help
```bash
node demo-qr-generator.cjs
```

## What You'll Get

After running the script, you'll find:

- **qr-output/** folder (or your custom folder name) containing:
  - `qr-00001.png` to `qr-XXXXX.png` - Individual QR code images
  - `manifest.json` - Detailed generation report
  - `mapping.csv` - Simple index/data/filename mapping
  - `qr-codes.zip` - Compressed archive of all files

## CSV File Format

### Simple (No Header)
```csv
https://example.com/product/001
https://example.com/product/002
SN-01-0000001
```

### With Header (Auto-detected)
```csv
SERIAL NUMBER
SN-01-0000001
SN-01-0000002
```

Common headers like "SERIAL NUMBER", "URL", "DATA", etc., are automatically detected and skipped.

## Limits

- **Maximum QR codes per run**: 5,000
- **QR code size**: 300x300 pixels
- **Format**: PNG
- **Quality**: 92%

## Troubleshooting

### Dependencies Not Installing
Make sure you have npm installed:
```bash
npm --version
```

If not, install Node.js which includes npm.

### CSV Not Found
Use the full path or ensure you're in the correct directory:
```bash
node demo-qr-generator.cjs /full/path/to/file.csv
```

### ZIP Not Created
The archiver package is optional. If you see "ZIP archive creation skipped", run:
```bash
npm install archiver
```

## Example Workflow

1. Create your CSV file with your data
2. Run the generator:
   ```bash
   node demo-qr-generator.cjs my-data.csv
   ```
3. Check the output folder
4. Download the ZIP file or use individual PNG files

## Support

For issues, check:
- README.md for detailed documentation
- Ensure Node.js version is 16+
- Verify CSV format is correct
- Check that paths are correct
