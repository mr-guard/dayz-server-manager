import { expect } from '../expect';
import {
    ProcessEntry,
    SystemInfo,
    Processes,
    ProcessSpawner,
    WindowsProcessFetcher,
} from '../../src/services/processes';
import * as childProcess from 'child_process';
import * as nodePty from 'node-pty';
import * as os from 'os';
import * as sinon from 'sinon';
import { disableConsole, enableConsole, stubClass } from '../util';
import { DependencyContainer, container } from 'tsyringe';
import { Paths } from '../../src/services/paths';
import { LoggerFactory } from '../../src/services/loggerfactory';
import { InjectionTokens } from '../../src/util/apis';

export const WMIC_OUTPUT = `

Caption=Discord.exe
CommandLine="C:\\Discord\\app-1.0.X\\Discord.exe" --type=renderer
CreationClassName=Win32_Process
CreationDate=20210513105049.093991+120
CSCreationClassName=Win32_ComputerSystem
CSName=TEST
Description=Discord.exe
ExecutablePath=C:\\Discord\\app-1.0.X\\Discord.exe
ExecutionState=
Handle=14300
HandleCount=874
InstallDate=
KernelModeTime=2151093750
MaximumWorkingSetSize=1380
MinimumWorkingSetSize=200
Name=Discord.exe
OSCreationClassName=Win32_OperatingSystem
OSName=Microsoft Windows 10 Pro|C:\\Windows|\\Device\\Harddisk0\\Partition3
OtherOperationCount=1216445
OtherTransferCount=36483076
PageFaults=3105179
PageFileUsage=216140
ParentProcessId=15476
PeakPageFileUsage=264836
PeakVirtualSize=838643712
PeakWorkingSetSize=248604
Priority=8
PrivatePageCount=221327360
ProcessId=14300
QuotaNonPagedPoolUsage=123
QuotaPagedPoolUsage=743
QuotaPeakNonPagedPoolUsage=136
QuotaPeakPagedPoolUsage=881
ReadOperationCount=36293
ReadTransferCount=66002197
SessionId=1
Status=
TerminationDate=
ThreadCount=38
UserModeTime=1351406250
VirtualSize=757694464
WindowsVersion=10.0.19042
WorkingSetSize=181981184
WriteOperationCount=30428
WriteTransferCount=77941777


Caption=Discord.exe
CommandLine="C:\\Discord\\app-1.0.X\\Discord.exe" --type=utility
CreationClassName=Win32_Process
CreationDate=20210513105056.678847+120
CSCreationClassName=Win32_ComputerSystem
CSName=TEST
Description=Discord.exe
ExecutablePath=C:\\Discord\\app-1.0.X\\Discord.exe
ExecutionState=
Handle=3288
HandleCount=306
InstallDate=
KernelModeTime=1562500
MaximumWorkingSetSize=1380
MinimumWorkingSetSize=200
Name=Discord.exe
OSCreationClassName=Win32_OperatingSystem
OSName=Microsoft Windows 10 Pro|C:\\Windows|\\Device\\Harddisk0\\Partition3
OtherOperationCount=546
OtherTransferCount=12300
PageFaults=17397
PageFileUsage=13368
ParentProcessId=15476
PeakPageFileUsage=13608
PeakVirtualSize=294477824
PeakWorkingSetSize=59056
Priority=8
PrivatePageCount=13688832
ProcessId=3288
QuotaNonPagedPoolUsage=24
QuotaPagedPoolUsage=408
QuotaPeakNonPagedPoolUsage=26
QuotaPeakPagedPoolUsage=410
ReadOperationCount=545
ReadTransferCount=11260
SessionId=1
Status=
TerminationDate=
ThreadCount=8
UserModeTime=2187500
VirtualSize=290512896
WindowsVersion=10.0.X
WorkingSetSize=59183104
WriteOperationCount=612
WriteTransferCount=20544
`;

