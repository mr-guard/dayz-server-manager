const fs = require('fs');
!fs.existsSync(process.argv[2]) && fs.mkdirSync(process.argv[2], { recursive: true, });