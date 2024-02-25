# DayZ Server Manager

[![Pricing](https://img.shields.io/badge/Pricing-FREE-green.svg)](https://github.com/mr-guard/dayz-server-manager/)
[![license](https://img.shields.io/github/license/mr-guard/dayz-server-manager.svg)](https://github.com/mr-guard/dayz-server-manager/blob/master/LICENSE)
[![GitHub Workflow Status](https://github.com/mr-guard/dayz-server-manager/actions/workflows/build.yml/badge.svg)](https://github.com/mr-guard/dayz-server-manager)
[![CodeCoverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/mr-guard/442a5cdea03dd79a87b34339a7a16a2c/raw/dayz-server-manager__heads_master.json)](https://github.com/mr-guard/dayz-server-manager)
[![GitHub commits](https://img.shields.io/github/commits-since/mr-guard/dayz-server-manager/latest.svg)](https://GitHub.com/mr-guard/dayz-server-manager/commit/)
[![GitHub release](https://img.shields.io/github/release/mr-guard/dayz-server-manager.svg)](https://GitHub.com/mr-guard/dayz-server-manager/releases/latest)
[![Github all releases](https://img.shields.io/github/downloads/mr-guard/dayz-server-manager/total.svg)](https://GitHub.com/mr-guard/dayz-server-manager/releases/)  
[![Discord](https://img.shields.io/discord/970272136688205874)](https://discord.gg/pKwJcXutBa)


This tool aims to simplify the process of setting up a DayZ Standalone Server on a Windows Server.  
The goal was to break down the initial effort to a minimum while providing configuration to nearly all aspects of the server administration process.

Also supports linux server (See [Linux Server Usage](#linux-server))

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
    10. [Add Hooks](#guide-add-hooks)
6. [Linux Server](#linux-server)
7. [Steam CMD](#steam-cmd)
8. [TODOs](#todo)
9. [Default folder layout](#folder-layout)
10. [Technical details](#technical-details)
11. [Security](#security)
    1. [Discord](#security-discord)
    2. [Web](#security-web)
12. [Known Issues and Limitations](#limitations)
13. [Development](#development)
14. [Disclaimer](#disclaimer)

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

* A Windows or linux (Root) Server with RDP/Shell access
  * hosted instances (like nitrado) cannot use this EXCEPT they can run arbitrary programs
* To download mods: A steam account that owns DayZ and has SteamGuard set to EMAIL or DEACTIVATED!
* That's it!

<br><a name="usage"></a>
## Usage <hr>  

* Download the [latest version](https://github.com/mr-guard/dayz-server-manager/releases/latest) of the manager
* Extract the manager in the directory where you want your serverfiles to be
* Start the manager once to create a new config with default values
* Edit the `server-manager.json` config to fit your needs
  * Fill the required fields (everything is described in the file)
`!IMPORTANT! Change the admin and rcon password`
  * Other than that the defaults will probably fit your needs
  * You can also checkout the [configuration guides](#configuration)
* Start the manager and it will use the updated config
<br>
* It is recommended to create a separate Steam account which owns DayZ. You need to set SteamGuard to EMAIL or DEACTIVATED! Do not use Mobile authenticator because those codes will not be saved on the server and need to be entered on every download/update. 
<br>
* Optionally you can add it as Windows/Linux Service instead of launching it manually
<br>
* Make sure the "Execution Location" is the folder, where the config is located (this is not necessarily the folder where the manager executable is located)

<br><a name="updating"></a>
## Updating <hr>  

This app was written with backwards compatibility in mind.<br>
Sometimes, however, some breaking changes to the server manager config will occur.<br>
The best strategy to update, is to take the config template of the new version and modify it to match your old values.<br>
This way you can not miss out on new properties which might be required.<br>

<br><a name="configuration"></a>
## Configuration <hr>  

The configuration of the manager is all done in a single config file.<br>
<br>
When installing the manager the first time, you will find a configuration template which needs to be renamed to `server-manager.json`.<br>
You can then go ahead and change the settings inside of this file.<br>
If you do not need anything special (you would probably know by now), then the default values will work out well.<br>
<br>
You can also configure serverDZ.cfg manually, but you will have to set the serverCfg to `null`:
```json
{
  ...
  "serverCfg": null
  ...
}
``` 
Otherwise it will be overriden by the settings inside the `server-manager.json`.<br>
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
            "userId": "FunkyDude",
            "userLevel": "admin",
            "password": "admin"
        },
        {
            "userId": "the-discord-dude",
            "userLevel": "manage",
            "password": "somecoolpassword"
        },
        {
            "userId": "InternDude",
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
* Scroll down and enable the "MESSAGE CONTENT INTENT" (allows the bot to parse the messages)
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

<br><a name="guide-add-hooks"></a>
### Adding hooks <hr>  

Hooks can be used to trigger external scripts or programs on certain events.  
This can be useful to so manual configuration or other custom stuff.

Possible hook types are:

* beforeStart - triggered right before server start
* missionChanged - triggered after the mission files were changed (i.e. types editor save)

In the server manager config add a hook object to the hooks array like so:  

```json
...
"hooks": [
  {
    "type": "beforeStart",
    "program": "path/to/your/script.bat"
  }
],
...
```

<br><a name="linux-server"></a>  
## Linux Server <hr>

The manager was tested on Ubuntu 22 (latest).
Other up2date debian variants should work as well.
<br>
The DayZServer only works on x86 platforms, ARM is NOT supported!
<br>
The manager can be run via the binary (recommended) or docker.<br>
The main downside when run with docker:  
If the manager crashes or shuts down, your dayz server will also be shut down.

### Binary

(the commands below might be needed to be run as root/with sudo)

1. Install  the required libs for dayz and steamcmd
  ```sh
  apt-get install libcap-dev lib32gcc-s1 libcurl4  libcurl4-openssl-dev
  ```
2. Create a user for the server (highly recommended for security reasons)
   The user should have the home directory set to where the server files will reside
   Replace `/dayz` with the directory you want your server to be in, but make sure its already created
  ```sh
    useradd --system -m -d /dayz -s /bin/bash dayz
    chown dayz:dayz /dayz
  ```
3. Download and extract the latest linux release from the releases page
4. Setup the manager files
  4.1. Copy the `dayz-server-manager` binary to your `/dayz` directory
  4.2. Copy the `server-manager-template.json` to the `/dayz`
  4.3. Rename the `server-manager-template.json` to the `server-manager.json`
  4.4. Edit the `server-manager.json` with a text editor to fit your needs
       (Make sure its valid json. Its recommended to use VSCode for editing and set the file type to jsonc / json with comments)

5. Switch to the `/dayz` dir
   ```sh
   cd /dayz
   ```
6. Make the binary executable and owned by the dayz user
   ```sh
   chown dayz:dayz dayz-server-manager
   chmod +x dayz-server-manager
   ```
7. Switch to the dayz user
   ```sh
   su dayz
   ```
8. Run the manager
   ```sh
   ./dayz-server-manager
   ```

#### Creating a daemon / service

1. Create the service file `/etc/systemd/system/dayz-server-manager.service`
    ```sh
    [Unit]
    Description=DayZ Server Manager
    Wants=network-online.target
    After=syslog.target network.target nss-lookup.target network-online.target

    [Service]
    ExecStart=/dayz/dayz-server-manager
    WorkingDirectory=/dayz/
    LimitNOFILE=100000
    ExecReload=/bin/kill -s HUP $MAINPID
    ExecStop=/bin/kill -s INT $MAINPID
    User=dayz
    Group=users
    Restart=on-failure
    RestartSec=5s

    [Install]
    WantedBy=multi-user.target
    ```
2. Daemon realod and enable the service
   ```sh
   systemctl daemon-reload
   service dayz-server-manager enable
   ```
3. Start the service
   ```sh
   service dayz-server-manager start
   ```
4. Check the service status
   ```sh
   service dayz-server-manager status
   ```

### Docker

The manager is also published as a docker image:  
`ghcr.io/mr-guard/dayz-server-manager:latest`
<br>
If you run the manager inside docker, the dayz server will also start in the same container.
If you stop the manager, the dayz server will stop as well.

How-To:

1. Create a directory for your server and make sure its accessible
   ```sh
   mkdir /dayz
   chmod 777 /dayz
   ```

2. Copy your `server-manager.json` inside that dir

3. Copy the `docker-compose.yml` from the repository to that dir.

4. Start the server manager:
   ```sh
   docker compose up -d
   ```

You can run the image without compose, but you will need to figure that out on your own...

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
-- STEAM_GUARD_CODE // Optional text file. Containing only your steam guard code. will be deleted after usage. See Known Issues / Limitations for more details.
-- SERVER_LOCK // Optional file. If exists server restarts will be skipped
```

You can, however, change these paths to fit your needs

<br><a name="technical-details"></a>  
## Technical Details <hr>  

The server manager is a self contained NodeJS-App written in TypeScript and packaged with pkg.  
You DON'T need to install NodeJS or anything else.  
Everything you need is contained in the single executable (exe).  
However, due to that the exe is around 90MB in size.  
This tool makes use of the windows commandline tools (namely netsh and wmic) or the linux cli tools and procfs to determine installation requirements and the state of the server.  
It is recommended NOT to use an elevated user for running it.

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

* SteamCMD asks for code every time:
  * The integration with SteamCMD requires SteamGuard to be set to email code or deactivated in order for the code to be cached.
  * Steam Mobile Authenticator cannot be cached by SteamCMD.

<br>

* SteamCMD Timeouts:
  * SteamCMD sometimes fails to download large mods (usually > 1GB)
  * this depends on your hardware and the network
  * steamcmd CANNOT be configured to use a timeout greater than 300 seconds
  * the server-manager expects failures like that and retries mod downloads respectively

<br>

* SteamCMD Rate-Limit:
  * The SteamCMD rate limit might occur if you download many mods at once (i.e. first setup)
  * You will see an error that includes status code = 5 or rate limit
  * this is nothing bad.. you are not banned.. you just need to wait some time and retry
  * the manager already tries to downloads mods in batches to prevent this by default, but sometimes thats not enough

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
  * since the dayz server is immediately detached after starting, we cannot determine the processid (PID) of it
  * because of this the manager queries all running processes via wmic and determines the server process by executable path
  * wmic can be a very CPU demanding tool and because of this the check interval should be a bit longer
  
  * a small sidenote: if server crashes with a popup, it is still detected as running. To prevent this windows error reporting must be disabled

<br>

* AntiVirus:
  * some antiviruses may block certain functions of this app (probably the calls to wmic or netsh)
  * this is just a guess and I personally haven't had any issues yet

<br>

* This app has been tested but is very complex
  * if you have any issues please report them to get them fixed


<br><a name="development"></a>  
## Development <hr>

To work on the server manager, the nodejs runtime (v14) must be installed and the node extensions must be compiled locally.  
To do this, you will need a C++ compiler:

Windows:
```
choco install python python2 -y
choco install visualstudio2019buildtools -y
choco install visualstudio2019-workload-vctools -y
```

Linux:
```
apt-get install -y make python3 python2 build-essential
```

When the tools are installed, clone the repository and run `npm ci`.

When everything is installed, you can start the manager by running:

CLI mode:
```
npm run start
```

Packed mode:
```
npm run startPacked
```

<br><a name="disclaimer"></a>  
## Disclaimer <hr>

### NO WARRANTY / GUARANTEE RESPONSIBILITY

By using the software and/or thw source code you agree that the authors CAN NOT be held responsible for any damages caused by the software and/or the source code.

