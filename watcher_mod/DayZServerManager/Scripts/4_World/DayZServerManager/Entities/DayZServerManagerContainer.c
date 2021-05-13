class DayZServerManagerContainer
{
	private static ref array<EntityAI> m_vehicles = new array<EntityAI>;
	
    static void registerVehicle(EntityAI vehicle)
	{
		// PrintToRPT("Registered: " + vehicle.GetType());
		m_vehicles.Insert(vehicle);
	}

    static void unregisterVehicle(EntityAI vehicle)
	{
		// PrintToRPT("UnRegistered: " + vehicle.GetType());
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