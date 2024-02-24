// #define DZSM_DEBUG_CONTAINER

class DayZServerManagerContainer
{
	private static ref array<EntityAI> m_vehicles = new array<EntityAI>;
	
    static void registerVehicle(EntityAI vehicle)
	{
		if (vehicle)
		{
			#ifdef DZSM_DEBUG_CONTAINER
			Print("DZSM ~ Registered: " + vehicle.GetType());
			#endif
			m_vehicles.Insert(vehicle);
		}
	}

    static void unregisterVehicle(EntityAI vehicle)
	{
		if (m_vehicles && vehicle)
		{
			#ifdef DZSM_DEBUG_CONTAINER
			Print("DZSM ~ UnRegistered: " + vehicle.GetType());
			#endif
			int i = m_vehicles.Find(vehicle);
			if (i >= 0)
			{
				m_vehicles.Remove(i);
			}
		}
		else if (!m_vehicles)
		{
			Print("DZSM ~ UnRegistered: Failed: vehicle container already gone");
		}
		else if (!vehicle)
		{
			Print("DZSM ~ UnRegistered: Failed: vehicle was null");
		}
    }

    static void GetVehicles(out array<EntityAI> vehicles)
	{
		vehicles = new array<EntityAI>;
		vehicles.InsertAll(m_vehicles);
	}
}