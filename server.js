const http = require('http');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const formidable = require('formidable');

// Use /tmp/uploads for Render (writable)
const uploadDir = path.join('/tmp', 'uploads');

// Ensure upload folder exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const server = http.createServer((req, res) => {

    // =========================
    // HANDLE FILE UPLOAD
    // =========================
    if (req.method === 'POST' && req.url === '/upload') {
        const form = new formidable.IncomingForm({
            uploadDir: uploadDir,
            keepExtensions: true,
            maxFileSize: 5 * 1024 * 1024 // 5MB
        });

        form.parse(req, (err, fields, files) => {
            if (err) {
                console.error('Upload error:', err);
                res.writeHead(500, { 'Content-Type': 'text/html' });
                return res.end('<h1>Server error during upload.</h1><a href="/">Go Back</a>');
            }

            const file = files.file;

            if (!file) {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                return res.end('<h1>No file uploaded.</h1><a href="/">Go Back</a>');
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];

            if (!allowedTypes.includes(file.mimetype)) {
                fs.unlink(file.filepath, () => {}); // delete invalid file
                res.writeHead(400, { 'Content-Type': 'text/html' });
                return res.end('<h1>Invalid file type. Only JPG, PNG, PDF allowed.</h1><a href="/">Go Back</a>');
            }

            // Rename file to original filename
            const newFilePath = path.join(uploadDir, file.originalFilename);
            fs.rename(file.filepath, newFilePath, (err) => {
                if (err) console.error(err);
            });

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <h1>File uploaded successfully!</h1>
                <p><a href="/">Go Back</a></p>
                <p><a href="/uploads/${encodeURIComponent(file.originalFilename)}" target="_blank">Download File</a></p>
            `);
        });

        return;
    }

    // =========================
    // SERVE UPLOADED FILES
    // =========================
    if (req.url.startsWith('/uploads/')) {
        const filePath = path.join(uploadDir, decodeURIComponent(req.url.replace('/uploads/', '')));
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                return res.end('<h1>File Not Found</h1><a href="/">Go Back</a>');
            }
            res.writeHead(200, { 'Content-Type': mime.lookup(filePath) || 'application/octet-stream' });
            res.end(content);
        });
        return;
    }

    // =========================
    // SERVE HOME PAGE WITH UPLOADED FILES LIST
    // =========================
    if (req.url === '/') {
        const indexPath = path.join(__dirname, 'public', 'index.html');
        fs.readFile(indexPath, 'utf8', (err, content) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                return res.end('<h1>Server Error</h1>');
            }

            // Read uploaded files
            let filesList = '';
            if (fs.existsSync(uploadDir)) {
                const files = fs.readdirSync(uploadDir);
                if (files.length > 0) {
                    filesList = '<ul>';
                    files.forEach(file => {
                        filesList += `<li><a href="/uploads/${encodeURIComponent(file)}" target="_blank">${file}</a></li>`;
                    });
                    filesList += '</ul>';
                } else {
                    filesList = '<p>No files uploaded yet.</p>';
                }
            }

            // Insert files list into index.html
            content = content.replace('<!--UPLOADS_LIST-->', filesList);

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
        });
        return;
    }

    // =========================
    // SERVE STATIC FILES (CSS, JS, etc)
    // =========================
    let filePath = path.join(__dirname, 'public', req.url);
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 - File Not Found</h1>');
        } else {
            res.writeHead(200, { 'Content-Type': mime.lookup(filePath) || 'application/octet-stream' });
            res.end(content);
        }
    });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
