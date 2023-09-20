class ServerManagerCallback: RestCallback
{	
	override void OnSuccess(string data, int dataSize)
	{
		#ifdef DZSM_DEBUG
		Print("DZSM ~ OnSuccess Data: " + data);
		#endif
	}
	
	override void OnError(int errorCode)
	{
		#ifdef DZSM_DEBUG
		Print("DZSM ~ OnError: " + errorCode);
		#endif
	}
	
	override void OnTimeout()
	{
		#ifdef DZSM_DEBUG
		Print("DZSM ~ OnTimeout");
		#endif
	}
};

class ServerManagerEntry
{
	string entryType;
	string type;
	string category;
	string name;
	int id;
	string position;	
	string speed;
	float damage;
}


class ServerManagerEntryContainer
{
	ref array<ref ServerManagerEntry> players = new array<ref ServerManagerEntry>;
	ref array<ref ServerManagerEntry> vehicles = new array<ref ServerManagerEntry>;

	void ServerManagerEntryContainer()
	{
	}

	void ~ServerManagerEntryContainer()
	{
		int i = 0;
		for (i = 0; i < players.Count(); i++)
		{
			delete players.Get(i);
		}
		delete players;

		for (i = 0; i < vehicles.Count(); i++)
		{
			delete vehicles.Get(i);
		}
		delete vehicles;
	}

}

class DayZServerManagerWatcher
{
    private ref Timer m_Timer;
	private ref Timer m_InitTimer;

	private ref JsonSerializer m_jsonSerializer = new JsonSerializer;
	
	private RestApi m_RestApi;
    private RestContext m_RestContext;

    void DayZServerManagerWatcher()
    {
		#ifdef DZSM_DEBUG
		Print("DZSM ~ DayZServerManagerWatcher()");
		#endif

        m_InitTimer = new Timer(CALL_CATEGORY_GAMEPLAY);
		m_InitTimer.Run(2.0 * 60.0, this, "init", null, false);
    }

	void init()
	{
		#ifdef DZSM_DEBUG
		Print("DZSM ~ DayZServerManagerWatcher() - INIT");
		#endif

		m_RestApi = CreateRestApi();
        m_RestContext = m_RestApi.GetRestContext(GetDZSMApiOptions().host);
		m_RestContext.SetHeader("application/json");
        m_RestApi.EnableDebug(false);
		
		StartLoop();
		#ifdef DZSM_DEBUG
		Print("DZSM ~ DayZServerManagerWatcher() - INIT DONE");
		#endif
	}

    float GetInterval()
	{
		return GetDZSMApiOptions().reportInterval;
	}

    void StartLoop()
	{
		if (!m_Timer)
		{
			m_Timer = new Timer(CALL_CATEGORY_GAMEPLAY);
		}
		
		m_Timer.Run(GetInterval(), this, "Tick", null, true);
	}
	
	void StopLoop()
	{
		if (m_Timer)
		{
			m_Timer.Stop();
		}
	}

	void Tick()
	{
		#ifdef DZSM_DEBUG
		Print("DZSM ~ TICK");
		#endif
		int i;
		
		ref ServerManagerEntryContainer container = new ServerManagerEntryContainer;
		
		array<EntityAI> allVehicles;
		DayZServerManagerContainer.GetVehicles(allVehicles);
		if (allVehicles)
		{
			for (i = 0; i < allVehicles.Count(); i++)
			{
				EntityAI itrCar = allVehicles.Get(i);
				
				ref ServerManagerEntry entry = new ServerManagerEntry();
				
				entry.entryType = "VEHICLE";
				
				if (itrCar.IsKindOf("ExpansionHelicopterScript"))
				{
					entry.category = "AIR";
				}
				else if (itrCar.IsKindOf("ExpansionBoatScript"))
				{
					entry.category = "SEA";
				}
				else
				{
					entry.category = "GROUND";
				}
				
				entry.name = itrCar.GetName();
				entry.damage = itrCar.GetDamage();
				entry.type = itrCar.GetType();
				entry.id = itrCar.GetID();
				entry.speed = itrCar.GetSpeed().ToString(false);
				entry.position = itrCar.GetPosition().ToString(false);
				
				container.vehicles.Insert(entry);
			}
		}
		
		array<Man> players = new array<Man>();
		GetGame().GetPlayers(players);
		if (players)
		{
			for (i = 0; i < players.Count(); i++)
			{
				Man player = players.Get(i);
				
				ref ServerManagerEntry playerEntry = new ServerManagerEntry();
				
				playerEntry.entryType = "PLAYER";
				playerEntry.category = "MAN";

				playerEntry.name = player.GetIdentity().GetName();
				// player.GetDisplayName();
				playerEntry.damage = player.GetDamage();
				playerEntry.type = player.GetType();
				playerEntry.id = player.GetID();
				playerEntry.speed = player.GetSpeed().ToString(false);
				playerEntry.position = player.GetPosition().ToString(false);

				container.players.Insert(playerEntry);
			}
		}

		DZSMApiOptions apiOptions = GetDZSMApiOptions();
		if (apiOptions.useApiForReport)
		{
			#ifdef DZSM_DEBUG
			Print("DZSM ~ API TICK");
			#endif

			// RestContext restContext = GetRestApi().GetRestContext(apiOptions.host);
			// restContext.SetHeader("application/json");
			// restContext.POST_now("/ingamereport?key=" + apiOptions.key, JsonFileLoader<ref ServerManagerEntryContainer>.JsonMakeData(container));
			m_RestContext.POST(new ServerManagerCallback(), string.Format("/ingamereport?key=%1", apiOptions.key), JsonFileLoader<ref ServerManagerEntryContainer>.JsonMakeData(container));
		}
		else
		{
			JsonFileLoader<ref ServerManagerEntryContainer>.JsonSaveFile("$profile:DZSM-TICK.json", container);
		}

		#ifdef DZSM_DEBUG
		Print("DZSM ~ Cleanup");
		#endif
		delete container;
		#ifdef DZSM_DEBUG
		Print("DZSM ~ Cleanup Done");
		#endif
	}

}

modded class MissionServer
{
    private ref DayZServerManagerWatcher m_dayZServerManagerWatcher;

    void MissionServer()
    {
		#ifdef DZSM_DEBUG
		Print("DZSM ~ MissionServer");
		#endif
    }

	override void OnInit()
	{
		super.OnInit();
		
		#ifdef DZSM_DEBUG
		Print("DZSM ~ MissionServer.OnInit");
		#endif
	}

	override void OnMissionStart()
	{
		super.OnMissionStart();
		#ifdef DZSM_DEBUG
		Print("DZSM ~ MissionServer.OnMissionStart");
		#endif

		if (!GetGame().IsClient())
		{
        	m_dayZServerManagerWatcher = new DayZServerManagerWatcher();
		}
	}
};