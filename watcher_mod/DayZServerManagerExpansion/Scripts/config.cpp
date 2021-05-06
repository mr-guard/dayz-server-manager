class CfgPatches
{
	class DayZServerManagerExpansion
	{
		units[] = {};
		weapons[] = {};
		requiredVersion = 0.1;
		requiredAddons[] = {
			"DayZServerManager",
			"DayZExpansion_Vehicles_Scripts"
		};
	};
};
class CfgMods
{
	class DayZServerManagerExpansion
	{
		dir = "DayZServerManagerExpansion";
		credits = "";
		extra = 0;
		type = "mod";
		name = "DayZServerManagerExpansion";
		picture = "";
		logo = "";
		logoSmall = "";
		logoOver = "";
		tooltip = "DayZServerManagerExpansion";
		overview = "DayZServerManagerExpansion";
		action = "";
		author = "DayZServerManagerExpansion";
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
                    "DayZServerManagerExpansion/Scripts/Common",
                    "DayZServerManagerExpansion/Scripts/1_Core"
                };
			};
			class gameLibScriptModule
			{
				value = "";
				files[] = {
                    "DayZServerManagerExpansion/Scripts/Common",
                    "DayZServerManagerExpansion/Scripts/2_GameLib"
                };
			};
			class gameScriptModule
			{
				value = "";
				files[] = {
                    "DayZServerManagerExpansion/Scripts/Common",
                    "DayZServerManagerExpansion/Scripts/3_Game"
                };
			};
			class worldScriptModule
			{
				value = "";
				files[] = {
                    "DayZServerManagerExpansion/Scripts/Common",
                    "DayZServerManagerExpansion/Scripts/4_World"
                };
			};
			class missionScriptModule
			{
				value = "";
				files[] = {
                    "DayZServerManagerExpansion/Scripts/Common",
                    "DayZServerManagerExpansion/Scripts/5_Mission"
                };
			};
		};
	};
};
