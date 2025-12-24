const http = require('http');

http.get('http://localhost:8080/api/admin/users', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const users = JSON.parse(data);
            console.log(JSON.stringify(users, null, 2));

            const targetId = '693f818faa73306b1fec4692';
            const target = users.find(u => u.id === targetId);
            if (target) {
                console.log('\n--- TARGET FOUND ---');
                console.log('ID:', target.id);
                console.log('Name:', target.name);
                console.log('Email:', target.email);
            } else {
                console.log('\n--- TARGET NOT FOUND IN API RESPONSE ---');
                console.log('Target ID:', targetId);
            }

            const pedro = users.filter(u => u.name === 'Pedro Martinez');
            if (pedro.length > 0) {
                console.log('\n--- PEDRO USERS ---');
                console.log(JSON.stringify(pedro, null, 2));
            }

        } catch (e) {
            console.error(e);
        }
    });
}).on('error', err => console.error(err));
