const childProcess = require('child_process');


const ps = childProcess.spawnSync(
	'Start-Process',
	[
		'DayZServer_x64.exe',
		'-PassThru',
		'-ArgumentList',
		// '\'-port=2302 -freezecheck\'',
		'\'-port=2302 -freezecheck "-mod=@somemod;"\'',
	],
	{
		shell: 'powershell.exe',
		cwd: 'exec/DayZServer'
	}
);

console.log(`Status: ${ps.status}`);
console.log('\n\n\n');
console.log(`Stdout: ${ps.stdout + ''}`);
console.log('\n\n\n');
const lines = (ps.stdout + '').replace(/\r/g, '').split('\n');
const pid = lines[lines.findIndex((_, i, arr) => i > 0 && arr[i - 1].startsWith('---'))]?.split(/\s/).filter(x => x.trim())[5];
console.log(`PID: ${pid}`);
console.log('\n\n\n');
console.log(`Stderr: ${ps.stderr + ''}`);