describe('Test class ProcessEntry', () => {

    it('ProcessEntry-Name', () => {
        const name1 = 'Oha';
        const processId1 = 'Oha';
        const executablePath1 = 'Oha';
        const privatePageCount1 = 'Oha';
        const creationDate1 = 'Oha';
        const userModeTime1 = 'Oha';
        const kernelModeTime1 = 'Oha';

        const processEntry = new ProcessEntry();
        processEntry.Name = name1;
        processEntry.ProcessId = processId1;
        processEntry.ExecutablePath = executablePath1;
        processEntry.PrivatePageCount = privatePageCount1;
        processEntry.CreationDate = creationDate1;
        processEntry.UserModeTime = userModeTime1;
        processEntry.KernelModeTime = kernelModeTime1;
        
        expect(processEntry.Name).equals(name1);
        expect(processEntry.ProcessId).equals(processId1);
        expect(processEntry.ExecutablePath).equals(executablePath1);
        expect(processEntry.PrivatePageCount).equals(privatePageCount1);
        expect(processEntry.CreationDate).equals(creationDate1);
        expect(processEntry.UserModeTime).equals(userModeTime1);
        expect(processEntry.KernelModeTime).equals(kernelModeTime1);
    });

});

describe('Test class SystemInfo', () => {

    it('SystemInfo-cpu', () => {
        const cpu1 = undefined;
        const avgLoad1 = undefined;
        const memTotal1 = 10;
        const memFree1 = 10;
        const uptime1 = 10;

        // Property call
        const systemInfo = new SystemInfo();
        systemInfo.cpu = cpu1!;
        systemInfo.avgLoad = avgLoad1!;
        systemInfo.memTotal = memTotal1;
        systemInfo.memFree = memFree1;
        systemInfo.uptime = uptime1;
        
        expect(systemInfo.cpu).equals(cpu1);
        expect(systemInfo.avgLoad).equals(avgLoad1);
        expect(systemInfo.memTotal).equals(memTotal1);
        expect(systemInfo.memFree).equals(memFree1);
        expect(systemInfo.uptime).equals(uptime1);

    });

});

describe('Test class WinProcessFetcher', () => {

    let injector: DependencyContainer;

    before(() => {
        disableConsole();
    });

    after(() => {
        enableConsole();
    });

    beforeEach(() => {
        container.reset();
        injector = container.createChildContainer();
        injector.register(ProcessSpawner, stubClass(ProcessSpawner));
        injector.register(Paths, stubClass(Paths))
    });

    it('WinProcesses-getProcessList', async () => {
        const processes = injector.resolve(WindowsProcessFetcher);

        (injector.resolve(Paths).samePath as sinon.SinonStub)
            .returns(false)
            .withArgs('C:\\Discord\\app-1.0.X\\Discord.exe', 'C:\\Discord\\app-1.0.X\\Discord.exe').returns(true);

        (injector.resolve(ProcessSpawner).spawnForOutput as sinon.SinonStub).returns({
            status: 0,
            stdout: WMIC_OUTPUT,
            stderr: '',
        });

        const result = await processes.getProcessList('C:\\Discord\\app-1.0.X\\Discord.exe');

        // Expect result
        expect(result.length).to.equal(2);
        expect(result[0].ProcessId).to.equal('14300');
        expect(result[0].ExecutablePath).to.equal('C:\\Discord\\app-1.0.X\\Discord.exe');
    });

});

describe('Test class ProcessesSpawner', () => {

    let injector: DependencyContainer;

    before(() => {
        disableConsole();
    });

    after(() => {
        enableConsole();
    });

    beforeEach(() => {
        container.reset();
        injector = container.createChildContainer();
        injector.register(LoggerFactory, LoggerFactory);
        injector.register(InjectionTokens.childProcess, { useValue: childProcess });
        injector.register(InjectionTokens.pty, { useValue: nodePty });
    });

    it('ProcessesSpawner-spawnForOutput-fail', async () => {
        const processes = injector.resolve(ProcessSpawner);
        const resultErr = await processes.spawnForOutput(
            'node',
            [
                '-e',
                'console.error(\'TestError\'); process.exit(123)'
            ],
            {
                dontThrow: true,
            }
        );
        expect(resultErr.status).to.equal(123);
        expect(resultErr.stderr).to.equal('TestError\n');
    });

    it('ProcessesSpawner-spawnForOutput-throw', async () => {
        const processes = injector.resolve(ProcessSpawner);
        expect(processes.spawnForOutput(
            'node',
            [
                '-e',
                'console.error(\'TestError\'); process.exit(123)'
            ]
        )).to.be.rejected;
    });

    it('ProcessesSpawner-spawnForOutput', async () => {
        const processes = injector.resolve(ProcessSpawner);
        
        let handlerStdout = '';
        let handlerStderr = '';
        const result = await processes.spawnForOutput(
            'node',
            [
                '-e',
                'console.log(\'TestLog\')'
            ],
            {
                stdErrHandler: (data) => {
                    handlerStderr += data;
                },
                stdOutHandler: (data) => {
                    handlerStdout += data;
                },
                verbose: true,
            }
        );

        expect(result.status).to.equal(0);
        expect(result.stdout).to.equal('TestLog\n');
        expect(handlerStdout).to.equal('TestLog\n');
        expect(handlerStderr).to.equal('');
    });

    it('ProcessesSpawner-spawnForOutputPty', async () => {
        const processes = injector.resolve(ProcessSpawner);
        
        let handlerStdout = '';
        let handlerStderr = '';
        const result = await processes.spawnForOutput(
            process.platform === 'win32' ? 'node.exe' : 'node',
            [
                '-e',
                'console.log(\'TestLog\')'
            ],
            {
                stdErrHandler: (data) => {
                    handlerStderr += data;
                },
                stdOutHandler: (data) => {
                    handlerStdout += data;
                },
                verbose: true,
                pty: true,
            }
        );

        expect(result.status).to.equal(0);
        expect(result.stdout).to.contain('TestLog');
        expect(handlerStdout).to.contain('TestLog');
        expect(handlerStderr).to.equal('');
    });
});

