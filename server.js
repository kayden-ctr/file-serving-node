const http = require('http');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const formidable = require('formidable');

const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const server = http.createServer((req, res) => {


    if (req.method === 'POST' && req.url === '/upload') {

        const form = new formidable.IncomingForm({
            uploadDir: uploadDir,
            keepExtensions: true,
            maxFileSize: 5 * 1024 * 1024 
        });

        form.parse(req, (err, fields, files) => {
            if (err) {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                return res.end('<h1>Error uploading file.</h1>');
            }

            const file = files.file;

            if (!file) {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                return res.end('<h1>No file uploaded.</h1>');
            }

            const allowedTypes = [
                'image/jpeg',
                'image/png',
                'application/pdf'
            ];

            if (!allowedTypes.includes(file.mimetype)) {
           
                fs.unlink(file.filepath, () => {});

                res.writeHead(400, { 'Content-Type': 'text/html' });
                return res.end('<h1>Invalid file type. Only JPG, PNG, PDF allowed.</h1>');
            }

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<h1>File uploaded successfully!</h1><a href="/">Go Back</a>');
        });

        return;
    }

    let filePath = path.join(
        __dirname,
        'public',
        req.url === '/' ? 'index.html' : req.url
    );

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 - File Not Found</h1>');
        } else {
            res.writeHead(200, {
                'Content-Type': mime.lookup(filePath) || 'application/octet-stream'
            });
            res.end(content);
        }
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
