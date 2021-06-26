// #define DZSM_DEBUG_CONTAINER

class DayZServerManagerContainer
{
	private static ref array<EntityAI> m_vehicles = new array<EntityAI>;
	
    static void registerVehicle(EntityAI vehicle)
	{
		#ifdef DZSM_DEBUG_CONTAINER
		PrintToRPT("Registered: " + vehicle.GetType());
		#endif
		m_vehicles.Insert(vehicle);
	}

    static void unregisterVehicle(EntityAI vehicle)
	{
		#ifdef DZSM_DEBUG_CONTAINER
		PrintToRPT("UnRegistered: " + vehicle.GetType());
		#endif
		int i = m_vehicles.Find(vehicle);
		if (i >= 0)
		{
			m_vehicles.Remove(i);
		}
    }

    static void GetVehicles(out array<EntityAI> vehicles)
	{
		vehicles = new array<EntityAI>;
		vehicles.InsertAll(m_vehicles);
	}
}