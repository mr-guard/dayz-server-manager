
class ServerManagerCallback: RestCallback
{
	void ServerManagerCallback()
	{
	}
	
	override void OnSuccess(string data, int dataSize)
	{
	}
	
	override void OnError(int errorCode)
	{
		Print("OnError: " + errorCode);
	}
	
	override void OnTimeout()
	{
		Print("OnTimeout");
	}
};

class ServerManagerEntry
{
	string entryType;
	string type;
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
		for (int i = 0; i < players; i++)
		{

		}
		delete players;

		delete vehicles;
	}

}

class DayZServerManagerWatcher
{
    private ref RestApi m_api;
    private ref RestContext m_context;
    private string m_token;
    private string m_port;
    private ref Timer m_Timer;
	private ref JsonSerializer m_serializer;

    void DayZServerManagerWatcher()
    {
		
		Print("DayZServerManagerWatcher()");
		
        if (!IsMissionClient())
		{
			Print("DayZServerManagerWatcher() - INIT");
			
			string port;
            GetGame().CommandlineGetParam("serverManagerPort", port);

			m_port = port;

			string token;
            GetGame().CommandlineGetParam("serverManagerToken", token);

			m_token = token;

            m_api = CreateRestApi();
            // m_api.EnableDebug(true);
            m_context = m_api.GetRestContext("http://localhost:" + m_port + "/ingame/");

			m_serializer = new JsonSerializer();
			
            StartLoop();
			Print("DayZServerManagerWatcher() - INIT DONE");
        }
    }

    void Post(string data)
	{
        // m_context.SetHeader("Token", m_token);
        m_context.SetHeader("application/json");
        m_context.POST(new ServerManagerCallback, "stats?token=" + m_token, data);
	}

    float GetInterval()
	{
		return 30.0;
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
		Print("DayZServerManagerWatcher() - TICK");
		int i;
		
		ServerManagerEntryContainer container = new ServerManagerEntryContainer;
		
		array<EntityAI> allVehicles;
		DayZServerManagerContainer.GetVehicles(allVehicles);
		for (i = 0; i < allVehicles.Count(); i++)
		{
			EntityAI itrCar = allVehicles.Get(i);
			
			ref ServerManagerEntry entry = new ServerManagerEntry();
			
			entry.entryType = "VEHICLE";
			entry.name = itrCar.GetName();
			entry.damage = itrCar.GetDamage();
			entry.type = itrCar.GetType();
			entry.id = itrCar.GetID();
			entry.speed = itrCar.GetSpeed().ToString(false);
			entry.position = itrCar.GetPosition().ToString(false);
			
			container.vehicles.Insert(entry);
		}
		
		array<Man> players;
		GetGame().GetPlayers(players);
		for (i = 0; i < players.Count(); i++)
		{
			Man player = players.Get(i);
			
			ServerManagerEntry playerEntry = new ServerManagerEntry();
			
			playerEntry.entryType = "PLAYER";
			playerEntry.name = player.GetIdentity().GetName();
			// player.GetDisplayName();
			playerEntry.damage = player.GetDamage();
			playerEntry.type = player.GetType();
			playerEntry.id = player.GetID();
			playerEntry.speed = player.GetSpeed().ToString(false);
			playerEntry.position = player.GetPosition().ToString(false);
	
			container.players.Insert(playerEntry);
		}

		string json;
		m_serializer.WriteToString(container, false, json);
		
		Post(json);
	}

}

modded class MissionServer
{
    private ref DayZServerManagerWatcher m_dayZServerManagerWatcher;

    void MissionServer()
    {
        m_dayZServerManagerWatcher = new DayZServerManagerWatcher();
    }
};