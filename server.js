const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Client } = require('ssh2');
const path = require('path');
const multer = require('multer');

const APP_PORT = process.env.PORT || 3002;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const activeSessions = {};
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', upload.single('upload_file'), async (req, res) => {
    try {
        const token = req.body.session_token;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'ファイルが選択されていません。' });
        }

        if (!token || !activeSessions[token]) {
            return res.status(400).json({ success: false, message: 'セッションが無効です。再接続してください。' });
        }

        const fileBuffer = req.file.buffer;
        const remoteFilename = req.file.originalname
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/_{2,}/g, '_');

        const config = activeSessions[token];
        const conn = new Client();

        conn.on('ready', () => {
            conn.exec('pwd', (err, stream) => {
                if (err) {
                    conn.end();
                    return res.status(500).json({ success: false, message: `コマンド実行エラー: ${err.message}` });
                }

                let output = '';
                stream.on('data', (data) => { output += data.toString(); });
                stream.stderr.on('data', (data) => { output += data.toString(); });

                stream.on('close', () => {
                    const homeDir = output.trim().split('\n').pop().trim() || '/tmp';

                    conn.sftp((err, sftp) => {
                        if (err) {
                            conn.end();
                            return res.status(500).json({ success: false, message: `SFTPエラー: ${err.message}` });
                        }

                        const remotePath = `${homeDir}/${remoteFilename}`;

                        sftp.open(remotePath, 'w', (err, handle) => {
                            if (err) {
                                const fallbackPath = `/tmp/${remoteFilename}`;
                                sftp.open(fallbackPath, 'w', (retryErr, retryHandle) => {
                                    if (retryErr) {
                                        conn.end();
                                        return res.status(500).json({
                                            success: false,
                                            message: `SFTP書き込みエラー: ${retryErr.message}`
                                        });
                                    }
                                    writeToHandle(sftp, retryHandle, fileBuffer, fallbackPath, conn, res, remoteFilename);
                                });
                            } else {
                                writeToHandle(sftp, handle, fileBuffer, remotePath, conn, res, remoteFilename);
                            }
                        });
                    });
                });
            });
        });

        conn.on('error', (err) => {
            res.status(500).json({ success: false, message: `SSH接続エラー: ${err.message}` });
        });

        conn.connect(config);

    } catch (error) {
        res.status(500).json({ success: false, message: `予期しないエラー: ${error.message}` });
    }
});

function writeToHandle(sftp, handle, fileBuffer, remotePath, conn, res, remoteFilename) {
    sftp.write(handle, fileBuffer, 0, fileBuffer.length, 0, (err) => {
        if (err) {
            sftp.close(handle, () => {
                conn.end();
                res.status(500).json({
                    success: false,
                    message: `SFTP書き込みエラー: ${err.message}`
                });
            });
            return;
        }

        sftp.close(handle, () => {
            conn.end();
            res.json({
                success: true,
                message: `ファイル '${remoteFilename}' を ${remotePath} にアップロード完了 (${fileBuffer.length} bytes)`
            });
        });
    });
}

wss.on('connection', (ws) => {
    const conn = new Client();
    let stream = null;
    let sessionToken = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'auth') {
                const { host, port, username, password } = data;

                const sshConfig = {
                    host: host,
                    port: port || 22,
                    username: username,
                    password: password,
                    readyTimeout: 5000
                };

                conn.on('ready', () => {
                    sessionToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                    activeSessions[sessionToken] = sshConfig;

                    ws.send(JSON.stringify({
                        type: 'status',
                        message: 'SSH接続に成功しました。',
                        token: sessionToken
                    }));

                    conn.shell((err, sshStream) => {
                        if (err) {
                            ws.send(JSON.stringify({ type: 'status', message: `Shell起動エラー: ${err.message}` }));
                            return conn.end();
                        }
                        stream = sshStream;

                        stream.on('data', (sshData) => {
                            ws.send(sshData.toString('binary'));
                        });

                        stream.on('close', () => {
                            ws.send(JSON.stringify({ type: 'status', message: 'SSHセッションが閉じられました。' }));
                            conn.end();
                        });
                    });
                }).connect(sshConfig);

            } else if (data.type === 'command' && stream) {
                stream.write(data.input);

            } else if (data.type === 'resize' && stream) {
                stream.setWindow(data.cols, data.rows);
            }

        } catch (e) {
            // Parse error
        }
    });

    conn.on('error', (err) => {
        ws.send(JSON.stringify({ type: 'status', message: `SSH接続エラー: ${err.message}` }));
    });

    ws.on('close', () => {
        if (sessionToken && activeSessions[sessionToken]) {
            delete activeSessions[sessionToken];
        }
        if (conn) conn.end();
    });
});

server.listen(APP_PORT, '0.0.0.0', () => {
    console.log(`Web SSH Server running on port ${APP_PORT}`);
    console.log(`Access at http://localhost:${APP_PORT}`);
    console.log(`\n=== localhost.run Setup ===`);
    console.log(`To expose this server to the internet, run:`);
    console.log(`ssh -R 80:localhost:${APP_PORT} nokey@localhost.run\n`);
});
