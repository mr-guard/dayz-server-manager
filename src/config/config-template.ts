import { Config } from './config';

export const generateConfigTemplate = (schema: any, values?: Config): string => {
    const indent = '    ';
    const makeSpacer = (name: string): string => `///////////////////////////// ${name} ////////////////////////////////////////`;
    const spacers = [
        ['admins', 'Admins'],
        ['webPort', 'WEB'],
        ['discordBotToken', 'Discord'],
        ['serverPath', 'DayZ'],
        ['steamCmdPath', 'Steam'],
        ['events', 'Events'],
        ['metricPollIntervall', 'Metrics'],
        ['hooks', 'Hooks'],
        ['ingameReportEnabled', 'IngameReport'],
        ['backupPath', 'Backups'],
        ['serverCfg', 'ServerCfg'],
    ];


    let fileContent = '{\n';
    for (let i = 0; i < schema.propertyOrder.length; i++) {

        if (i > 0) {
            fileContent += '\n\n';
        }

        const propKey = schema.propertyOrder[i];

        const spacer = spacers.find((x) => x[0].toLowerCase() === propKey.toLowerCase());
        if (spacer) {
            fileContent += `${indent}${makeSpacer(spacer[1])}\n\n`;
        }

        const prop = schema.properties[propKey];
        const { description } = prop;
        if (description) {
            fileContent += `${indent}/**\n${indent} * ${description.replace(/\n/g, `\n${indent} * `)}\n${indent} */\n`;
        }
        let propValue = prop.default;
        if (values && typeof values[propKey] !== 'undefined' && values[propKey] !== null) {
            propValue = values[propKey];
        }
        const json = JSON
            .stringify(propValue, null, 4)
            .replace(/\n/g, `\n${indent}`);
        fileContent += `${indent}"${propKey}": ${json}${(i < (schema.propertyOrder.length - 1)) ? ',' : ''}`;

    }

    fileContent += '\n}';

    return fileContent;
};