describe('Test class Processes', () => {

    let injector: DependencyContainer;

    before(() => {
        disableConsole();
    });

    after(() => {
        enableConsole();
    });

    beforeEach(() => {
        container.reset();
        injector = container.createChildContainer();
        injector.register(ProcessSpawner, stubClass(ProcessSpawner));
        injector.register(WindowsProcessFetcher, stubClass(WindowsProcessFetcher));
        injector.register(Paths, stubClass(Paths));
    });

    it('Processes-getProcessList', async () => {
        
        injector.register(Paths, stubClass(Paths))
        injector.register(WindowsProcessFetcher, WindowsProcessFetcher)
        const processes = injector.resolve(Processes);

        (injector.resolve(Paths).samePath as sinon.SinonStub)
            .returns(false)
            .withArgs('C:\\Discord\\app-1.0.X\\Discord.exe', 'C:\\Discord\\app-1.0.X\\Discord.exe').returns(true);

        (injector.resolve(ProcessSpawner).spawnForOutput as sinon.SinonStub).returns({
            status: 0,
            stdout: WMIC_OUTPUT,
            stderr: '',
        });

        const result = await processes.getProcessList('C:\\Discord\\app-1.0.X\\Discord.exe');

        // Expect result
        expect(result.length).to.equal(2);
        expect(result[0].ProcessId).to.equal('14300');
        expect(result[0].ExecutablePath).to.equal('C:\\Discord\\app-1.0.X\\Discord.exe');

        const spent = (2151093750 + 1351406250) / 10000;
        expect(processes.getProcessCPUSpent(result[0])).to.equal(spent);

        sinon.stub(processes, 'getProcessUptime').returns(
            spent * 10
        );

        expect(processes.getProcessCPUUsage(result[0])).to.equal(
            Math.round(
                10 / Math.max(os.cpus().length, 1)
            )
        );

        expect(processes.getProcessCPUUsage(result[0], result[0])).to.equal(0);
    });

    it('Processes-killProcess', async () => {
        const processes = injector.resolve(Processes);
        
        const spawnMock = (injector.resolve(ProcessSpawner).spawnForOutput as sinon.SinonStub)
            .resolves(null);
        
        const pid = 'abdfsdfsdf1234######';

        await processes.killProcess(pid);

        expect(spawnMock.callCount).to.equal(1);
        expect(spawnMock.firstCall.args[1]).to.include(pid);
    });

    it('Processes-killProcess-throws', () => {
        const processes = injector.resolve(Processes);
        
        const spawnMock = (injector.resolve(ProcessSpawner).spawnForOutput as sinon.SinonStub)
            .rejects('error :)');

        const pid = 'abdfsdfsdf1234######';

        expect(processes.killProcess(pid)).to.be.rejected;
    });

    it('Processes-getSystemUsage', () => {
        const processes = injector.resolve(Processes);
        const result = processes.getSystemUsage();

        expect(result).to.be.not.undefined;
        expect(result.avgLoad).to.be.not.undefined;
        expect(result.cpu).to.be.not.undefined;
        expect(result.memFree).to.be.not.undefined;
        expect(result.memTotal).to.be.not.undefined;
        expect(result.uptime).to.be.not.undefined;
    });

});
