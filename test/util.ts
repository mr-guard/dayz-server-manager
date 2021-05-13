import { Logger } from "../src/util/logger";

const defaults = Logger.LogLevelFncs.slice(0);

export const disableConsole = () => {
    // disable console logs
    Logger.LogLevelFncs = Logger.LogLevelFncs.map((x) => (msg, detail) => {});
};

export const enableConsole = () => {
    // disable console logs
    Logger.LogLevelFncs = defaults.slice(0);
};
