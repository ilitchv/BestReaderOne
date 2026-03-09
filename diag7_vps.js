const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({
            host: '168.231.71.31',
            username: 'root',
            password: 'AmigoUnaLuz2468@'
        });

        console.log("Inspecting BTCPay generated envs:");
        const btcpay = await ssh.execCommand('docker inspect generated_btcpayserver_1 | grep -A 20 "Env":');
        console.log(btcpay.stdout);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        ssh.dispose();
    }
}
run();
