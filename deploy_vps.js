const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function run() {
    try {
        console.log("Connecting to VPS...");
        await ssh.connect({
            host: '168.231.71.31',
            username: 'root',
            password: 'AmigoUnaLuz2468@'
        });
        console.log("✅ Connected to VPS!");

        // 1. Stop the bot
        console.log("Stopping sniper-bot...");
        await ssh.execCommand('pm2 stop sniper-bot');

        // 2. Prepare directory
        console.log("Preparing directory /root/voice-agent...");
        await ssh.execCommand('mkdir -p /root/voice-agent');

        // 3. Upload files
        console.log("Uploading files (this may take a minute)...");
        const localDir = __dirname;
        const remoteDir = '/root/voice-agent';

        const filesToUpload = [
            'server.js',
            'database.js',
            'package.json',
            '.env',
            'constants-backend.js'
        ];

        for (const f of filesToUpload) {
            await ssh.putFile(path.join(localDir, f), path.join(remoteDir, f));
        }

        const dirsToUpload = [
            'models',
            'services',
            'utils',
            'config',
            'api'
        ];

        for (const d of dirsToUpload) {
            await ssh.putDirectory(path.join(localDir, d), path.join(remoteDir, d), {
                recursive: true,
                concurrency: 5
            });
        }

        console.log("✅ Upload complete.");

        // 4. NPM Install
        console.log("Running npm install on VPS...");
        const npmRes = await ssh.execCommand('npm install --production', { cwd: remoteDir });
        console.log(npmRes.stdout);
        if (npmRes.stderr) console.error("NPM STDERR:", npmRes.stderr);

        // 5. PM2 Start
        console.log("Starting voice-agent...");
        const pm2Res = await ssh.execCommand('pm2 start server.js --name voice-agent', { cwd: remoteDir });
        console.log(pm2Res.stdout);

        const pm2Save = await ssh.execCommand('pm2 save');
        console.log("PM2 Saved.");

    } catch (e) {
        console.error("Deploy Error:", e);
    } finally {
        ssh.dispose();
    }
}
run();
