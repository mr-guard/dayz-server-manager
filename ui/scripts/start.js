const concurrently = require('concurrently');
const port = process.env.PORT || 4200;

concurrently([
    { 
        command: `npm run ng -- serve --port ${port} --open`,
        name: 'NG_SERVE', 
        prefixColor: 'bgBlue.bold',
    }
], {
    prefix: 'name',
    killOthers: ['failure', 'success'],
}).then(success, failure);

function success() {
    console.log('Success');    
}

function failure() {
    console.log('Failure');
}
