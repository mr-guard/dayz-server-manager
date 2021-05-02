class CfgPatches
{
	class DayZServerManager
	{
		units[] = {};
		weapons[] = {};
		requiredVersion = 0.1;
		requiredAddons[] = {};
	};
};
class CfgMods
{
	class DayZServerManager
	{
		dir = "DayZServerManager";
		credits = "";
		extra = 0;
		type = "mod";
		name = "DayZServerManager";
		picture = "";
		logo = "";
		logoSmall = "";
		logoOver = "";
		tooltip = "DayZServerManager";
		overview = "DayZServerManager";
		action = "";
		author = "DayZServerManager";
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
                    "DayZServerManager/Scripts/Common",
                    "DayZServerManager/Scripts/1_Core"
                };
			};
			class gameLibScriptModule
			{
				value = "";
				files[] = {
                    "DayZServerManager/Scripts/Common",
                    "DayZServerManager/Scripts/2_GameLib"
                };
			};
			class gameScriptModule
			{
				value = "";
				files[] = {
                    "DayZServerManager/Scripts/Common",
                    "DayZServerManager/Scripts/3_Game"
                };
			};
			class worldScriptModule
			{
				value = "";
				files[] = {
                    "DayZServerManager/Scripts/Common",
                    "DayZServerManager/Scripts/4_World"
                };
			};
			class missionScriptModule
			{
				value = "";
				files[] = {
                    "DayZServerManager/Scripts/Common",
                    "DayZServerManager/Scripts/5_Mission"
                };
			};
		};
	};
};
