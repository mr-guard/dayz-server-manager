modded class CarScript
{
	private static ref set<CarScript> m_managerAllVehicles = new set<CarScript>;

    void CarScript()
	{
		m_managerAllVehicles.Insert(this);
	}

    void ~CarScript()
	{
		int i = m_managerAllVehicles.Find(this);
		if (i >= 0)
		{
			m_managerAllVehicles.Remove(i);
		}
    }

    static set<CarScript> GetManagerAllVehicles()
	{
		return m_managerAllVehicles;
	}
}

#ifdef EXPANSIONMODVEHICLE
modded class ExpansionVehicleBase
#else
class ExpansionVehicleBase extends ItemBase
#endif
{
    private static ref set<ExpansionVehicleBase> m_managerAllVehicles = new set<ExpansionVehicleBase>;

    void ExpansionVehicleBase()
	{
		m_managerAllVehicles.Insert(this);
	}

    void ~ExpansionVehicleBase()
	{
		int i = m_managerAllVehicles.Find(this);
		if (i >= 0)
		{
			m_managerAllVehicles.Remove(i);
		}
    }

    static set<ExpansionVehicleBase> GetManagerAllVehicles()
	{
		return m_managerAllVehicles;
	}
}