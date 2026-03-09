const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const ssh = new NodeSSH();

const nginxConfig = `server {
    server_name api.beastreaderone.com;

    location / {
        proxy_pass http://localhost:8081; # Port where PM2 node server runs
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for long-running websocket connections
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}`;

async function run() {
    try {
        await ssh.connect({
            host: '168.231.71.31',
            username: 'root',
            password: 'AmigoUnaLuz2468@'
        });

        console.log("Writing NGINX config locally...");
        const localConfPath = path.join(__dirname, 'beastreaderone_nginx.conf');
        fs.writeFileSync(localConfPath, nginxConfig);

        console.log("Uploading NGINX config...");
        await ssh.putFile(localConfPath, '/etc/nginx/sites-available/beastreaderone');

        // Enable site and remove default
        await ssh.execCommand('ln -sf /etc/nginx/sites-available/beastreaderone /etc/nginx/sites-enabled/');

        console.log("Testing and restarting NGINX...");
        const testRes = await ssh.execCommand('nginx -t');
        console.log(testRes.stdout || testRes.stderr);

        await ssh.execCommand('systemctl restart nginx');

        console.log("Generating SSL Certificate (Certbot)...");
        const certRes = await ssh.execCommand('certbot --nginx -d api.beastreaderone.com --non-interactive --agree-tos -m tu_correo_ficticio@gmail.com');
        console.log(certRes.stdout);
        if (certRes.stderr) console.error("Certbot Error/Warn:", certRes.stderr);

        console.log("✅ Nginx and SSL configured successfully!");

    } catch (e) {
        console.error("Error:", e);
    } finally {
        ssh.dispose();
    }
}
run();
