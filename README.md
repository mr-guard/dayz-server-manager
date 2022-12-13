# DayZ Server Manager

[![Pricing](https://img.shields.io/badge/Pricing-FREE-green.svg)](https://github.com/Dev-Time/dayz-server-manager/)
[![license](https://img.shields.io/github/license/Dev-Time/dayz-server-manager.svg)](https://github.com/Dev-Time/dayz-server-manager/blob/master/LICENSE)
![GitHub Workflow Status](https://github.com/Dev-Time/dayz-server-manager/actions/workflows/build.yml/badge.svg)  

[![GitHub release](https://img.shields.io/github/release/Dev-Time/dayz-server-manager.svg)](https://GitHub.com/Dev-Time/dayz-server-manager/releases/)
[![GitHub commits](https://img.shields.io/github/commits-since/Dev-Time/dayz-server-manager/latest.svg)](https://GitHub.com/Dev-Time/dayz-server-manager/commit/)
[![Github all releases](https://img.shields.io/github/downloads/Dev-Time/dayz-server-manager/total.svg)](https://GitHub.com/Dev-Time/dayz-server-manager/releases/)  

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/Dev-Time/dayz-server-manager)

This tool aims to simplify the process of setting up a DayZ Standalone Server on a Windows Server.  
The goal was to break down the initial effort to a minimum while providing configuration to nearly all aspects of the server administration process.


## Content <hr>

1. [Features](#usage)  
    1. [Web UI](#feature-webui)
2. [Requirements](#requirements)
3. [Usage](#usage)
4. [Updating](#updating)
5. [Configuration](#configuration)
    1. [Change instance ID](#guide-change-instance-id)
    2. [Adding more admins / moderators](#guide-add-admin)
    3. [Get the Discord Bot Token](#guide-discord-token)
    4. [Edit the discord channels](#guide-discord-channels)
    5. [Adding local mods](#guide-add-workshop-mods)
    6. [Adding workshop mods](#guide-add-workshop-mods)
    7. [Change Server Name / Password / Admin Password](#guide-change-server-name-password)
    8. [Change the server port](#guide-change-server-port)
    9. [Add scheduled events](#guide-add-events)
6. [Steam CMD](#steam-cmd)
7. [TODOs](#todo)
8. [Default folder layout](#folder-layout)
9. [Technical details](#technical-details)
10. [Security](#security)
    1. [Discord](#security-discord)
    2. [Web](#security-web)
11. [Known Issues and Limitations](#limitations)
12. [Disclaimer](#disclaimer)

<br><a name="features"></a>
## Features <hr>  

* Automatically downloads and installs SteamCMD
* Automatically downloads and installs DayZServer
  * Experimental Server can be installed too!
* Automatically downloads and links configured Steam workshop mods
* Automatically updates server and mods
* Ability to add custom non-workshop and server mods
* Set commandline params
* Starts and observes your server
  * Restarts the server in case of crashes
* Detects VCRedist and DirectX installation and shows instructions on how to install it if absent
* Detect enabled WindowsErrorReporting and show instructions to disable it (avoids server from getting stuck with error popup)
* Shows the correct firewall configuration
  * just one command to be executed as admin/elevated user
* Simple role-based user system (admin, manager, moderator, viewer)
  * define who is able to do certain things
  * Discord gamer tags can be used
* RCon integration
  * scans active players and bans
* Discord bot (Requires Discord Bot Token)
  * Fetch server/system status
  * Fetch active players
  * Show active bans
  * kick/ban players
  * Send/Receive global messages
* REST API
  * Secured by basic auth
  * Fetch various infos, metrics
  * Execute RCon commands and other actions
    * everything you can do with the Web UI
* Event Scheduler
  * CRON-Like event schedule
  * execute:
    * global messages
    * kicks
    * server restarts
* Hooks (WIP)
  * beforeStart Hook - run custom programs scripts to prepare server starts or whatever
  * more hooks planned
* Backups
  * scheduled via events
* Implicit multi server support
  * The manager looks for the server config where (PWD/CWD) it is executed
  * To support multiple instances, copy the config to different folders and adapt the configuration (Server port etc.)
* Web UI <a name="feature-webui"></a>
  * Secured by basic auth
  * Manage your server remotely, even on your phone
    * No need to use RDP for common tasks
  * Displays various metrics (player count, CPU/RAM usage)
  * Read Server Logs (RPT, ADM, Script Log)
  * Shows player and vehicle position on a map
  * allows you to edit your types.xml in the browser

![Web UI Dashboard](/resources/webui_dashboard_screen.png "Web UI Dashboard")

![Web UI System](/resources/webui_system_screen.png "Web UI System")

![Web UI TypesEditor](/resources/webui_types_editor_screen.png "Web UI Types Editor")

![Web UI Logs](/resources/webui_logs_screen.png "Web UI Logs")

![Web UI Map](/resources/webui_map_screen.png "Web UI Map")

![Web UI Settings](/resources/webui_settings_screen.png "Web UI Settings")

<br><a name="requirements"></a>
## Installation Requirements <hr>  

* A Windows (Root) Server with RDP/Shell access
  * hosted instances (like nitrado) cannot use this EXCEPT they can run arbitrary programs
* That's it!

<br><a name="usage"></a>
## Usage <hr>  

* Download the [latest version](https://github.com/Dev-Time/dayz-server-manager/releases/latest) of the manager
* Extract the manager and the config template
* Copy and rename the config template to `server-manager.json`
* Edit the `server-manager.json` config to fit your needs
  * Fill the required fields (everything is described in the file)
`!IMPORTANT! Change the admin and rcon password`
  * Other than that the defaults will probably fit your needs
  * You can also checkout the [configuration guides](#configuration)
* Start the manager in the folder where the config is situated

* Optionally you can add it as Windows Service instead of launching it manually
* Make sure the "Execution Location" is the folder, where the config is located (this is not necessarily the folder where the manager executable is located)

<br><a name="updating"></a>
## Updating <hr>  

This app was written with backwards compatibility in mind.<br>
Sometimes, however, some breaking changes to the server manager config will occur.<br>
The best strategy to update is to take the config template of the new version and and modify it to match your old version.<br>
This way you can not miss out on new properties which might be required.<br>

<br><a name="configuration"></a>
## Configuration <hr>  

The configuration of the manager is all done in a single config file.<br>
You MUST not edit the serverDZ.cfg manually because it will be overriden by the settings inside the `server-manager.json`.<br>
<br>
When installing the manager the first time, you will find a configuration template which needs to be renamed to `server-manager.json`.<br>
You can then go ahead and change the settings inside of this file.<br>
If you do not need anything special (you would probably know by now), then the default values will work out well.<br>
<br>
  
  
Some important values you probably want to change:<br>
| | |
| --- | --- |
| instanceId | some unique name of this server instance |
| admins | the admins / moderators who can access the web ui and the discord commands |
| discordBotToken | the token the server manager will use to send messages to your discord server |
| discordChannels | the channels of your discord server to send messages to (make sure the bot has access to them) |
| rconPassword | the server's rcon password `!IMPORTANT! change this or others might be able to take control over your server` |
| localMods | list of manually install mods which are not auto updated via steam cmd |
| steamUsername / steamPassword | the credentials to use to download the server files and workshop mods |
| steamWsMods | the steam workshop mods to download |
| events | scheduled events for stuff like server restarts, global messages and so on |
| serverCfg.hostname | the name of the server in the server browser |
| serverCfg.password | the password of the game server |
| serverCfg.passwordAdmin | the admin password of the game server `!IMPORTANT! change this or others might be able to take control over your server` |

Below you will find a list of guides on how to edit these values.

<br><a name="guide-change-instance-id"></a>
### Change the instance ID <hr>  

For later compatibility between multiple installations and identification of different configs a instance id was introduced (currently it is not used)  

Set this to some id you like :)<br>
Example:<br>
`"instanceId": "main-server"`


<br><a name="guide-add-admins"></a>
### Adding more admins / moderators <hr>  

To add/remove admins or moderators, edit the admins list in the config.<br>
Read the description in the template to find out more about the roles.<br>
The example snippet shows how to add an admin, a manager and a moderator.<br>
```json
    ...
    "admins": [
        {
            "userId": "FunkyDude#1234",
            "userLevel": "admin",
            "password": "admin"
        },
        {
            "userId": "TheDude#4242",
            "userLevel": "manage",
            "password": "somecoolpassword"
        },
        {
            "userId": "InternDude#4321",
            "userLevel": "moderate",
            "password": "somoderatormuchwow"
        }
    ],
    ...
```

<br><a name="guide-discord-token"></a>
### Discord Token <hr>  

To obtain a discord bot token, follow the steps at: https://www.writebots.com/discord-bot-token/#Generating_Your_Token_Step-by-Step  

In a nutshell:
* login to the discord dev console: https://discordapp.com/developers/applications/
* Click on "New Application"
* Enter a application/bot name
* (Optional) Select an icon and enter a short description for your bot
* In the left menu, select "Bot"
* Click "Add Bot" and confirm
* Under "Token" copy the token by clicking on "Copy" or reveal value and copy the text
* paste the token inside the config file like so:
```json
"discordBotToken": "your-token.goes.here",
```

<br><a name="guide-discord-channels"></a>
### Discord Channels <hr>

To add/remove discord channels, edit the discordChannels list in the config.<br>
Read the description in the template to find out more about the channel types.<br>
The following example adds a channel for commands and one for rcon messages<br>
```json
...
"discordChannels": [
  {
      "channel": "main-server-commands",
      "mode": "admin"
  },
  {
      "channel": "main-server-rcon",
      "mode": "rcon"
  }
],
...
```

<br><a name="guide-add-local-mods"></a>
### Adding local / manually installed mods <hr>  

Local mods are mods which you manually install and update. The server manager will only add them to the server startup parameters.<br>
Example:<br>
```json
"localMods": [
  "@MyAwesomeMod",
  "path/to/my/@OtherAwesomeMod",
],
```

<br><a name="guide-add-workshop-mods"></a>
### Adding workshop mods <hr>  

Note: You must use a steam account that owns Dayz in order to download workshop mods.<br>

Workshop mods will be downloaded and updated everytime the server restarts (if not configured otherwise).<br>
The steamWsMods property specifies a list of workshop mods to download.<br>
There are two possible syntaxes: <br>

```json
"steamWsMods": [
  "1559212036",
  "1565871491"
],

```

or

```json
"steamWsMods": [
  {
    "workshopId": "1559212036",
    "name": "CF"
  },
  {
    "workshopId": "1565871491",
    "name": "BuilderItems"
  }
],
```

Hint: The name of the mod is only there to make the config more readable. You can enter whatever you want.<br>
Hint: You can mix the syntaxes<br>

<br><a name="guide-change-server-name-password"></a>
### Changing the server name / password / admin password <hr>  

* Open the `server-manager.json`
* find the `serverCfg` entry
* within this entry:
  * change the `hostname` property to change the server name
  * change the `password` property to change the server's password
  * change the `passwordAdmin` property to change the server's admin password

<br><a name="guide-change-server-port"></a>
### Changing the server port <hr>  

You might need to host your server on another port, because you want to host multiple servers on the same machine  
or whatever the reason might be.<br>

HowTo:<br>
* Open the `server-manager.json`
* find the `serverPort` property and change it to the desired port
* if you want to run multiple servers
  * find the `serverCfg` entry
  * in the this entry change the `steamQueryPort` property to the value of: `serverPort` + 3



<br><a name="guide-add-events"></a>
### Adding events <hr>  

Events are used to do tasks that are occurring at specific points in time.<br>
Typical examples would be regular server restarts and global messages to promote the server's discord.<br>
The following example shows exactly this.<br>
It is scheduling:
* a restart every 4 hours
* global messages every 15 minutes

The scheduling pattern is the CRON pattern.<br>
There are free websites to generate these peatterns pretty easily:
* [CronTab.guru](https://crontab.guru/)
* [CronJob.xyz](https://cronjob.xyz/)

For more details see the description in the `server-manager.json` itself.<br>

Example:<br>
```json
...
"events": [
    {
        "name": "Restart every 4 hours",
        "type": "restart",
        "cron": "0 0/4 * * *"
    },
    {
        "name": "Some Message",
        "type": "message",
        "cron": "0/15 * * * *",
        "params": [
            "Hello world"
        ]
    }
],
...
```

<br><a name="steam-cmd"></a>
## SteamCMD <hr>  

The server manager tries to automate every required installation step of the server.  
However, the DayZ Server and the DayZ Workshop Mods cannot be installed without an account which owns (only for workshop mods) DayZ (the full game).  
In order to login to your account, you have to provide your steam credentials in the configuration file.  
This is only needed ONCE, since SteamCMD caches your session. (If the cache is invalidated, you will need to provide it again)  
Your password will not be used for anything else. In fact, it is even hidden in the logs.  
Still, it is recommended that you create an account which owns only DayZ.    

If you are really paranoid about pasting your password somewhere, or you use steam guard:  
* You can start the manager once and wait until the login failed.
* At this point you can manually login to the SteamCMD once, so the session gets cached.
* You still need to provide the account name, otherwise a new session will be started.
  

<br><a name="todo"></a>
## Planned features / TODOs <hr>  

* Provide self generated/signed certificates for HTTPS
* More script hooks
* Custom discord commands
* Edit/View Bans in WebUI
* Examples and integration scripts for Workbench (for mod Development)

<br><a name="folder-layout"></a>  
## Default Folder Layout <hr>  

```
-- server-manager.json
-- DayZServer // contains the server installation
----- profiles // contains the server logs (rpt, ADM, ...) and battleye folder
----- serverDZ.cfg // server name, password, player count, ...
----- .. // other files, workshop mods will also be linked to this folder
-- SteamCMD
----- steamcmd.exe
----- ..
-- Workshop // contains the actual workshop mods
```

You can, however, change these paths to fit your needs

<br><a name="technical-details"></a>  
## Technical Details <hr>  

The server manager is a self contained NodeJS-App written in TypeScript and packaged with pkg.  
You DON'T need to install NodeJS or anything else.  
Everything you need is contained in the single executable (exe).  
However, due to that the exe is around 50MB in size.  
This tool makes use of the windows commandline tools (namely netsh and wmic) to determine installation requirements and the state of the server.  

<br><a name="security"></a>  
## Security <hr>

<br><a name="security-discord"></a>
### Discord <hr>  

The security model of the discord bot is based on the fact that discord gamer tags (name#number) ARE unique.<br>
We do not need to know/check actual account ids.<br>
If a user is able to post messages with a authorized gamer tag,<br>
it means that the user is actually logged in to the authorized account.<br>

<br><a name="security-web"></a>  
### WebUI and REST API Security <hr>

The UI and API are secured by basic auth.<br>
This should be "good enough" for this use case.<br>
However, be advised that if the UI or API are served to the (public) internet,<br>
the login info is not encrypted because the manager is served via HTTP.
<br><br>
To protect the UI and API from being intercepted/tampered with,<br>
you should consider using a reverse proxy (such as nginx) with a valid SSL Certificate on the same server<br>
(this might already be the case if you host a website).<br>
This way the traffic is handled securely until terminated at the reverse proxy.<br>
  
<br><a name="limitations"></a>  
## Known Issues / Limitations <hr>  

* SteamCMD Timeouts:
  * SteamCMD sometimes fails to download large mods (usually > 1GB)
  * this depends on your hardware and the network
  * steamcmd CANNOT be configured to use a timeout greater than 300 seconds
  * the server-manager expects failures like that and retries mod downloads respectively

<br>

* Apparently the steam cmd reverts changes to the default mission `dayzOffline.ChernarusPlus` when validating the isntallation..
* to prevent this simply add your own mission  
  * simply copy `dayzOffline.chernarusplus` and rename it to `dayz.chernarusplus` (or something else)
  * change the `server-manager.json` - `serverCfg` - `Missions` - `DayZ` - `template` to `dayz.chernarusplus`

<br>

* Copied mods / More Disk Usage
  * By default the manager copies mods to the server directory instead of linking them (can be configured)
    * Otherwise the SteamCMD could not update mods while the server is running (disables manual mod updates)
  * Mods are only copied if their content has been changed which further improves server startup time

<br>

* Process State:
  * since the dayz server is immediately detached after starting, we cannot determine the processid (PID) of it (if anyone knows a way to do that let me know :) )
  * because of this the manager queries all running processes via wmic and determines the server process by executable path
  * wmic can be a very CPU demanding tool and because of this the check interval should be a bit longer
  
  * a small sidenote: if server crashes with a popup, it is still detected as running. To prevent this windows error reporting must be disabled

<br>

* AntiVirus:
  * some antiviruses may block certain functions of this app (probably the calls to wmic or netsh)
  * this is just a guess and I personally haven't had any issues yet

<br>

* This app has not been tested all to well
  * if you have any issues please report them to get them fixed

<br><a name="disclaimer"></a>  
## Disclaimer <hr>

### NO WARRANTY / GUARANTEE RESPONSIBILITY

By using the software and/or thw source code you agree that the authors CAN NOT be held responsible for any damages caused by the software and/or the source code.

