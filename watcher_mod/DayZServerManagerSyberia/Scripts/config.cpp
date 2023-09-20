class CfgPatches
{
	class DayZServerManagerSyberia
	{
		units[] = {};
		weapons[] = {};
		requiredVersion = 0.1;
		requiredAddons[] = {
			"DayZServerManager",
			"DZ_Data",
			"DZ_Scripts",
			"SyberiaScripts",
			"SyberiaServer"
		};
	};
};
class CfgMods
{
	class DayZServerManagerSyberia
	{
		dir = "DayZServerManagerSyberia";
		credits = "";
		extra = 0;
		type = "mod";
		name = "DayZServerManagerSyberia";
		picture = "";
		logo = "";
		logoSmall = "";
		logoOver = "";
		tooltip = "DayZServerManagerSyberia";
		overview = "DayZServerManagerSyberia";
		action = "";
		author = "DayZServerManagerSyberia";
		authorID = "";
		dependencies[] = {
            // "Game",
            "World",
            "Mission"
        };
		class defs
		{
			class widgetStyles
			{
				files[] = {};
			};
			class imageSets
			{
				files[] = {};
			};
			class engineScriptModule
			{
				value = "";
				files[] = {
                    "DayZServerManagerSyberia/Scripts/Common",
                    "DayZServerManagerSyberia/Scripts/1_Core"
                };
			};
			class gameLibScriptModule
			{
				value = "";
				files[] = {
                    "DayZServerManagerSyberia/Scripts/Common",
                    "DayZServerManagerSyberia/Scripts/2_GameLib"
                };
			};
			class gameScriptModule
			{
				value = "";
				files[] = {
                    "DayZServerManagerSyberia/Scripts/Common",
                    "DayZServerManagerSyberia/Scripts/3_Game"
                };
			};
			class worldScriptModule
			{
				value = "";
				files[] = {
                    "DayZServerManagerSyberia/Scripts/Common",
                    "DayZServerManagerSyberia/Scripts/4_World"
                };
			};
			class missionScriptModule
			{
				value = "";
				files[] = {
                    "DayZServerManagerSyberia/Scripts/Common",
                    "DayZServerManagerSyberia/Scripts/5_Mission"
                };
			};
		};
	};
};
