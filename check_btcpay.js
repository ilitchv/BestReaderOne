const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({
            host: '168.231.71.31',
            username: 'root',
            password: 'AmigoUnaLuz2468@'
        });

        console.log("Listing /root/btcpay...");
        const ls1 = await ssh.execCommand('ls -la /root/btcpay');
        console.log(ls1.stdout);

        console.log("Looking for nginx configs in btcpayserver volumes...");
        const ls2 = await ssh.execCommand('find /var/lib/docker/volumes -name "*nginx*" -o -name "*btcpayserver*" | grep conf');
        console.log(ls2.stdout);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        ssh.dispose();
    }
}
run();
