
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
	autoptr array<ServerManagerEntry> players = new array<ServerManagerEntry>;
	autoptr array<ServerManagerEntry> vehicles = new array<ServerManagerEntry>;
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
        if (!IsMissionClient())
		{
			string port;
            GetGame().CommandlineGetParam("serverManagerPort", port);

			m_port = port;

			string token;
            GetGame().CommandlineGetParam("serverManagerToken", token);

			m_token = token;

            m_api = CreateRestApi();
            // m_api.EnableDebug(true);
            m_context = m_api.GetRestContext("http://localhost:" + m_port + "/api/");

			m_serializer = new JsonSerializer();
			
            StartLoop();
        }
    }

    void Post(string data)
	{
        // m_context.SetHeader("Token", m_token);
        m_context.SetHeader("application/json");
        m_context.POST(new ServerManagerCallback, "ingame", data);
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
		int i;
		ServerManagerEntry entry;
		
		ServerManagerEntryContainer container = new ServerManagerEntryContainer;
		
		set<CarScript> allVehicles = CarScript.GetManagerAllVehicles();
		for (i = 0; i < allVehicles.Count(); i++)
		{
			CarScript itrCar = allVehicles.Get(i);
			
			entry = new ServerManagerEntry();
			
			entry.entryType = "VEHICLE";
			entry.name = itrCar.GetName();
			entry.damage = itrCar.GetDamage();
			entry.type = itrCar.GetType();
			entry.id = itrCar.GetID();
			entry.speed = itrCar.GetSpeed().ToString(false);
			entry.position = itrCar.GetPosition().ToString(false);
			
			container.vehicles.Insert(entry);
		}
		
		set<ExpansionVehicleBase> allExpansionVehicles = ExpansionVehicleBase.GetManagerAllVehicles();
		for (i = 0; i < allExpansionVehicles.Count(); i++)
		{
			ExpansionVehicleBase itrVeh = allExpansionVehicles.Get(i);
			
			entry = new ServerManagerEntry();
			
			entry.entryType = "VEHICLE";
			entry.name = itrVeh.GetName();
			entry.damage = itrVeh.GetDamage();
			entry.type = itrVeh.GetType();
			entry.id = itrVeh.GetID();
			entry.speed = itrVeh.GetSpeed().ToString(false);
			entry.position = itrVeh.GetPosition().ToString(false);
			
			container.vehicles.Insert(entry);
		}
		
		array<Man> players;
		GetGame().GetPlayers(players);
		for (i = 0; i < players.Count(); i++)
		{
			Man player = players.Get(i);
			
			entry = new ServerManagerEntry();
			
			entry.entryType = "PLAYER";
			entry.name = player.GetIdentity().GetName();
			// player.GetDisplayName();
			entry.damage = player.GetDamage();
			entry.type = player.GetType();
			entry.id = player.GetID();
			entry.speed = player.GetSpeed().ToString(false);
			entry.position = player.GetPosition().ToString(false);
	
			container.players.Insert(entry);
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