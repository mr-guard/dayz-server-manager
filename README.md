# DayZ Server Manager

[![Pricing](https://img.shields.io/badge/Pricing-FREE-green.svg)](https://github.com/mr-guard/dayz-server-manager/)
[![license](https://img.shields.io/github/license/mr-guard/dayz-server-manager.svg)](https://github.com/mr-guard/dayz-server-manager/blob/master/LICENSE)
[![Size](https://badge-size.herokuapp.com/mr-guard/dayz-server-manager/master)](https://github.com/mr-guard/dayz-server-manager/blob/master)
![GitHub Workflow Status](https://img.shields.io/github/workflow/status/mr-guard/dayz-server-manager/build)


[![GitHub release](https://img.shields.io/github/release/mr-guard/dayz-server-manager.svg)](https://GitHub.com/mr-guard/dayz-server-manager/releases/)
[![GitHub commits](https://img.shields.io/github/commits-since/mr-guard/dayz-server-manager/latest.svg)](https://GitHub.com/mr-guard/dayz-server-manager/commit/)
[![Github all releases](https://img.shields.io/github/downloads/mr-guard/dayz-server-manager/total.svg)](https://GitHub.com/mr-guard/dayz-server-manager/releases/)  


[![GitHub forks](https://img.shields.io/github/forks/mr-guard/dayz-server-manager.svg?style=social&label=Fork&maxAge=2592000)](https://GitHub.com/mr-guard/dayz-server-manager/network/)
[![GitHub stars](https://img.shields.io/github/stars/mr-guard/dayz-server-manager.svg?style=social&label=Star&maxAge=2592000)](https://GitHub.com/mr-guard/dayz-server-manager/stargazers/)


This tool aims to simplify the process of setting up a DayZ Standalone Server on a Windows Server.  
The goal was to break down the initial effort to a minimum while providing configuration to nearly all aspects of the server administration process.

## Installation Requirements
* A Windows (Root) Server with RDP/Shell access
  * hosted instances (like nitrado) cannot use this EXCEPT they can run arbitrary programs
* That's it!

## Usage
* Download the latest version of the manager
* Extract the manager and the config template
* Copy and rename the config template to 'server-manager.json'
* Edit the 'server-manager.json' config to fit your needs
  * Fill the required fields (everything is described in the file)
`!IMPORTANT! Change the admin and rcon password`
  * Other than that the defaults will probably fit your needs
* Start the manager in the folder where the config is situated

* Optionally you can add it as Windows Service instead of launching it manually
* Make sure the "Execution Location" is the folder, where the config is located (this is not necessarily the folder where the manager executable is located)

## Features
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
* Web UI
  * Secured by basic auth
  * Manage your server remotely, even on your phone
    * No need to use RDP for common tasks
  * Displays various metrics (player count, CPU/RAM usage)
  * Read Server Logs (RPT, ADM, Script Log)
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

![Web UI Dashboard](/resources/webui_dashboard_screen.png "Web UI Dashboard")

![Web UI System](/resources/webui_system_screen.png "Web UI System")

## SteamCMD
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

## Planned features / TODOs
* Edit serverDZ.cfg from Web UI
* Provide self generated/signed certificates for HTTPS
* Tutorials for installation and configuration
* Tutorial for discord bot token
* More script hooks
* Custom discord commands
* Edit/View Bans in WebUI
* Examples and integration scripts for Workbench (for mod Development)

## Default Folder Layout

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

## Technical Details
The server manager is a self contained NodeJS-App written in TypeScript and packaged with pkg.  
You DON'T need to install NodeJS or anything else.  
Everything you need is contained in the single executable (exe).  
However, due to that the exe is around 50MB in size.  
This tool makes use of the windows commandline tools (namely netsh and wmic) to determine installation requirements and the state of the server.  

## Security
### Discord
The security model of the discord bot is based on the fact that discord gamer tags (name#number) ARE unique.  
We do not need to know/check actual account ids.  
If a user is able to post messages with a authorized gamer tag,  
it means that the user is actually logged in to the authorized account.  

### WebUI and REST API Security
The UI and API are secured by basic auth.  
This should be "good enough" for this use case.  
However, be advised that if the UI or API are served to the (public) internet,  
the login info is not encrypted because the manager is served via HTTP.  
  
To protect the UI and API from being intercepted/tampered with,  
you should consider using a reverse proxy (such as nginx) with a valid SSL Certificate on the same server  
(this might already be the case if you host a website).  
This way the traffic is handled securely until terminated at the reverse proxy.  

## Known Issues / Limitations

* SteamCMD Timeouts:
  * SteamCMD sometimes fails to download large mods (usually > 1GB)
  * this depends on your hardware and the network
  * steamcmd CANNOT be configured to use a timeout greater than 300 seconds
  * the server-manager expects failures like that and retries mod downloads respectively

* Copied mods / More Disk Usage
  * By default the manager copies mods to the server directory instead of linking them (can be configured)
    * Otherwise the SteamCMD could not update mods while the server is running (disables manual mod updates)
  * Mods are only copied if their content has been changed which further improves server startup time

* Process State:
  * since the dayz server is immediately detached after starting, we cannot determine the processid (PID) of it (if anyone knows a way to do that let me know :) )
  * because of this the manager queries all running processes via wmic and determines the server process by executable path
  * wmic can be a very CPU demanding tool and because of this the check interval should be a bit longer
  
  * a small sidenote: if server crashes with a popup, it is still detected as running. To prevent this windows error reporting must be disabled

* AntiVirus:
  * some antiviruses may block certain functions of this app (probably the calls to wmic or netsh)
  * this is just a guess and I personally haven't had any issues yet

* This app has not been tested all to well
  * if you have any issues please report them to get them fixed

## Disclaimer

### NO WARRANTY / GUARANTEE RESPONSIBILITY

By using the software and/or thw source code you agree that the authors CAN NOT be held responsible for any damages caused by the software and/or the source code.

