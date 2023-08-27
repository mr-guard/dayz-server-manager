/* eslint-disable no-shadow */
export enum SteamExitCodes {
    SUCCESS = 0,
    UNKNOWN_ERROR = 1,
    ALREADY_LOGGED_IN = 2,
    NO_INTERNET = 3,
    INVALID_CREDENTIALS = 5,
    UP2DATE = 6,
    FRESH_INSTALL = 7,
    UPDATE_FAILED = 8,
    TIMEOUT = 10,
    GUARD_CODE_REQUIRED = 63,
}
/* eslint-enable no-shadow */

export const steamExitCodesDetails = {
    [SteamExitCodes.SUCCESS]: [true, 'Success'],
    [SteamExitCodes.UNKNOWN_ERROR]: [false, 'Unknown Error'],
    [SteamExitCodes.ALREADY_LOGGED_IN]: [false, 'Already logged in with another user'],
    [SteamExitCodes.NO_INTERNET]: [false, 'No internet / Connection failed'],
    [SteamExitCodes.INVALID_CREDENTIALS]: [false, 'Invalid credentials'],
    [SteamExitCodes.FRESH_INSTALL]: [true, 'Fresh Install / No Command'],
    [SteamExitCodes.UP2DATE]: [true, 'Already up to date'],
    [SteamExitCodes.UPDATE_FAILED]: [false, 'Failed to update (Network Error / Out of Diskspace / App not owned / Wrong platform)'],
    [SteamExitCodes.TIMEOUT]: [false, 'Timeout'],
    [SteamExitCodes.GUARD_CODE_REQUIRED]: [false, 'SteamGuard code required'],
};

/* eslint-disable @typescript-eslint/naming-convention */
export const DAYZ_APP_ID = '221100';
export const DAYZ_SERVER_APP_ID = '223350';
export const DAYZ_EXPERIMENTAL_SERVER_APP_ID = '1042420';

export interface PublishedFileDetail {
    publishedfileid: string;
    result: number;
    creator: string;
    creator_app_id: number;
    consumer_app_id: number;
    filename: string;
    file_size: number;
    file_url: string;
    hcontent_file: string;
    preview_url: string;
    hcontent_preview: string;
    title: string;
    description: string;
    time_created: number;
    time_updated: number;
    visibility: number;
    banned: number;
    ban_reason: string;
    subscriptions: number;
    favorited: number;
    lifetime_subscriptions: number;
    lifetime_favorited: number;
    views: number;
    tags: {tag: string}[];
}
/* eslint-enable @typescript-eslint/naming-convention */

export interface SteamApiWorkshopItemDetailsResponse {
    response: {
        result: number;
        resultcount: number;
        publishedfiledetails: PublishedFileDetail[];
    };
}

export interface SteamCmdEvent {
    type: string;
}

export interface SteamCmdModUpdateProgressEvent extends SteamCmdEvent {
    type: 'mod-progress';
    mod: string;
    step: string;
    progress: string;
    progressAmount: string;
    progressTotalAmount: string;
}

export interface SteamCmdAppUpdateProgressEvent extends SteamCmdEvent {
    type: 'app-progress';
    step: string;
    progress: string;
    progressAmount: string;
    progressTotalAmount: string;
}

export interface SteamCmdOutputEvent extends SteamCmdEvent {
    type: 'output';
    text: string;
}

export interface SteamCmdRetryEvent extends SteamCmdEvent {
    type: 'retry';
    mods?: string[];
}

export interface SteamCmdExitEvent extends SteamCmdEvent {
    type: 'exit';
    mods?: string[];
    success: boolean;
    status: number;
}

export type SteamCmdEventListener = (event: SteamCmdEvent) => any;

export interface LocalMetaData {
    lastDownloaded?: number;
}