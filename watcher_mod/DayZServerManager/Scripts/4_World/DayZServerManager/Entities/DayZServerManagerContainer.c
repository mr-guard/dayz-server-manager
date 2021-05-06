class DayZServerManagerContainer
{
	private static ref set<EntityAI> m_vehicles = new set<EntityAI>;
	
    static void registerVehicle(EntityAI vehicle)
	{
		m_vehicles.Insert(vehicles);
	}

    static void unregisterVehicle(EntityAI vehicle)
	{
		int i = m_vehicles.Find(vehicle);
		if (i >= 0)
		{
			m_vehicles.Remove(i);
		}
    }

    static set<EntityAI> GetVehicles()
	{
		return m_vehicles;
	}
}